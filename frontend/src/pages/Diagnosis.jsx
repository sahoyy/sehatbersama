import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, Check, Stethoscope, Pill, AlertTriangle, ChevronRight, Loader2, UserCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Diagnosis.css';

function Diagnosis() {
  const navigate = useNavigate();
  const user = (() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  })();
  const [step, setStep] = useState(1); // 1: select symptoms, 2: analyzing, 3: result
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null);
  const [recommendedMeds, setRecommendedMeds] = useState([]);
  const [recommendedDoctors, setRecommendedDoctors] = useState([]);
  const [, setLoading] = useState(false);

  // Common symptoms categories for elderly

const fetchSymptoms = async () => {
  try {
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching symptoms:', error);
      setSymptoms([]);
    } else {
      setSymptoms(data || []);
    }
  } catch (err) {
    console.error('Error fetching symptoms:', err);
    setSymptoms([]);
  }
};

useEffect(() => {
  // user is initialized from localStorage in the useState initializer;
  // here we only redirect to login if no user is present.
  if (!user) {
    navigate('/login');
  }
}, [navigate, user]);

useEffect(() => {
  // Defer fetching to the next microtask to avoid calling setState synchronously inside the effect
  Promise.resolve().then(() => {
    fetchSymptoms();
  });
}, []);

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.find(s => s.id === symptom.id)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== symptom.id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const filteredSymptoms = symptoms.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // EXPERT SYSTEM: Analyze symptoms and find matching disease
  const analyzeSymptoms = async () => {
    if (selectedSymptoms.length === 0) return;
    
    setStep(2);
    setLoading(true);
    try {
      // Get all disease-symptom relationships
      const { data: diseaseSymptoms } = await supabase
        .from('disease_symptoms')
        .select(`
          disease_id,
          symptom_id,
          weight,
          is_primary,
          diseases (id, name, name_id, description, severity, recommendation)
        `);

      // Calculate match score for each disease
      const diseaseScores = {};
      const selectedIds = selectedSymptoms.map(s => s.id);

      for (const ds of diseaseSymptoms || []) {
        if (selectedIds.includes(ds.symptom_id)) {
          if (!diseaseScores[ds.disease_id]) {
            diseaseScores[ds.disease_id] = {
              disease: ds.diseases,
              score: 0,
              matchedSymptoms: 0,
              totalSymptoms: 0
            };
          }
          diseaseScores[ds.disease_id].score += ds.weight * (ds.is_primary ? 1.5 : 1);
          diseaseScores[ds.disease_id].matchedSymptoms++;
        }
      }

      // Count total symptoms for each disease
      for (const ds of diseaseSymptoms || []) {
        if (diseaseScores[ds.disease_id]) {
          diseaseScores[ds.disease_id].totalSymptoms++;
        }
      }

      // Sort by score and get top result
      const sortedDiseases = Object.values(diseaseScores)
        .map(d => ({
          ...d,
          confidence: Math.min(95, (d.matchedSymptoms / Math.max(d.totalSymptoms, 1)) * 100 + d.score * 10)
        }))
        .sort((a, b) => b.confidence - a.confidence);

      if (sortedDiseases.length > 0) {
        const topResult = sortedDiseases[0];
        setResult(topResult);

        // Save diagnosis to database
        await supabase
          .from('diagnoses')
          .insert({
            user_id: user.id,
            symptoms_selected: selectedSymptoms.map(s => s.id),
            disease_id: topResult.disease.id,
            confidence_score: topResult.confidence,
            ai_recommendation: topResult.disease.recommendation
          })
          .select()
          .single();

        // Fetch recommended medications
        const { data: meds } = await supabase
          .from('disease_medications')
          .select(`
            medications (id, name, generic_name, dosage, frequency, instructions)
          `)
          .eq('disease_id', topResult.disease.id)
          .limit(3);

        if (meds) setRecommendedMeds(meds.map(m => m.medications));

        // Fetch recommended doctors based on disease
        const { data: doctors } = await supabase
          .from('doctors')
          .select('*')
          .limit(3);

        if (doctors) setRecommendedDoctors(doctors);
      }

      setStep(3);
    } catch (err) {
      console.error('Analysis error:', err);
    }

    setLoading(false);
  };
  const resetDiagnosis = () => {
    setSelectedSymptoms([]);
    setResult(null);
    setRecommendedMeds([]);
    setRecommendedDoctors([]);
    setStep(1);
  };

  return (
    <div className="diagnosis-page">
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
      </div>

      {/* Header */}
      <header className="diagnosis-header">
        <Link to="/dashboard" className="back-btn">
          <ArrowLeft size={20} />
          Kembali
        </Link>
        <h1>
          <Stethoscope size={24} />
          Cek Kesehatan AI
        </h1>
      </header>

      <main className="diagnosis-main">
        {/* Step 1: Select Symptoms */}
        {step === 1 && (
          <div className="symptoms-section">
            <div className="symptoms-header">
              <h2>Apa yang Anda rasakan?</h2>
              <p>Pilih gejala yang sedang dialami (bisa lebih dari satu)</p>
            </div>

            {/* Selected Symptoms */}
            {selectedSymptoms.length > 0 && (
              <div className="selected-symptoms">
                <h3>Gejala dipilih ({selectedSymptoms.length})</h3>
                <div className="selected-tags">
                  {selectedSymptoms.map(symptom => (
                    <button
                      key={symptom.id}
                      className="symptom-tag selected"
                      onClick={() => toggleSymptom(symptom)}
                    >
                      {symptom.name.replace(/_/g, ' ')}
                      <span className="remove">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Cari gejala... (contoh: fever, headache)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Symptoms Grid */}
            <div className="symptoms-grid">
              {filteredSymptoms.slice(0, 30).map(symptom => (
                <button
                  key={symptom.id}
                  className={`symptom-btn ${selectedSymptoms.find(s => s.id === symptom.id) ? 'selected' : ''}`}
                  onClick={() => toggleSymptom(symptom)}
                >
                  {selectedSymptoms.find(s => s.id === symptom.id) && <Check size={18} />}
                  {symptom.name.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Analyze Button */}
            <button
              className="btn-analyze"
              onClick={analyzeSymptoms}
              disabled={selectedSymptoms.length === 0}
            >
              <Stethoscope size={24} />
              Analisis Gejala ({selectedSymptoms.length} dipilih)
            </button>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 2 && (
          <div className="analyzing-section">
            <div className="analyzing-animation">
              <Loader2 size={60} className="spin" />
            </div>
            <h2>Menganalisis Gejala...</h2>
            <p>AI sedang mencocokkan gejala dengan database penyakit</p>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="result-section">
            {/* Diagnosis Result */}
            <div className="result-card">
              <div className="result-header">
                <div className="result-icon">
                  <Stethoscope size={32} />
                </div>
                <div className="result-title">
                  <h2>Hasil Analisis</h2>
                  <p>Berdasarkan {selectedSymptoms.length} gejala yang dipilih</p>
                </div>
                <div className="confidence-badge">
                  {result.confidence.toFixed(0)}%
                </div>
              </div>

              <div className="disease-info">
                <h3 className="disease-name">{result.disease.name}</h3>
                <p className="disease-desc">{result.disease.description}</p>
                
                <div className={`severity-badge ${result.disease.severity}`}>
                  <AlertTriangle size={16} />
                  Tingkat: {result.disease.severity === 'mild' ? 'Ringan' : 
                           result.disease.severity === 'moderate' ? 'Sedang' : 'Serius'}
                </div>
              </div>

              {result.disease.recommendation && (
                <div className="recommendation-box">
                  <h4>💡 Saran</h4>
                  <p>{result.disease.recommendation}</p>
                </div>
              )}
            </div>

            {/* Recommended Medications */}
            {recommendedMeds.length > 0 && (
              <div className="meds-section">
                <h3><Pill size={20} /> Rekomendasi Obat</h3>
                <div className="meds-list">
                  {recommendedMeds.map((med, i) => (
                    <div key={i} className="med-card">
                      <h4>{med.name}</h4>
                      <p className="generic">{med.generic_name}</p>
                      <p className="dosage">{med.dosage} • {med.frequency}</p>
                      <p className="instruction">{med.instructions}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Doctors */}
            {recommendedDoctors.length > 0 && (
              <div className="doctors-section">
                <h3><UserCircle size={20} /> Dokter Tersedia</h3>
                <div className="doctors-list">
                  {recommendedDoctors.map((doc, i) => (
                    <div key={i} className="doctor-card">
                      <div className="doctor-avatar">
                        <UserCircle size={40} />
                      </div>
                      <div className="doctor-info">
                        <h4>{doc.name}</h4>
                        <p>{doc.specialization}</p>
                        <p className="hospital">{doc.hospital}</p>
                      </div>
                      <div className="doctor-rating">⭐ {doc.rating}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="result-actions">
              <button className="btn-secondary" onClick={resetDiagnosis}>
                <RefreshCw size={20} />
                Cek Ulang
              </button>
              <Link to="/dashboard" className="btn-primary">
                Kembali ke Dashboard
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Diagnosis;