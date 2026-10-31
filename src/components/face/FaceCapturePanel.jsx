import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadFaceEngine,
  detectFaceDescriptor,
  descriptorDistance,
  captureThumb,
  listCameras,
  startCamera,
  stopCamera,
  describeCameraError,
  scaleBox,
  readCameraPermission,
  watchCameraPermission,
  isInAppBrowser,
  isStandaloneApp,
} from '../../utils/faceEngine'

const CAMERA_KEY = 'sms.faceCameraId'

const readSavedCamera = () => {
  try {
    return window.localStorage.getItem(CAMERA_KEY) || ''
  } catch {
    return ''
  }
}

const saveCamera = (deviceId) => {
  try {
    if (deviceId) window.localStorage.setItem(CAMERA_KEY, deviceId)
    else window.localStorage.removeItem(CAMERA_KEY)
  } catch {
    /* storage blocked — choice lasts for this visit */
  }
}

const SAMPLE_COUNT = 3
const SAMPLE_MIN_GAP_MS = 900
const MIN_SCORE = 0.55
/* Quality gates: the face must fill enough of the frame, and the three frames
   must look like a live capture (slight natural variation, same subject). */
const MIN_BOX_RATIO = 0.22
const MIN_INTER_FRAME = 0.008
const MAX_INTER_FRAME = 0.6

const DEFAULT_HINTS = {
  verify:
    'Look straight at the camera. 3 clear frames are captured on-device and matched strictly against your enrolled face — no photo ever leaves this device.',
  enroll:
    'Look straight at the camera. 3 clear samples are saved as your face profile on the school server — the raw photo never leaves this device.',
}

const FaceCapturePanel = ({ mode = 'verify', hint, error = '', onSubmit }) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const samplesRef = useRef([])
  const lastSampleAtRef = useRef(0)
  const submitRef = useRef(false)
  const aliveRef = useRef(true)
  const switchSeqRef = useRef(0)
  const cameraIdRef = useRef('')
  const permissionRef = useRef('unknown')
  const autoStartRef = useRef(false)

  const [engineState, setEngineState] = useState('loading')
  const [engineNote, setEngineNote] = useState('')
  const [phase, setPhase] = useState('idle')
  const [camError, setCamError] = useState('')
  const [box, setBox] = useState(null)
  const [count, setCount] = useState(0)
  const [softNote, setSoftNote] = useState('')
  const [cameras, setCameras] = useState([])
  const [cameraId, setCameraId] = useState(readSavedCamera)
  const [permission, setPermission] = useState('unknown')
  const [blocked, setBlocked] = useState(false)
  const [copied, setCopied] = useState(false)

  const inApp = useMemo(() => isInAppBrowser(), [])
  const installedApp = useMemo(() => isStandaloneApp(), [])
  const blockedView = blocked || permission === 'denied'

  const permissionSteps = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const back = installedApp ? 'Come back to this app and tap “Try again”.' : 'Come back to this tab and tap “Try again”.'
    if (/Android/i.test(ua)) {
      return {
        title: 'Android — Chrome or the installed app',
        items: [
          'In Chrome: tap the lock (or tune) icon left of the address → Permissions → Camera → Allow.',
          'In the installed app: Android Settings → Apps → SMS → Permissions → Camera → Allow.',
          back,
        ],
      }
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return {
        title: 'iPhone / iPad — Safari or the Home Screen app',
        items: [
          'In Safari: tap “aA” in the address bar → Website Settings → Camera → Allow.',
          'For the Home Screen app: iOS Settings → scroll down to the school app → Camera → Allow.',
          back,
        ],
      }
    }
    return {
      title: 'Computer — Chrome, Edge, Firefox or Safari',
      items: [
        'Click the lock icon next to the address → Site settings → Camera → Allow.',
        'Reload this page.',
        'The camera starts by itself as soon as it is allowed.',
      ],
    }
  }, [installedApp])

  useEffect(() => {
    cameraIdRef.current = cameraId
  }, [cameraId])

  const refreshCameras = useCallback(async () => {
    try {
      const list = await listCameras()
      if (!aliveRef.current) return
      setCameras(list)
      // Forget a saved camera that is no longer connected (Phone Link off, USB unplugged).
      if (cameraIdRef.current && list.length && !list.some((cam) => cam.deviceId === cameraIdRef.current)) {
        cameraIdRef.current = ''
        saveCamera('')
        setCameraId('')
      }
    } catch {
      /* enumerateDevices can fail before permission — keep the old list */
    }
  }, [])

  const pickCamera = useCallback((deviceId) => {
    cameraIdRef.current = deviceId
    saveCamera(deviceId)
    setCameraId(deviceId)
  }, [])

  useEffect(() => {
    // Deferred so the first device scan does not cascade a render mid-effect.
    const timer = window.setTimeout(() => refreshCameras(), 0)
    const media = navigator.mediaDevices
    const onDeviceChange = () => refreshCameras()
    media?.addEventListener?.('devicechange', onDeviceChange)
    return () => {
      window.clearTimeout(timer)
      media?.removeEventListener?.('devicechange', onDeviceChange)
    }
  }, [refreshCameras])

  // A blocked camera never prompts again by itself — track the permission and
  // show the exact way to allow it once.
  useEffect(() => {
    let active = true
    const stop = watchCameraPermission((state) => {
      if (!active) return
      const prev = permissionRef.current
      permissionRef.current = state
      setPermission(state)
      if (state === 'granted') {
        setBlocked(false)
        setCamError('')
        if (prev === 'denied' || prev === 'prompt') autoStartRef.current = true
      } else if (state === 'denied') {
        setBlocked(true)
      }
    })
    return () => {
      active = false
      stop()
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    let active = true
    loadFaceEngine((note) => {
      if (active) setEngineNote(note)
    })
      .then(() => {
        if (active) setEngineState('ready')
      })
      .catch((err) => {
        if (active) {
          setEngineState('error')
          setCamError(err?.message || 'Face engine could not load.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      aliveRef.current = false
      stopCamera(streamRef.current, videoRef.current)
      streamRef.current = null
    },
    [],
  )

  const handleStartError = useCallback((err) => {
    setCamError(describeCameraError(err))
    if (err?.name === 'NotAllowedError') {
      permissionRef.current = 'denied'
      setPermission('denied')
      setBlocked(true)
    }
    setPhase('idle')
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current || engineState !== 'ready') return
    setCamError('')
    setPhase('starting')
    try {
      let stream
      try {
        stream = await startCamera(videoRef.current, { deviceId: cameraIdRef.current })
      } catch (err) {
        if (!cameraIdRef.current) throw err
        // Saved camera is gone — fall back to the default one instead of failing.
        cameraIdRef.current = ''
        saveCamera('')
        setCameraId('')
        stream = await startCamera(videoRef.current)
      }
      if (!aliveRef.current) {
        stopCamera(stream, videoRef.current)
        return
      }
      streamRef.current = stream
      setBlocked(false)
      setPhase('scanning')
      refreshCameras()
    } catch (err) {
      handleStartError(err)
    }
  }, [engineState, handleStartError, refreshCameras])

  // Switch between the laptop camera and the Phone Link camera while live.
  const switchCamera = useCallback(
    async (deviceId) => {
      pickCamera(deviceId)
      if (!streamRef.current) return
      const seq = switchSeqRef.current + 1
      switchSeqRef.current = seq
      submitRef.current = false
      samplesRef.current = []
      setCount(0)
      setBox(null)
      setSoftNote('')
      setCamError('')
      stopCamera(streamRef.current, videoRef.current)
      streamRef.current = null
      setPhase('starting')
      try {
        const stream = await startCamera(videoRef.current, { deviceId })
        if (seq !== switchSeqRef.current || !aliveRef.current) {
          stopCamera(stream, videoRef.current)
          return
        }
        streamRef.current = stream
        setPhase('scanning')
        refreshCameras()
      } catch (err) {
        if (seq !== switchSeqRef.current) return
        handleStartError(err)
      }
    },
    [handleStartError, pickCamera, refreshCameras],
  )

  // The camera started working again (site settings changed) — open it right away.
  useEffect(() => {
    if (!autoStartRef.current || engineState !== 'ready' || phase !== 'idle' || blockedView) return
    autoStartRef.current = false
    start()
  }, [blockedView, engineState, phase, start])

  const retryPermission = useCallback(async () => {
    setCamError('')
    setSoftNote('')
    if (engineState !== 'ready') {
      setSoftNote('The face engine is still loading — try again in a moment.')
      return
    }
    const state = await readCameraPermission()
    permissionRef.current = state
    setPermission(state)
    if (state === 'denied') {
      setBlocked(true)
      setSoftNote('Still blocked. The saved “Block” choice stays until you allow the camera in settings.')
      return
    }
    setBlocked(false)
    start()
  }, [engineState, start])

  const copyPageLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 3500)
    } catch {
      setCamError('Copy the link from the address bar and open it in Chrome or Safari.')
    }
  }, [])

  // Capture 3 spaced frames, then hand them to the parent.
  useEffect(() => {
    if (phase !== 'scanning' || engineState !== 'ready') return undefined
    let cancelled = false
    const timer = window.setInterval(async () => {
      if (cancelled || submitRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      try {
        const hit = await detectFaceDescriptor(video)
        if (cancelled) return
        setBox(hit ? scaleBox(hit, video) : null)
        if (!hit || hit.score < MIN_SCORE) return
        const boxRatio = hit.box.height / (hit.videoHeight || 1)
        if (boxRatio < MIN_BOX_RATIO) {
          setSoftNote('Come closer — your face should fill more of the frame.')
          return
        }
        if (Date.now() - lastSampleAtRef.current < SAMPLE_MIN_GAP_MS) return
        lastSampleAtRef.current = Date.now()
        const next = [...samplesRef.current, hit.descriptor]
        samplesRef.current = next
        setCount(next.length)
        setSoftNote('')
        if (next.length >= SAMPLE_COUNT) {
          // Live-capture pre-check before anything is sent to the server.
          let minPair = Infinity
          let maxPair = 0
          for (let i = 0; i < next.length; i += 1) {
            for (let j = i + 1; j < next.length; j += 1) {
              const distance = descriptorDistance(next[i], next[j])
              if (distance < minPair) minPair = distance
              if (distance > maxPair) maxPair = distance
            }
          }
          if (maxPair > MAX_INTER_FRAME) {
            samplesRef.current = []
            setCount(0)
            setSoftNote('Frames look inconsistent — stay steady, alone in the frame, and keep looking at the camera.')
            return
          }
          // Static only when EVERY pair is near-identical (frozen/replayed
          // frames). One close pair among live frames is normal.
          if (maxPair < MIN_INTER_FRAME) {
            samplesRef.current = []
            setCount(0)
            setSoftNote(
              minPair === 0
                ? 'Camera frames look frozen — move slightly and look at the camera. If it repeats, choose another camera from the dropdown above.'
                : 'Capture looks static — move naturally (blink, smile slightly) while it re-captures.',
            )
            return
          }
          submitRef.current = true
          setPhase('submitting')
          const payload = { descriptors: samplesRef.current }
          if (mode === 'enroll') payload.photoThumb = captureThumb(video)
          let failed = false
          try {
            await onSubmit(payload)
          } catch {
            failed = true
          }
          if (cancelled || !aliveRef.current) return
          submitRef.current = false
          samplesRef.current = []
          setCount(0)
          lastSampleAtRef.current = 0
          /* Stop auto-retrying after a failed save — the parent shows the
             reason and the user chooses when to try again. */
          setPhase(failed && streamRef.current ? 'paused' : streamRef.current ? 'scanning' : 'idle')
        }
      } catch {
        /* keep scanning */
      }
    }, 800)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [phase, engineState, mode, onSubmit])

  const overlay = (() => {
    if (engineState === 'loading') return engineNote || 'Loading on-device face engine…'
    if (engineState === 'error') return camError || 'Face engine could not load.'
    if (phase === 'idle') return null
    if (phase === 'starting') return 'Starting camera…'
    if (phase === 'submitting') return mode === 'enroll' ? 'Saving your face profile…' : 'Matching your face…'
    if (phase === 'paused') return 'Face was not saved — check the message below, then tap Try again.'
    return null
  })()

  const retrySubmit = () => {
    setCamError('')
    setSoftNote('')
    samplesRef.current = []
    setCount(0)
    lastSampleAtRef.current = 0
    submitRef.current = false
    setPhase(streamRef.current ? 'scanning' : 'idle')
  }

  return (
    <div className="af-panel">
      <div className={`af-stage${phase === 'scanning' ? ' is-live' : ''}`}>
        <video ref={videoRef} className="af-video" playsInline muted autoPlay />
        {box ? (
          <span
            className="af-box"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          />
        ) : null}
        {blockedView ? (
          <div className="af-overlay">
            <span className="af-overlay-note">
              Camera is blocked for this site. Allow it once below — it opens by itself after that.
            </span>
          </div>
        ) : overlay || (phase === 'idle' && engineState === 'ready') ? (
          <div className="af-overlay">
            <span className="af-overlay-note">{overlay}</span>
            {engineState === 'ready' && phase === 'idle' ? (
              <button type="button" className="af-start" onClick={start}>
                Start camera
              </button>
            ) : null}
            {engineState === 'ready' && phase === 'paused' ? (
              <button type="button" className="af-start" onClick={retrySubmit}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {blockedView ? (
        <div className="af-permission" role="alert">
          <div className="af-permission-head">
            <span className="af-permission-badge" aria-hidden="true">!</span>
            <div>
              <strong>Camera permission is blocked — that is why no popup appeared</strong>
              <p>
                Once “Block” is chosen, the browser stops asking for this site. Allow it one time
                with the steps below; reinstalling the app is not needed.
              </p>
            </div>
          </div>

          {inApp ? (
            <div className="af-permission-block">
              <span className="af-permission-label">You are inside another app’s browser</span>
              <p>
                Instagram, Facebook and WhatsApp browsers do not pass camera permission to
                websites. Open this same page in Chrome or Safari.
              </p>
              <button type="button" className="af-permission-copy" onClick={copyPageLink}>
                {copied ? 'Link copied — paste it in Chrome or Safari' : 'Copy this page link'}
              </button>
            </div>
          ) : (
            <div className="af-permission-block">
              <span className="af-permission-label">{permissionSteps.title}</span>
              <ol>
                {permissionSteps.items.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="af-permission-actions">
            <button type="button" className="af-permission-primary" onClick={retryPermission}>
              Try again
            </button>
            <button
              type="button"
              className="af-permission-ghost"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      ) : null}

      {cameras.length > 1 ? (
        <label className="af-camera">
          <span>Camera</span>
          <select
            value={cameraId}
            onChange={(event) => switchCamera(event.target.value)}
            disabled={phase === 'starting' || phase === 'submitting'}
            aria-label="Choose which camera to use for face capture"
          >
            <option value="">Auto (default front camera)</option>
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="af-progress" aria-hidden="true">
        {Array.from({ length: SAMPLE_COUNT }, (_, i) => (
          <span key={i} className={count > i ? 'is-on' : ''} />
        ))}
        <em>{phase === 'submitting' ? 'Checking…' : count ? `${count}/${SAMPLE_COUNT} frames` : '3 frames'}</em>
      </div>

      <p className="af-hint">{hint || DEFAULT_HINTS[mode]}</p>
      {softNote && (phase === 'scanning' || blockedView) ? (
        <p className="af-hint af-hint--soft">{softNote}</p>
      ) : null}
      {phase === 'scanning' && !box && !softNote ? (
        <p className="af-hint af-hint--soft">No face in frame — come closer and face the light.</p>
      ) : null}
      {camError && engineState === 'ready' && !blockedView ? (
        <div className="auth-error">{camError}</div>
      ) : null}
      {error ? <div className="auth-error">{error}</div> : null}
    </div>
  )
}

export default FaceCapturePanel
