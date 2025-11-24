import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Stethoscope, Pill, UserCircle, LogOut, Clock, Calendar, ChevronRight, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [recentDiagnoses, setRecentDiagnoses] = useState([]);
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    else if (hour < 18) return 'Selamat Siang';
    else return 'Selamat Malam';
  });

async function fetchRecentDiagnoses(userId) {
  const { data } = await supabase
    .from('diagnoses')
    .select(`
      id,
      created_at,
      confidence_score,
      diseases (name, name_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (data) {
    setRecentDiagnoses(data);
  }
}

useEffect(() => {
  // If user is not found in localStorage, redirect to login
  if (!user) {
    navigate('/login');
    return;
  }
  // fetch recent diagnoses for the logged-in user asynchronously to avoid
  // calling setState synchronously within the effect
  const load = async () => {
    try {
      await fetchRecentDiagnoses(user.id);
    } catch (err) {
      console.error('Error fetching recent diagnoses:', err);
    }
  };
  load();
}, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const menuItems = [
    {
      icon: <Stethoscope size={32} />,
      title: 'Cek Kesehatan',
      desc: 'Diagnosa gejala dengan AI',
      color: 'blue',
      path: '/diagnosis'
    },
    {
      icon: <UserCircle size={32} />,
      title: 'Dokter',
      desc: 'Rekomendasi dokter spesialis',
      color: 'purple',
      path: '/doctors'
    },
    {
      icon: <Pill size={32} />,
      title: 'Obat Saya',
      desc: 'Jadwal & pengingat obat',
      color: 'orange',
      path: '/medications'
    },
    {
      icon: <Clock size={32} />,
      title: 'Riwayat',
      desc: 'History diagnosa & konsultasi',
      color: 'rose',
      path: '/history'
    }
  ];

  if (!user) return null;

  return (
    <div className="dashboard-page">
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
      </div>

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <Activity size={24} color="white" />
            </div>
            <span>SehatBersama</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            Keluar
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-text">
              <p className="greeting">{greeting},</p>
              <h1>{user.full_name} 👋</h1>
              <p className="subtitle">Bagaimana keadaan Anda hari ini?</p>
            </div>
            <div className="welcome-image">
              {user.profile_image_url ? (
                <img src={user.profile_image_url} alt={user.full_name} />
              ) : (
                <UserCircle size={80} />
              )}
            </div>
          </div>
        </section>

        {/* Quick Action - Cek Kesehatan */}
        <section className="quick-action">
          <Link to="/diagnosis" className="quick-action-card">
            <div className="quick-action-icon">
              <Heart size={40} />
            </div>
            <div className="quick-action-text">
              <h2>Ada yang tidak enak badan?</h2>
              <p>Ceritakan gejala Anda, AI kami siap membantu</p>
            </div>
            <ChevronRight size={24} />
          </Link>
        </section>

        {/* Menu Grid */}
        <section className="menu-section">
          <h2 className="section-title">Menu Utama</h2>
          <div className="menu-grid">
            {menuItems.map((item, i) => (
              <Link to={item.path} key={i} className={`menu-card ${item.color}`}>
                <div className="menu-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Diagnoses */}
        {recentDiagnoses.length > 0 && (
          <section className="recent-section">
            <h2 className="section-title">Diagnosa Terakhir</h2>
            <div className="recent-list">
              {recentDiagnoses.map((diagnosis, i) => (
                <div key={i} className="recent-card">
                  <div className="recent-icon">
                    <Stethoscope size={24} />
                  </div>
                  <div className="recent-info">
                    <h4>{diagnosis.diseases?.name_id || diagnosis.diseases?.name || 'Diagnosa'}</h4>
                    <p>
                      <Calendar size={14} />
                      {new Date(diagnosis.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="recent-score">
                    {diagnosis.confidence_score?.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;