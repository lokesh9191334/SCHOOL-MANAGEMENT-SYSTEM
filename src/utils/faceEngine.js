/* Browser face engine: lazy-loads @vladmandic/face-api (dynamic import keeps
   the tensorflow bundle out of the main chunk) and loads local models from
   /models. Everything runs on-device — no face data leaves the phone except
   the 128-number descriptor sent to our own API for matching. */

let enginePromise = null

export function loadFaceEngine(onProgress) {
  if (!enginePromise) {
    enginePromise = (async () => {
      onProgress?.('Loading face engine…')
      const faceapi = await import('@vladmandic/face-api')
      const tf = faceapi.tf
      if (tf) {
        onProgress?.('Preparing compute backend…')
        // WebGL is fastest; CPU is the universal fallback (the bundled wasm
        // backend has no reachable binary path, so skip it).
        let ready
        try {
          ready = await tf.setBackend('webgl')
        } catch {
          ready = false
        }
        if (!ready) {
          try {
            await tf.setBackend('cpu')
          } catch {
            /* keep whatever backend tfjs picked */
          }
        }
        await tf.ready()
      }
      onProgress?.('Loading face models…')
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ])
      onProgress?.('Face engine ready')
      return faceapi
    })().catch((err) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

const DETECTOR_OPTIONS = { inputSize: 320, scoreThreshold: 0.5 }

/** Euclidean distance between two 128-number face descriptors. */
export function descriptorDistance(a, b) {
  let sum = 0
  for (let i = 0; i < a.length && i < b.length; i += 1) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/** Detect the single best face in a <video> element and return its descriptor. */
export async function detectFaceDescriptor(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null
  const faceapi = await loadFaceEngine()
  const result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions(DETECTOR_OPTIONS))
    .withFaceLandmarks()
    .withFaceDescriptor()
  if (!result) return null
  const { box } = result.detection
  return {
    descriptor: Array.from(result.descriptor),
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    videoWidth: videoEl.videoWidth,
    videoHeight: videoEl.videoHeight,
    score: result.detection.score,
  }
}

/** Small JPEG snapshot of the current video frame for the enrollment thumbnail. */
export function captureThumb(videoEl, maxSize = 240) {
  if (!videoEl || !videoEl.videoWidth) return null
  const scale = Math.min(1, maxSize / Math.max(videoEl.videoWidth, videoEl.videoHeight))
  const width = Math.max(1, Math.round(videoEl.videoWidth * scale))
  const height = Math.max(1, Math.round(videoEl.videoHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoEl, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.72)
}

/** Detection box mapped to the on-screen mirrored preview coordinates. */
export function scaleBox(hit, videoEl) {
  const rect = videoEl.getBoundingClientRect()
  const vw = hit.videoWidth || videoEl.videoWidth
  const vh = hit.videoHeight || videoEl.videoHeight
  if (!vw || !vh || !rect.width) return null
  const scale = Math.max(rect.width / vw, rect.height / vh)
  const dispW = vw * scale
  const dispH = vh * scale
  const offX = (rect.width - dispW) / 2
  const offY = (rect.height - dispH) / 2
  const bx = hit.box.x * scale + offX
  const by = hit.box.y * scale + offY
  const bw = hit.box.width * scale
  const bh = hit.box.height * scale
  // front camera preview is mirrored
  return { left: rect.width - bx - bw, top: by, width: bw, height: bh }
}

export function cameraSupportError() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return window.isSecureContext
      ? 'This browser does not support camera access.'
      : 'Camera needs HTTPS. Open this app through its secure link (Vercel) or http://localhost — plain LAN http is blocked by the browser.'
  }
  return null
}

export function describeCameraError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access in the browser settings and try again.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No usable camera was found on this device.'
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'The camera is busy in another app. Close it and try again.'
  }
  return err?.message || 'Camera could not be started.'
}

/** Video inputs on this device (laptop webcam, Phone Link camera, USB cam…). */
export async function listCameras() {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    // Before camera permission Chrome lists placeholder entries with no id/label.
    .filter((device) => device.kind === 'videoinput' && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: (device.label || '').trim() || `Camera ${index + 1}`,
    }))
}

export async function startCamera(videoEl, { facingMode = 'user', deviceId = '' } = {}) {
  const supportIssue = cameraSupportError()
  if (supportIssue) throw new Error(supportIssue)
  const constraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 720 }, height: { ideal: 540 } }
    : { facingMode, width: { ideal: 720 }, height: { ideal: 540 } }
  const stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false })
  videoEl.srcObject = stream
  await videoEl.play().catch(() => {})
  return stream
}

export function stopCamera(stream, videoEl) {
  try {
    stream?.getTracks?.().forEach((track) => track.stop())
  } catch {
    /* ignore */
  }
  if (videoEl) videoEl.srcObject = null
}

export function describeDevice() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser'
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  return `${os} ${browser}`.trim().slice(0, 120)
}
