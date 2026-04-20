import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';

// ハヴァーサインの公式（球面三角法）による2点間の距離(km)計算
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // 地球の半径(km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
import MapView from './MapView';
import UploadPanel from './UploadPanel';

const TripDetailScreen = ({ photos, fetchPhotos, currentUserId, selectedTrip, onBack }) => {
  const [expandedView, setExpandedView] = useState('none'); // 'none' | 'map' | 'gallery'

  // ダッシュボード等から遷移してきた際に、スクロール位置をリセットする
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activePhotoId, setActivePhotoId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'classified'
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null); // 追加: フルスクリーン用
  const [galleryViewMode, setGalleryViewMode] = useState('timeline'); // 'timeline' | 'daily' | 'ai'

  const longPressRef = useRef(false);
  const pressTimer = useRef(null);

  const { totalDistance, durationText } = useMemo(() => {
    if (!photos || photos.length === 0) return { totalDistance: 0, durationText: '-' };
    
    // 距離の計算
    let distance = 0;
    const validPhotos = photos.filter(p => p.latitude && p.longitude);
    for (let i = 0; i < validPhotos.length - 1; i++) {
      distance += calculateDistance(
        validPhotos[i].latitude, validPhotos[i].longitude,
        validPhotos[i+1].latitude, validPhotos[i+1].longitude
      );
    }

    // 日数の計算 (Safari等のブラウザ固有タイムゾーンパースバグを完全回避する文字列ベース処理)
    const validDateStrings = photos
      .filter(p => p.captured_at)
      .map(p => p.captured_at.substring(0, 10)) // "YYYY-MM-DD" の年月日部分だけを強制抽出
      .filter(dateStr => dateStr.length === 10);

    let durationText = '-';
    if (validDateStrings.length > 0) {
      // YYYY-MM-DDフォーマットの文字列なので辞書順アルファベット比較で最小・最大が取れる
      const minStr = validDateStrings.reduce((a, b) => a < b ? a : b);
      const maxStr = validDateStrings.reduce((a, b) => a > b ? a : b);
      
      // 抽出した文字列を「UTCの完全な0時」として解釈させて差分を出す
      const minTime = Date.parse(`${minStr}T00:00:00Z`);
      const maxTime = Date.parse(`${maxStr}T00:00:00Z`);
      
      // 確実に24時間の倍数の差分になるので、日またぎの回数が正確に出る
      const nights = Math.round((maxTime - minTime) / 86400000);
      
      durationText = nights === 0 ? "日帰り" : `${nights}泊${nights + 1}日`;
    }

    return { 
      totalDistance: distance.toFixed(1), 
      durationText 
    };
  }, [photos]);

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("この写真を削除してよろしいですか？")) return;

    try {
      await axios.delete(`http://${window.location.hostname}:8080/api/photos/${photoId}`);
      if (fetchPhotos) fetchPhotos();
      if (fullScreenPhoto && fullScreenPhoto.id === photoId) {
        setFullScreenPhoto(null);
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("削除に失敗しました。");
    }
  };

  const handleTouchStart = (photo) => {
    longPressRef.current = false;
    pressTimer.current = setTimeout(() => {
      longPressRef.current = true;
      handleDeletePhoto(photo.id);
    }, 800);
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleContextMenu = (e, photo) => {
    e.preventDefault();
    handleDeletePhoto(photo.id);
  };

  const renderPhotoGrid = (photoArray, isClassifiedTab = false) => {
    if (photoArray.length === 0) {
      return <div style={{ padding: '20px', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>写真はありません。</div>;
    }

    return (
      <div className="photo-grid" style={{ marginBottom: isClassifiedTab ? '50px' : '0' }}>
        {photoArray.map(p => (
          <div key={p.id} style={{ position: 'relative' }}>
            <img
              loading="lazy"
              src={`http://${window.location.hostname}:8080/api/photos/${p.id}/image?user_id=${currentUserId}`}
              alt="Gallery"
              className={`gallery-photo ${activePhotoId === p.id && !isClassifiedTab ? 'active' : ''}`}
              onClick={(e) => {
                if (longPressRef.current) {
                  e.preventDefault();
                  longPressRef.current = false;
                  return;
                }
                if (isClassifiedTab) {
                  setFullScreenPhoto(p);
                } else {
                  setActivePhotoId(prev => prev === p.id ? null : p.id);
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, p)}
              onTouchStart={() => handleTouchStart(p)}
              onTouchEnd={cancelPress}
              onTouchMove={cancelPress}
              draggable={false}
              style={{ display: 'block', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
            />
          </div>
        ))}
      </div>
    );
  };

  // 日付ごとにグループ化する便利な関数
  const getPhotosByDate = () => {
    const groups = {};
    photos.forEach(p => {
      let dateStr = "日付不明";
      if (p.captured_at) {
        dateStr = p.captured_at.substring(0, 10).replace(/-/g, '/');
      }
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(p);
    });
    // 日付順序を保証するためキーをソート
    const sortedGroups = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  };

  return (
    <div className="App" style={{ height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 9999,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--bg-gradient)',
              cursor: 'pointer',
              fontWeight: '600',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>‹</span> 戻る
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid var(--primary)',
              background: 'rgba(79, 70, 229, 0.1)',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span>📸</span> Add Pictures
          </button>
        </div>
        <span style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-main)' }}>TRIP DETAILS</span>
      </header>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('map')}
          style={{ flex: 1, padding: '14px', border: 'none', background: activeTab === 'map' ? 'rgba(79, 70, 229, 0.1)' : 'transparent', color: activeTab === 'map' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', borderBottom: activeTab === 'map' ? '3px solid var(--primary)' : '3px solid transparent' }}
        >
          マップ📍
        </button>
        <button
          onClick={() => setActiveTab('classified')}
          style={{ flex: 1, padding: '14px', border: 'none', background: activeTab === 'classified' ? 'rgba(79, 70, 229, 0.1)' : 'transparent', color: activeTab === 'classified' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', borderBottom: activeTab === 'classified' ? '3px solid var(--primary)' : '3px solid transparent' }}
        >
          詳細とギャラリー
        </button>
      </div>

      {activeTab === 'map' && (
        <div className="trip-detail-wrap">
          {(expandedView === 'none' || expandedView === 'map') && (
            <div className="map-section">
              <button
                className="expand-btn"
                onClick={() => setExpandedView(expandedView === 'map' ? 'none' : 'map')}
              >
                {expandedView === 'map' ? '🔄 分割表示' : '🔍 マップ拡大'}
              </button>
              <MapView
                photos={photos}
                onDeleteSuccess={fetchPhotos}
                currentUserId={currentUserId}
                activePhotoId={activePhotoId}
              />
            </div>
          )}

          {(expandedView === 'none' || expandedView === 'gallery') && (
            <div className="gallery-section">
              <button
                className="expand-btn"
                onClick={() => setExpandedView(expandedView === 'gallery' ? 'none' : 'gallery')}
              >
                {expandedView === 'gallery' ? '🔄 分割表示' : '🔍 ギャラリー拡大'}
              </button>

              <div style={{ padding: '25px 20px', paddingBottom: '100px' }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  pictures ({photos.length}枚)
                </h2>
                {renderPhotoGrid(photos, false)}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'classified' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px', background: 'var(--bg)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(255,255,255,0.8)', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📍 総移動距離</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>{totalDistance} <span style={{fontSize: '1rem'}}>km</span></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.8)', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📅 旅行期間</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>{durationText}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.8)', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📸 写真枚数</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>{photos.length} <span style={{fontSize: '1rem'}}>枚</span></div>
              </div>
            </div>

            {/* ギャラリー表示切り替えトグル */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <button 
                onClick={() => setGalleryViewMode('timeline')}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: galleryViewMode === 'timeline' ? 'var(--primary)' : 'transparent', color: galleryViewMode === 'timeline' ? 'white' : 'var(--text-muted)' }}
              >
                🕒 時系列
              </button>
              <button 
                onClick={() => setGalleryViewMode('daily')}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: galleryViewMode === 'daily' ? 'var(--primary)' : 'transparent', color: galleryViewMode === 'daily' ? 'white' : 'var(--text-muted)' }}
              >
                📅 日付ごと
              </button>
              <button 
                onClick={() => setGalleryViewMode('ai')}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: galleryViewMode === 'ai' ? 'var(--primary)' : 'transparent', color: galleryViewMode === 'ai' ? 'white' : 'var(--text-muted)' }}
              >
                ✨ AI分類
              </button>
            </div>

            <p style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.3)', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '30px' }}>
              💡 写真をタップすると全画面表示、長押し（PCは右クリック）で削除できます。
              {galleryViewMode === 'ai' && <><br/>※AI（YOLOv8）が「人物」「食事」「風景」の３つに自動でカテゴリ分けしています。</>}
            </p>

            <div style={{ paddingBottom: '100px' }}>
              {galleryViewMode === 'timeline' && (
                <>
                  <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>すべての写真</h2>
                  {renderPhotoGrid(photos, true)}
                </>
              )}

              {galleryViewMode === 'daily' && (
                Object.entries(getPhotosByDate()).map(([dateStr, dailyPhotos]) => (
                  <div key={dateStr}>
                    <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>🗓 {dateStr}</h2>
                    <div style={{ marginBottom: '30px' }}>
                      {renderPhotoGrid(dailyPhotos, true)}
                    </div>
                  </div>
                ))
              )}

              {galleryViewMode === 'ai' && (
                <>
                  <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>🧍 人物・ポートレート</h2>
                  {renderPhotoGrid(photos.filter(p => p.ml_category === 'person'), true)}

                  <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>🍽️ 食事・レストラン</h2>
                  {renderPhotoGrid(photos.filter(p => p.ml_category === 'food'), true)}

                  <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>🏞️ 風景・その他</h2>
                  {renderPhotoGrid(photos.filter(p => p.ml_category !== 'person' && p.ml_category !== 'food'), true)}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* フルスクリーンモーダル */}
      {fullScreenPhoto && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(8px)',
            zIndex: 100000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setFullScreenPhoto(null)}
        >
          <img 
            src={`http://${window.location.hostname}:8080/api/photos/${fullScreenPhoto.id}/image?user_id=${currentUserId}`} 
            style={{ 
              maxWidth: '96%', 
              maxHeight: '90%', 
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }} 
            alt="Fullscreen" 
          />
          <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </div>
      )}

      <UploadPanel
        onUploadSuccess={fetchPhotos}
        currentUserId={currentUserId}
        currentTripId={selectedTrip}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
};

export default TripDetailScreen;
