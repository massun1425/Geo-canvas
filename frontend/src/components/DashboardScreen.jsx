import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const DashboardScreen = ({ user, onSelectTrip, onLogout }) => {
  const [trips, setTrips] = useState([]);
  const [newTripTitle, setNewTripTitle] = useState('');

  // アカウントメニュー・退会モーダルの状態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const longPressRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (user) fetchTrips();
  }, [user]);

  const fetchTrips = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:8080/api/trips/?user_id=${user.id}`);
      setTrips(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!newTripTitle) return;
    try {
      await axios.post(`http://${window.location.hostname}:8080/api/trips/`, {
        user_id: user.id,
        title: newTripTitle
      });
      setNewTripTitle('');
      fetchTrips();
    } catch (err) {
      alert("Failed to create trip");
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      await axios.delete(`http://${window.location.hostname}:8080/api/trips/${tripId}`);
      fetchTrips();
    } catch (err) {
      console.error("Error deleting trip:", err);
      alert("Delete failed");
    }
  };

  const handleContextMenu = (e, tripId, tripTitle) => {
    e.preventDefault(); // デバイス標準の右クリックメニューを防止
    if (window.confirm(`Are you sure you want to delete the trip "${tripTitle}"?\nAll associated photos will also be deleted.`)) {
      handleDeleteTrip(tripId);
    }
  };

  const handleTouchStart = (tripId, tripTitle) => {
    longPressRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      if (window.confirm(`Are you sure you want to delete the trip "${tripTitle}"?\nAll associated photos will also be deleted.`)) {
        handleDeleteTrip(tripId);
      }
    }, 800); // 800msの長押しで発動
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return;

    try {
      // ユーザー退会APIコール (bodyにパスワードを乗せる)
      await axios.delete(`http://${window.location.hostname}:8080/api/users/${user.id}`, {
        data: { password: deletePassword }
      });
      alert("Account and all data have been permanently deleted.\nThank you for using our service.");
      onLogout(); // 親アプリ側にログアウトとして通知し、画面遷移させる
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        alert("Incorrect password");
      } else {
        alert("Failed to delete account");
      }
    }
  };

  const handleClickTrip = (e, tripId) => {
    if (longPressRef.current) {
      // 長押し直後のクリックイベントならナビゲートをブロック
      e.preventDefault();
      longPressRef.current = false;
      return;
    }
    onSelectTrip(tripId);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="dashboard-header" style={{ marginBottom: '60px' }}>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '3.2rem', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1', color: 'var(--text-main)' }}>
            WELCOME,<br />{user.username.toUpperCase()}
          </h1>
        </div>

        {/* Floating Menu Button */}
        <button
          className="menu-trigger"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="currentColor"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
          )}
        </button>

        {isMenuOpen && (
          <>
            <div className="menu-overlay" onClick={() => setIsMenuOpen(false)} />
            <div className="menu-dropdown-container glass-panel" style={{ padding: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.9)' }}>
              <button
                onClick={() => { setIsMenuOpen(false); onLogout(); }}
                style={{
                  width: '100%', padding: '18px 20px', background: 'transparent', border: 'none',
                  borderBottom: '1px solid rgba(0,0,0,0.05)', textAlign: 'left', cursor: 'pointer',
                  fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.03)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                LOGOUT
              </button>
              <button
                onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }}
                style={{
                  width: '100%', padding: '18px 20px', background: 'transparent', border: 'none',
                  textAlign: 'left', cursor: 'pointer', fontSize: '1.05rem', color: '#dc3545',
                  display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(220, 53, 69, 0.05)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                DELETE ACCOUNT
              </button>
            </div>
          </>
        )}

        {/* 退会処理確認モーダル */}
        {isDeleteModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div className="glass-panel" style={{ background: 'white', padding: '30px', maxWidth: '400px', width: '100%', borderRadius: '16px' }}>
              <h2 style={{ color: '#dc3545', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                DELETE ACCOUNT
              </h2>
              <p style={{ color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.5' }}>
                Deleting your account will permanently <strong>erase all your travel data and uploaded photos. This action cannot be undone.</strong><br /><br />
                Please enter your password to continue.
              </p>
              <form onSubmit={handleDeleteAccount}>
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                  required
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); }}
                    style={{ flex: 1, padding: '12px', background: 'var(--bg-lite)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: '12px', background: '#dc3545', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    PERMANENTLY DELETE
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-panel" style={{ padding: '40px', border: '1px solid rgba(255,255,255,0.8)', marginBottom: '50px' }}>
          {/* Create Section */}
          <section style={{ marginBottom: '50px' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
              CREATE NEW TRIP
            </h2>
            <form className="create-trip-form" onSubmit={handleCreateTrip} style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
              <input
                type="text" placeholder="Enter a trip name" value={newTripTitle} onChange={e => setNewTripTitle(e.target.value)}
                style={{ flex: 1, padding: '18px 24px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '1.1rem', background: 'rgba(255,255,255,0.6)', fontWeight: '500' }}
              />
              <button type="submit" style={{
                padding: '18px 40px', background: 'var(--primary)', color: 'var(--text-main)',
                border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '1.1rem',
                boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.4)',
                whiteSpace: 'nowrap'
              }}>
                START
              </button>
            </form>
          </section>

          <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', marginBottom: '50px' }} />

          {/* List Section */}
          <section>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '30px', fontSize: '1.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T780-120H200Zm0-80h580v-400H200v400Zm0-480h580v-80H200v80Zm0 0v-80 80Z"/></svg>
              YOUR JOURNEYS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
              {trips.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>No journeys yet. Start creating your adventure above!</p>
              ) : null}

              {trips.map(trip => (
                <div
                  key={trip.id}
                  onClick={(e) => handleClickTrip(e, trip.id)}
                  onContextMenu={(e) => handleContextMenu(e, trip.id, trip.title)}
                  onTouchStart={() => handleTouchStart(trip.id, trip.title)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  style={{
                    padding: '25px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    background: 'rgba(255, 255, 255, 0.4)', // Slightly transluscent white for card-like feel inside glass
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.3rem', fontWeight: '900', lineHeight: '1.2' }}>{trip.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T780-120H200Zm0-80h580v-400H200v400Zm0-480h580v-80H200v80Zm0 0v-80 80Z"/></svg>
                    {new Date(trip.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
