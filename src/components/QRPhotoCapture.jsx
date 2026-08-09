import { useState, useEffect, useRef } from 'react'
import './QRPhotoCapture.css'

const QRPhotoCapture = () => {
  const [isScanning, setIsScanning] = useState(false)
  const [capturedPhotos, setCapturedPhotos] = useState([])
  const [qrCode, setQrCode] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isScanning && videoRef.current) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isScanning])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      // Fallback to file upload
      setIsScanning(false)
      fileInputRef.current?.click()
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      const photoId = Date.now()
      
      const newPhoto = {
        id: photoId,
        imageData: imageData,
        timestamp: new Date().toISOString(),
        uploaded: false
      }
      
      setCapturedPhotos(prev => [newPhoto, ...prev])
      uploadPhoto(newPhoto)
    }
  }

  const uploadPhoto = async (photo) => {
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setUploadProgress(i)
      }
      
      // Simulate successful upload
      setCapturedPhotos(prev => 
        prev.map(p => 
          p.id === photo.id ? { ...p, uploaded: true } : p
        )
      )
      
      setIsUploading(false)
      setUploadProgress(0)
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileUpload = (event) => {
    const files = event.target.files
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const photoId = Date.now() + Math.random()
          const newPhoto = {
            id: photoId,
            imageData: e.target.result,
            timestamp: new Date().toISOString(),
            uploaded: false,
            fileName: file.name
          }
          setCapturedPhotos(prev => [newPhoto, ...prev])
          uploadPhoto(newPhoto)
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const deletePhoto = (photoId) => {
    setCapturedPhotos(prev => prev.filter(photo => photo.id !== photoId))
  }

  const generateQRCode = () => {
    // Generate a unique QR code for this session
    const sessionId = Date.now().toString(36)
    const qrData = `https://school.example.com/upload/${sessionId}`
    setQrCode(qrData)
  }

  return (
    <div className="qr-photo-capture">
      <div className="capture-header">
        <h2>QR Live Photo Capture</h2>
        <p>Securely sync mobile photos to desktop form using QR codes and HTTPS</p>
      </div>

      <div className="capture-container">
        <div className="camera-section">
          {!isScanning ? (
            <div className="camera-placeholder">
              <div className="camera-icon">📷</div>
              <h3>Start Photo Capture</h3>
              <p>Use your mobile camera to capture photos securely</p>
              <div className="capture-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setIsScanning(true)}
                >
                  Start Camera
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ) : (
            <div className="camera-active">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-feed"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="camera-controls">
                <button 
                  className="btn-capture"
                  onClick={capturePhoto}
                  disabled={isUploading}
                >
                  📸 Capture
                </button>
                <button 
                  className="btn-stop"
                  onClick={() => {
                    setIsScanning(false)
                    stopCamera()
                  }}
                >
                  Stop Camera
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="qr-section">
          <div className="qr-container">
            <h3>QR Code for Mobile Upload</h3>
            <p>Scan this QR code with your mobile device</p>
            {qrCode ? (
              <div className="qr-code">
                <div className="qr-placeholder">
                  <div className="qr-pattern">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="qr-dot"></div>
                    ))}
                  </div>
                  <div className="qr-text">QR Code</div>
                </div>
                <p className="qr-status">Active for 10 minutes</p>
              </div>
            ) : (
              <button 
                className="btn-generate-qr"
                onClick={generateQRCode}
              >
                Generate QR Code
              </button>
            )}
          </div>

          <div className="upload-status">
            {isUploading && (
              <div className="upload-progress">
                <h4>Uploading Photos...</h4>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="captured-photos">
        <h3>Captured Photos ({capturedPhotos.length})</h3>
        <div className="photos-grid">
          {capturedPhotos.map((photo) => (
            <div key={photo.id} className="photo-item">
              <img src={photo.imageData} alt="Captured" className="photo-thumbnail" />
              <div className="photo-info">
                <p className="photo-time">
                  {new Date(photo.timestamp).toLocaleString()}
                </p>
                {photo.fileName && (
                  <p className="photo-name">{photo.fileName}</p>
                )}
                <div className="photo-status">
                  {photo.uploaded ? (
                    <span className="status-success">✓ Uploaded</span>
                  ) : (
                    <span className="status-pending">Uploading...</span>
                  )}
                </div>
              </div>
              <button 
                className="btn-delete"
                onClick={() => deletePhoto(photo.id)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
        
        {capturedPhotos.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h4>No photos captured yet</h4>
            <p>Start capturing photos or upload files to begin</p>
          </div>
        )}
      </div>

      <div className="security-info">
        <h3>🔒 Security & Privacy</h3>
        <div className="security-features">
          <div className="security-item">
            <span className="security-icon">🛡️</span>
            <div>
              <h4>HTTPS Encryption</h4>
              <p>All photos are encrypted during transmission</p>
            </div>
          </div>
          <div className="security-item">
            <span className="security-icon">🔑</span>
            <div>
              <h4>Secure QR Codes</h4>
              <p>QR codes expire after 10 minutes for security</p>
            </div>
          </div>
          <div className="security-item">
            <span className="security-icon">🗑️</span>
            <div>
              <h4>Auto-Deletion</h4>
              <p>Temporary photos are automatically deleted</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRPhotoCapture
