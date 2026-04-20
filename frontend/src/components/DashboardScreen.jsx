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
      alert("旅行の作成に失敗しました");
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      await axios.delete(`http://${window.location.hostname}:8080/api/trips/${tripId}`);
      fetchTrips();
    } catch (err) {
      console.error("Error deleting trip:", err);
      alert("削除に失敗しました");
    }
  };

  const handleContextMenu = (e, tripId, tripTitle) => {
    e.preventDefault(); // デバイス標準の右クリックメニューを防止
    if (window.confirm(`旅行「${tripTitle}」を完全に削除してもよろしいですか？\n※登録された写真もすべて消去されます。`)) {
      handleDeleteTrip(tripId);
    }
  };

  const handleTouchStart = (tripId, tripTitle) => {
    longPressRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      if (window.confirm(`旅行「${tripTitle}」を完全に削除してもよろしいですか？\n※登録された写真もすべて消去されます。`)) {
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
      alert("アカウントとすべてのデータが完全に削除されました。\\nご利用ありがとうございました。");
      onLogout(); // 親アプリ側にログアウトとして通知し、画面遷移させる
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        alert("パスワードが正しくありません");
      } else {
        alert("退会処理に失敗しました");
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
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="dashboard-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="dashboard-title" style={{ margin: 0, fontSize: '1.5rem', wordBreak: 'break-word', paddingRight: '10px' }}>Welcome, {user.username} 👋</h1>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              style={{
                width: '45px', height: '45px', background: 'white', color: 'var(--text-main)',
                border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                boxShadow: 'var(--shadow-sm)', transition: '0.2s', position: 'relative', zIndex: 101
              }}
              title="メニュー"
            >
              ☰
            </button>
            
            {isMenuOpen && (
              <>
                {/* メニューの外側をクリックして閉じるための透明オーバーレイ */}
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                  onClick={() => setIsMenuOpen(false)} 
                />
                <div style={{
                  position: 'absolute', top: '55px', right: '0', background: 'white',
                  borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
                  width: '200px', zIndex: 100, overflow: 'hidden'
                }}>
                <button 
                  onClick={() => { setIsMenuOpen(false); onLogout(); }} 
                  style={{
                    width: '100%', padding: '15px', background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer',
                    fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'var(--bg-lite)'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  🚪 ログアウト
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }} 
                  style={{
                    width: '100%', padding: '15px', background: 'transparent', border: 'none',
                    textAlign: 'left', cursor: 'pointer', fontSize: '1rem', color: '#dc3545',
                    display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(220, 53, 69, 0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  ⚠️ アカウント削除
                </button>
              </div>
              </>
            )}
          </div>
        </div>

        {/* 退会処理確認モーダル */}
        {isDeleteModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div className="glass-panel" style={{ background: 'white', padding: '30px', maxWidth: '400px', width: '100%', borderRadius: '16px' }}>
              <h2 style={{ color: '#dc3545', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚠️ アカウント削除
              </h2>
              <p style={{ color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.5' }}>
                アカウントを削除すると、<strong>全ての旅行データとアップロードした写真が完全に消去され元に戻せなくなります。</strong><br/><br/>
                続行するにはパスワードを入力してください。
              </p>
              <form onSubmit={handleDeleteAccount}>
                <input 
                  type="password" 
                  placeholder="パスワードを入力" 
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
                    キャンセル
                  </button>
                  <button 
                    type="submit" 
                    style={{ flex: 1, padding: '12px', background: '#dc3545', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    完全に削除する
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="glass-panel" style={{ padding: '30px', marginBottom: '40px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>新しい旅行を作成 ✈️</h2>
          <form className="create-trip-form" onSubmit={handleCreateTrip}>
            <input
              type="text" placeholder="旅行のタイトル" value={newTripTitle} onChange={e => setNewTripTitle(e.target.value)}
              style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', background: 'rgba(255,255,255,0.7)' }}
            />
            <button type="submit" style={{
              padding: '12px 28px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
              boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)'
            }}>
              作成
            </button>
          </form>
        </div>

        <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.5rem' }}>あなたの旅行一覧</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
          {trips.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>まだ旅行がありません。上のフォームから作成してください。</p>
          ) : null}

          {trips.map(trip => (
            <div
              key={trip.id}
              className="glass-panel"
              onClick={(e) => handleClickTrip(e, trip.id)}
              onContextMenu={(e) => handleContextMenu(e, trip.id, trip.title)}
              onTouchStart={() => handleTouchStart(trip.id, trip.title)}
              onTouchEnd={cancelPress}
              onTouchMove={cancelPress}
              style={{
                padding: '25px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                userSelect: 'none', // 長押し時のテキスト選択を防ぐ
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none' // スマホブラウザの長押しメニューをブロック
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.3rem' }}>{trip.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>作成日: {new Date(trip.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
