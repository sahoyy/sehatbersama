import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Heart, Brain, Clock, UserCheck, Shield, Phone, ChevronRight, Menu, X, Star, Activity } from 'lucide-react';
import Register from './pages/Register';
import Login from './pages/login';
import Dashboard from './pages/Dashboard';
import Diagnosis from './pages/Diagnosis';
import Doctors from './pages/Doctors';
import Medications from './pages/Medications';
import './App.css';

// ==========================================
// LANDING PAGE COMPONENT
// ==========================================
function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: <Brain size={40} />, title: "AI Diagnosa Cerdas", desc: "Sistem pakar yang memahami gejala Anda dan memberikan saran kesehatan yang tepat", color: "blue" },
    { icon: <UserCheck size={40} />, title: "Login Wajah", desc: "Masuk dengan mudah tanpa perlu mengingat password - cukup tunjukkan wajah Anda", color: "purple" },
    { icon: <Clock size={40} />, title: "Pengingat Obat", desc: "Tidak pernah lupa minum obat lagi dengan alarm pintar dan konfirmasi mudah", color: "orange" },
    { icon: <Heart size={40} />, title: "Rekomendasi Dokter", desc: "Temukan dokter spesialis yang tepat berdasarkan kondisi kesehatan Anda", color: "rose" }
  ];

  const steps = [
    { num: "1", title: "Daftarkan Wajah", desc: "Foto wajah Anda untuk keamanan akun" },
    { num: "2", title: "Ceritakan Keluhan", desc: "Jawab pertanyaan sederhana tentang gejala" },
    { num: "3", title: "Terima Saran AI", desc: "Dapatkan diagnosa dan rekomendasi obat" },
    { num: "4", title: "Atur Pengingat", desc: "Sistem akan mengingatkan jadwal obat Anda" }
  ];

  const testimonials = [
    { name: "Kakek Budi, 67", text: "Sekarang saya tidak pernah lupa minum obat darah tinggi!", rating: 5 },
    { name: "Nenek Siti, 72", text: "Tombolnya besar-besar, mudah dilihat mata tua saya.", rating: 5 },
    { name: "Pak Harto, 65", text: "Login pakai wajah sangat praktis, tidak perlu ingat password.", rating: 5 }
  ];

  return (
    <div className="app">
      {/* Background Effects */}
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
        <div className="bg-blur-circle cyan"></div>
      </div>

      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content">
          <div className="logo">
            <div className="logo-icon">
              <Activity size={28} color="white" />
            </div>
            <div>
              <div className="logo-text gradient-text">SehatBersama</div>
              <div className="logo-subtext">AI Health Companion</div>
            </div>
          </div>

          <div className="nav-links">
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#testimoni">Testimoni</a>
            <button className="nav-btn" onClick={() => navigate('/login')}>Masuk</button>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Shield size={16} />
            <span>Aman & Terpercaya untuk Kesehatan Keluarga</span>
          </div>

          <h1>
            <span className="gradient-text-white">Teman Kesehatan</span>
            <br />
            <span className="gradient-text">Cerdas untuk Lansia</span>
          </h1>

          <p>
            Aplikasi kesehatan berbasis AI yang dirancang khusus untuk kemudahan orang tua.
            Dengan tombol besar, suara jelas, dan asisten cerdas yang selalu siap membantu.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Mulai Sekarang
              <ChevronRight size={20} />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/register')}>
              <Phone size={20} />
              Daftar Sekarang
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value gradient-text">10,000+</div>
              <div className="stat-label">Pengguna Aktif</div>
            </div>
            <div className="stat">
              <div className="stat-value gradient-text">50,000+</div>
              <div className="stat-label">Diagnosa Berhasil</div>
            </div>
            <div className="stat">
              <div className="stat-value gradient-text">99.2%</div>
              <div className="stat-label">Tingkat Akurasi</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="features">
        <div className="container">
          <div className="section-header">
            <h2>Fitur <span className="gradient-text">Unggulan</span></h2>
            <p>Dirancang dengan cinta untuk kemudahan orang tua tercinta</p>
          </div>

          <div className="features-grid">
            {features.map((feature, i) => (
              <div key={i} className="feature-card">
                <div className={`feature-icon ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="cara-kerja" className="steps">
        <div className="container">
          <div className="section-header">
            <h2>Cara <span className="gradient-text">Kerja</span></h2>
            <p>Hanya 4 langkah mudah</p>
          </div>

          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimoni" className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>Apa Kata <span className="gradient-text">Mereka</span></h2>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="stars">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} />
                  ))}
                </div>
                <p className="quote">"{t.text}"</p>
                <p className="author">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-box">
            <h2>Siap Menjaga Kesehatan?</h2>
            <p>Daftarkan diri Anda sekarang dan rasakan kemudahan memantau kesehatan dengan AI</p>
            <button className="btn-primary" onClick={() => navigate('/register')}>Daftar Gratis Sekarang</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              <Activity size={24} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18 }}>SehatBersama</span>
          </div>
          <p>© 2025 SehatBersama. Final Project AI - President University</p>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// MAIN APP WITH ROUTER
// ==========================================
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/diagnosis" element={<Diagnosis />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/medications" element={<Medications />} />
      </Routes>
    </Router>
  );
}

export default App;