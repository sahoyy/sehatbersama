import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill, Clock, Plus, Check, Bell, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Medications.css';

function Medications() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      // Log parsing errors to help debugging if localStorage contains malformed JSON
      console.error('Failed to parse user from localStorage:', error);
      return null;
    }
  });
  const [reminders, setReminders] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state for new reminder
  const [newReminder, setNewReminder] = useState({
    medication_id: '',
    schedule_time: '08:00',
    frequency: 'daily',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [navigate, user]);

  async function fetchReminders() {
    setLoading(true);
    const { data } = await supabase
      .from('medication_reminders')
      .select(`
        *,
        medications (id, name, dosage, frequency, instructions)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('schedule_time');

    if (data) setReminders(data);
    setLoading(false);
  }

  async function fetchMedications() {
    const { data } = await supabase
      .from('medications')
      .select('id, name, dosage')
      .limit(50);

    if (data) setMedications(data);
  }

  const fetchTodayLogs = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', today);

    if (data) setTodayLogs(data);
  };

  useEffect(() => {
    if (user) {
      // Schedule fetches after the current render to avoid calling setState synchronously inside an effect
      Promise.resolve().then(() => {
        fetchReminders();
        fetchMedications();
        fetchTodayLogs();
      });
    }
  }, [user]);

  const addReminder = async () => {
    if (!newReminder.medication_id) return;

    const { error } = await supabase
      .from('medication_reminders')
      .insert({
        user_id: user.id,
        medication_id: newReminder.medication_id,
        schedule_time: newReminder.schedule_time,
        frequency: newReminder.frequency,
        start_date: newReminder.start_date,
        end_date: newReminder.end_date || null,
        is_active: true
      });

    if (!error) {
      fetchReminders();
      setShowAddModal(false);
      setNewReminder({
        medication_id: '',
        schedule_time: '08:00',
        frequency: 'daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      });
    }
  };

  const markAsTaken = async (reminder) => {
    const { error } = await supabase
      .from('medication_logs')
      .insert({
        reminder_id: reminder.id,
        user_id: user.id,
        scheduled_time: new Date().toISOString(),
        taken_time: new Date().toISOString(),
        status: 'taken',
        verified_by_face: false
      });

    if (!error) {
      fetchTodayLogs();
    }
  };

  const deleteReminder = async (id) => {
    await supabase
      .from('medication_reminders')
      .update({ is_active: false })
      .eq('id', id);

    fetchReminders();
  };

  const isReminderTakenToday = (reminderId) => {
    return todayLogs.some(log => log.reminder_id === reminderId && log.status === 'taken');
  };

  const getTimeStatus = (scheduleTime) => {
    const now = new Date();
    const [hours, minutes] = scheduleTime.split(':');
    const scheduleDate = new Date();
    scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0);

    if (now > scheduleDate) {
      const diffMs = now - scheduleDate;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs > 0) return { status: 'late', text: `${diffHrs} jam lalu` };
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return { status: 'late', text: `${diffMins} menit lalu` };
    } else {
      const diffMs = scheduleDate - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs > 0) return { status: 'upcoming', text: `dalam ${diffHrs} jam` };
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return { status: 'soon', text: `dalam ${diffMins} menit` };
    }
  };

  return (
    <div className="medications-page">
      <div className="bg-blur">
        <div className="bg-blur-circle blue"></div>
        <div className="bg-blur-circle purple"></div>
      </div>

      {/* Header */}
      <header className="medications-header">
        <Link to="/dashboard" className="back-btn">
          <ArrowLeft size={20} />
          Kembali
        </Link>
        <h1>
          <Pill size={24} />
          Pengingat Obat
        </h1>
      </header>

      <main className="medications-main">
        {/* Today Summary */}
        <div className="today-summary">
          <div className="summary-card">
            <div className="summary-icon">
              <Calendar size={24} />
            </div>
            <div className="summary-info">
              <h3>Hari Ini</h3>
              <p>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="summary-stats">
              <span className="taken">{todayLogs.filter(l => l.status === 'taken').length}</span>
              <span>/</span>
              <span>{reminders.length}</span>
            </div>
          </div>
        </div>

        {/* Reminders List */}
        <div className="reminders-section">
          <div className="section-header">
            <h2>Jadwal Obat</h2>
            <button className="btn-add" onClick={() => setShowAddModal(true)}>
              <Plus size={20} />
              Tambah
            </button>
          </div>

          {loading ? (
            <div className="loading">Memuat jadwal...</div>
          ) : reminders.length === 0 ? (
            <div className="empty-state">
              <Pill size={48} />
              <p>Belum ada jadwal obat</p>
              <button className="btn-add-first" onClick={() => setShowAddModal(true)}>
                <Plus size={20} />
                Tambah Jadwal Pertama
              </button>
            </div>
          ) : (
            <div className="reminders-list">
              {reminders.map((reminder) => {
                const isTaken = isReminderTakenToday(reminder.id);
                const timeStatus = getTimeStatus(reminder.schedule_time);

                return (
                  <div key={reminder.id} className={`reminder-card ${isTaken ? 'taken' : ''}`}>
                    <div className="reminder-time">
                      <Clock size={20} />
                      <span>{reminder.schedule_time}</span>
                      {!isTaken && (
                        <span className={`time-status ${timeStatus.status}`}>
                          {timeStatus.text}
                        </span>
                      )}
                    </div>

                    <div className="reminder-info">
                      <h3>{reminder.medications?.name}</h3>
                      <p>{reminder.medications?.dosage} • {reminder.medications?.frequency}</p>
                      {reminder.medications?.instructions && (
                        <p className="instruction">{reminder.medications?.instructions}</p>
                      )}
                    </div>

                    <div className="reminder-actions">
                      {isTaken ? (
                        <div className="taken-badge">
                          <Check size={18} />
                          Sudah diminum
                        </div>
                      ) : (
                        <button 
                          className="btn-take"
                          onClick={() => markAsTaken(reminder)}
                        >
                          <Check size={18} />
                          Sudah Minum
                        </button>
                      )}
                      <button 
                        className="btn-delete"
                        onClick={() => deleteReminder(reminder.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Jadwal Obat</h2>

            <div className="form-group">
              <label>Pilih Obat</label>
              <select
                value={newReminder.medication_id}
                onChange={(e) => setNewReminder({ ...newReminder, medication_id: e.target.value })}
              >
                <option value="">-- Pilih Obat --</option>
                {medications.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.name} {med.dosage && `(${med.dosage})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Jam Minum</label>
              <input
                type="time"
                value={newReminder.schedule_time}
                onChange={(e) => setNewReminder({ ...newReminder, schedule_time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Frekuensi</label>
              <select
                value={newReminder.frequency}
                onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value })}
              >
                <option value="daily">Setiap Hari</option>
                <option value="weekly">Setiap Minggu</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tanggal Mulai</label>
              <input
                type="date"
                value={newReminder.start_date}
                onChange={(e) => setNewReminder({ ...newReminder, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Tanggal Selesai (Opsional)</label>
              <input
                type="date"
                value={newReminder.end_date}
                onChange={(e) => setNewReminder({ ...newReminder, end_date: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                Batal
              </button>
              <button className="btn-save" onClick={addReminder}>
                <Bell size={18} />
                Simpan Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Medications;