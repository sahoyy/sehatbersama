import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, User, Mail, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
        console.log('✅ Face models loaded');
      } catch (err) {
        console.error('❌ Error loading models:', err);
        setError('Gagal memuat model AI. Refresh halaman.');
      }
    };
    loadModels();
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Tidak dapat mengakses kamera:', err);
      setError('Tidak dapat mengakses kamera. Izinkan akses kamera.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
  };

  // Face detection loop
  useEffect(() => {
    if (cameraActive && modelsLoaded) {
      detectionInterval.current = setInterval(async () => {
        if (!videoRef.current) return;

        try {
          const detections = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detections) {
            setFaceDetected(true);
            if (canvasRef.current && videoRef.current) {
              const displaySize = {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              };
              faceapi.matchDimensions(canvasRef.current, displaySize);
              const resized = faceapi.resizeResults(detections, displaySize);
              const ctx = canvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, displaySize.width, displaySize.height);
              faceapi.draw.drawDetections(canvasRef.current, resized);
              faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
            }
          } else {
            setFaceDetected(false);
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        } catch (err) {
          console.log('Detection error:', err);
        }
      }, 300);

      return () => {
        if (detectionInterval.current) {
          clearInterval(detectionInterval.current);
        }
      };
    }
  }, [cameraActive, modelsLoaded]);

  // Capture face
  const captureFace = async () => {
    if (!videoRef.current || !faceDetected) return;

    setLoading(true);
    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');

        setCapturedImage(imageData);
        setFaceDescriptor(Array.from(detections.descriptor));
        stopCamera();
        setStep(3);
      }
    } catch (err) {
      console.error('Gagal menangkap wajah:', err);
      setError('Gagal menangkap wajah. Coba lagi.');
    }
    setLoading(false);
  };

  // Submit registration
  const handleSubmit = async () => {
    if (!fullName || !email || !faceDescriptor) {
      setError('Lengkapi semua data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        setError('Email sudah terdaftar');
        setLoading(false);
        return;
      }

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          full_name: fullName,
          email: email,
          profile_image_url: capturedImage
        })
        .select()
        .single();

      if (userError) throw userError;

      const { error: faceError } = await supabase
        .from('face_data')
        .insert({
          user_id: newUser.id,
          face_descriptor: faceDescriptor,
          image_url: capturedImage
        });

      if (faceError) throw faceError;

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError('Gagal mendaftar. Coba lagi.');
    }

    setLoading(false);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFaceDescriptor(null);
    setStep(2);
    startCamera();
  };

  return (
    <div className="register-page">
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
      </div>

      <div className="register-container">
        <Link to="/" className="back-btn">
          <ArrowLeft size={20} />
          Kembali
        </Link>

        <div className="register-card">
          <div className="register-header">
            <h1>Daftar Akun</h1>
            <p>Buat akun dengan verifikasi wajah</p>
          </div>

          <div className="progress-steps">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-circle">1</div>
              <span>Data Diri</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <span>Foto Wajah</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span>Konfirmasi</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <CheckCircle size={20} />
              Pendaftaran berhasil! Mengalihkan ke login...
            </div>
          )}

          {step === 1 && (
            <div className="form-step">
              <div className="input-group">
                <User size={20} className="input-icon" />
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <Mail size={20} className="input-icon" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  if (!fullName || !email) {
                    setError('Isi nama dan email');
                    return;
                  }
                  setError('');
                  setStep(2);
                  startCamera();
                }}
              >
                Lanjut ke Foto Wajah
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="camera-step">
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="camera-video"
                />
                <canvas ref={canvasRef} className="camera-canvas" />

                <div className={`face-status ${faceDetected ? 'detected' : ''}`}>
                  {faceDetected ? '✅ Wajah Terdeteksi' : '👀 Posisikan wajah di tengah'}
                </div>
              </div>

              {!modelsLoaded && (
                <div className="loading-models">
                  <Loader2 size={24} className="spin" />
                  Memuat AI...
                </div>
              )}

              <div className="camera-buttons">
                <button className="btn-secondary" onClick={() => { stopCamera(); setStep(1); }}>
                  Kembali
                </button>
                <button
                  className="btn-primary"
                  onClick={captureFace}
                  disabled={!faceDetected || loading}
                >
                  {loading ? <Loader2 size={20} className="spin" /> : <Camera size={20} />}
                  Ambil Foto
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="confirm-step">
              <div className="captured-preview">
                <img src={capturedImage} alt="Captured face" />
              </div>

              <div className="confirm-info">
                <p><strong>Nama:</strong> {fullName}</p>
                <p><strong>Email:</strong> {email}</p>
              </div>

              <div className="confirm-buttons">
                <button className="btn-secondary" onClick={retakePhoto}>
                  Foto Ulang
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={20} className="spin" /> : <CheckCircle size={20} />}
                  Daftar Sekarang
                </button>
              </div>
            </div>
          )}

          <div className="auth-link">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;