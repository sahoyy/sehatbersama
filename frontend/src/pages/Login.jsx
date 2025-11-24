import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Loader2, CheckCircle, AlertCircle, ArrowLeft, Scan } from 'lucide-react';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [allFaceData, setAllFaceData] = useState([]);

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

  // Fetch all registered faces from database
  useEffect(() => {
    const fetchFaceData = async () => {
      const { data, error } = await supabase
        .from('face_data')
        .select(`
          id,
          face_descriptor,
          user_id,
          users (
            id,
            full_name,
            email,
            profile_image_url
          )
        `);

      if (error) {
        console.error('Error fetching face data:', error);
      } else {
        setAllFaceData(data || []);
        console.log(`✅ Loaded ${data?.length || 0} registered faces`);
      }
    };
    fetchFaceData();
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
      console.error('Camera access error:', err);
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

  // Start camera on mount
  useEffect(() => {
    // Defer starting the camera to avoid calling setState synchronously inside the effect.
    const timer = setTimeout(() => {
      startCamera();
    }, 0);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

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

  // Match face with database
  const matchFace = async () => {
    if (!videoRef.current || !faceDetected || allFaceData.length === 0) {
      setError('Tidak ada wajah terdeteksi atau database kosong');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setError('Wajah tidak terdeteksi. Coba lagi.');
        setLoading(false);
        return;
      }

      const inputDescriptor = detections.descriptor;
      let bestMatch = null;
      let bestDistance = 1;

      // Compare with all registered faces
      for (const faceData of allFaceData) {
        const storedDescriptor = new Float32Array(faceData.face_descriptor);
        const distance = faceapi.euclideanDistance(inputDescriptor, storedDescriptor);
        
        console.log(`Distance to ${faceData.users?.full_name}: ${distance}`);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = faceData;
        }
      }

      // Threshold: 0.6 is typical for face recognition
      const THRESHOLD = 0.6;

      if (bestMatch && bestDistance < THRESHOLD) {
        setMatchedUser(bestMatch.users);
        setSuccess(true);
        stopCamera();
        
        // Save to localStorage for session
        localStorage.setItem('user', JSON.stringify(bestMatch.users));
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(`Wajah tidak dikenali. Pastikan Anda sudah terdaftar. (Score: ${(1-bestDistance).toFixed(2)})`);
      }

    } catch (err) {
      console.error('Match error:', err);
      setError('Gagal mencocokkan wajah. Coba lagi.');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
      </div>

      <div className="login-container">
        <Link to="/" className="back-btn">
          <ArrowLeft size={20} />
          Kembali
        </Link>

        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <Scan size={40} />
            </div>
            <h1>Masuk dengan Wajah</h1>
            <p>Arahkan wajah Anda ke kamera untuk login</p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && matchedUser && (
            <div className="success-message">
              <CheckCircle size={20} />
              <div>
                <strong>Selamat datang, {matchedUser.full_name}!</strong>
                <p>Mengalihkan ke dashboard...</p>
              </div>
            </div>
          )}

          {!success && (
            <>
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

                {/* Scanning overlay */}
                <div className="scan-overlay">
                  <div className="scan-line"></div>
                </div>
              </div>

              {!modelsLoaded && (
                <div className="loading-models">
                  <Loader2 size={24} className="spin" />
                  Memuat AI...
                </div>
              )}

              <button
                className="btn-primary btn-login"
                onClick={matchFace}
                disabled={!faceDetected || loading || !modelsLoaded}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="spin" />
                    Mencocokkan...
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    Verifikasi Wajah
                  </>
                )}
              </button>
            </>
          )}

          <div className="auth-link">
            Belum punya akun? <Link to="/register">Daftar di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;