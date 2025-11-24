import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Star, MapPin, Clock, Phone, Filter, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Doctors.css';

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('all');
  const [loading, setLoading] = useState(true);

  const filteredDoctors = useMemo(() => {
    let filtered = doctors;

    // Filter by specialization
    if (selectedSpec !== 'all') {
      filtered = filtered.filter(d => 
        d.specialization.toLowerCase() === selectedSpec.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [searchQuery, selectedSpec, doctors]);

  const specializations = [
    'All',
    'General Practitioner',
    'Cardiologist',
    'Dermatologist',
    'Neurologist',
    'Dentist',
    'ENT Specialist',
    'Pulmonologist',
    'Gastroenterologist'
  ];

  async function fetchDoctors() {
    setLoading(true);
    const { data, error } = await supabase
      .from('doctors')
      .select('*');

    if (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    } else if (data) {
      setDoctors(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    // schedule fetchDoctors on the next microtask to avoid calling setState synchronously within the effect
    Promise.resolve().then(() => fetchDoctors());
  }, []);

  return (
    <div className="doctors-page">
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
      </div>

      {/* Header */}
      <header className="doctors-header">
        <Link to="/dashboard" className="back-btn">
          <ArrowLeft size={20} />
          Kembali
        </Link>
        <h1>
          <UserCircle size={24} />
          Daftar Dokter
        </h1>
      </header>

      <main className="doctors-main">
        {/* Search & Filter */}
        <div className="filter-section">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Cari dokter atau rumah sakit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="spec-filter">
            <Filter size={18} />
            <select
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
            >
              {specializations.map((spec, i) => (
                <option key={i} value={spec.toLowerCase()}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="results-info">
          <p>Menampilkan <strong>{filteredDoctors.length}</strong> dokter</p>
        </div>

        {/* Doctors List */}
        {loading ? (
          <div className="loading">Memuat data dokter...</div>
        ) : (
          <div className="doctors-grid">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="doctor-card">
                <div className="doctor-header">
                  <div className="doctor-avatar">
                    <UserCircle size={60} />
                  </div>
                  <div className="doctor-rating">
                    <Star size={16} fill="#facc15" color="#facc15" />
                    {doctor.rating}
                  </div>
                </div>

                <div className="doctor-body">
                  <h3>{doctor.name}</h3>
                  <p className="specialization">{doctor.specialization}</p>
                  
                  <div className="doctor-info">
                    <p>
                      <MapPin size={14} />
                      {doctor.hospital}
                    </p>
                    <p>
                      <Clock size={14} />
                      {doctor.experience_years} tahun pengalaman
                    </p>
                  </div>

                  <div className="doctor-fee">
                    <span>Biaya Konsultasi</span>
                    <strong>Rp {doctor.consultation_fee?.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                <div className="doctor-actions">
                  <a href={`tel:${doctor.phone}`} className="btn-call">
                    <Phone size={18} />
                    Hubungi
                  </a>
                  <button className="btn-book">
                    Buat Janji
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDoctors.length === 0 && !loading && (
          <div className="no-results">
            <p>Tidak ada dokter yang ditemukan</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Doctors;