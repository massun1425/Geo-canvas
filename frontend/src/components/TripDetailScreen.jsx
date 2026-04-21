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
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'explore' | 'categories' | 'smart'
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null); // 追加: フルスクリーン用
  const [galleryViewMode, setGalleryViewMode] = useState('timeline'); // 'timeline' | 'daily'
  const [searchQuery, setSearchQuery] = useState(''); // 物体検索クエリ
  const [isReanalyzing, setIsReanalyzing] = useState(false); // 再解析中状態

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
        validPhotos[i + 1].latitude, validPhotos[i + 1].longitude
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

      durationText = nights === 0 ? "DAY TRIP" : `${nights}N ${nights + 1}D`;
    }

    return {
      totalDistance: distance.toFixed(1),
      durationText
    };
  }, [photos]);

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    try {
      await axios.delete(`http://${window.location.hostname}:8080/api/photos/${photoId}`);
      if (fetchPhotos) fetchPhotos();
      if (fullScreenPhoto && fullScreenPhoto.id === photoId) {
        setFullScreenPhoto(null);
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Delete failed.");
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
      return <div style={{ padding: '20px', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>No photos yet.</div>;
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
      let dateStr = "UNKNOWN DATE";
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

  // 日本語キーワードからYOLOタグ（英語）へのマッピング
  const jpToEnTagMap = {
    "人": "person", "人間": "person", "人物": "person",
    "犬": "dog", "いぬ": "dog", "猫": "cat", "ねこ": "cat",
    "車": "car", "くるま": "car", "自動車": "car",
    "飯": "food", "ごはん": "food", "料理": "food",
    "椅子": "chair", "イス": "chair",
    "傘": "umbrella", "かさ": "umbrella",
    "カバン": "backpack", "バッグ": "backpack", "リュック": "backpack",
    "コップ": "cup", "グラス": "cup",
    "パソコン": "laptop", "pc": "laptop",
    "スマホ": "cell phone", "携帯": "cell phone",
    "自転車": "bicycle", "バイク": "motorcycle",
    "鳥": "bird", "とり": "bird",
    "瓶": "bottle", "ボトル": "bottle",
    "本": "book", "ほん": "book",
    "時計": "clock", "とけい": "clock",
    "テーブル": "dining table", "机": "dining table"
  };

  const handleReanalyze = async () => {
    if (!window.confirm("Do you want to re-analyze all photos in this trip using AI? This will populate search tags for older photos.")) return;
    
    setIsReanalyzing(true);
    try {
      await axios.get(`http://${window.location.hostname}:8080/api/photos/reanalyze/${selectedTrip}`);
      fetchPhotos();
      alert("Successfully updated all photo tags!");
    } catch (err) {
      console.error(err);
      alert("Failed to re-analyze photos.");
    } finally {
      setIsReanalyzing(false);
    }
  };

  const filteredPhotos = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    const enQuery = jpToEnTagMap[query] || query;

    return photos.filter(p => {
      const tags = (p.ml_tags || '').toLowerCase();
      const category = (p.ml_category || '').toLowerCase();
      return tags.includes(enQuery) || category.includes(enQuery);
    });
  }, [photos, searchQuery]);

  return (
    <div className="App" style={{ height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        zIndex: 9999,
        padding: '16px 20px',
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
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" style={{ marginRight: '4px' }}><path d="m313-480 287 287 56-57-230-230 230-230-56-57-287 287Z"/></svg>
            BACK
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: '900',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 8px 15px -3px rgba(245, 158, 11, 0.4)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z" /></svg>
            UPLOAD
          </button>
        </div>
        <span style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>TRIP DETAILS</span>
      </header>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('map')}
          style={{ flex: 1, padding: '16px', border: 'none', background: activeTab === 'map' ? 'rgba(255, 255, 255, 0.3)' : 'transparent', color: 'var(--text-main)', fontWeight: '900', fontSize: '0.95rem', cursor: 'pointer', transition: '0.2s', borderBottom: activeTab === 'map' ? '4px solid var(--primary)' : '4px solid transparent' }}
        >
          MAP VIEW
        </button>
        <button
          onClick={() => setActiveTab('explore')}
          style={{ flex: 1, padding: '16px', border: 'none', background: activeTab === 'explore' ? 'rgba(255, 255, 255, 0.3)' : 'transparent', color: 'var(--text-main)', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', borderBottom: activeTab === 'explore' ? '4px solid var(--primary)' : '4px solid transparent' }}
        >
          EXPLORE
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={{ flex: 1, padding: '16px', border: 'none', background: activeTab === 'categories' ? 'rgba(255, 255, 255, 0.3)' : 'transparent', color: 'var(--text-main)', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', borderBottom: activeTab === 'categories' ? '4px solid var(--primary)' : '4px solid transparent' }}
        >
          AI GROUPS
        </button>
        <button
          onClick={() => setActiveTab('smart')}
          style={{ flex: 1, padding: '16px', border: 'none', background: activeTab === 'smart' ? 'rgba(255, 255, 255, 0.3)' : 'transparent', color: 'var(--text-main)', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', borderBottom: activeTab === 'smart' ? '4px solid var(--primary)' : '4px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
          SMART
        </button>
      </div>

      {activeTab === 'map' && (
        <div className="trip-detail-wrap">
          {(expandedView === 'none' || expandedView === 'map') && (
            <div className="map-section">
              <button
                className="expand-btn"
                onClick={() => setExpandedView(expandedView === 'map' ? 'none' : 'map')}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {expandedView === 'map' ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M480-120v-720h400v720H480Zm80-80h240v-560H560v560ZM80-200v-80h320v80H80Zm0-200v-80h320v80H80Zm0-200v-80h320v80H80Z"/></svg> SPLIT VIEW</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M120-120v-320h320v320H120Zm400 0v-720h320v720H520ZM120-520v-320h320v320H120Z"/></svg> EXPAND MAP</>
                )}
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
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {expandedView === 'gallery' ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M480-120v-720h400v720H480Zm80-80h240v-560H560v560ZM80-200v-80h320v80H80Zm0-200v-80h320v80H80Zm0-200v-80h320v80H80Z"/></svg> SPLIT VIEW</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M120-120v-320h320v320H120Zm400 0v-720h320v720H520ZM120-520v-320h320v320H120Z"/></svg> EXPAND GALLERY</>
                )}
              </button>

              <div style={{ padding: '25px 20px', paddingBottom: '100px' }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  PICTURES ({photos.length})
                </h2>
                {renderPhotoGrid(photos, false)}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'explore' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px', background: 'var(--bg)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(255,255,255,0.7)', padding: '30px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DISTANCE</div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px', letterSpacing: '-0.02em' }}>{totalDistance}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>KM</span></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.7)', padding: '30px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DURATION</div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px', letterSpacing: '-0.02em' }}>{durationText}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.7)', padding: '30px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PHOTOS</div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px', letterSpacing: '-0.02em' }}>{photos.length}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>PC</span></div>
              </div>
            </div>

            {/* ギャラリー表示切り替えトグル */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <button
                onClick={() => setGalleryViewMode('timeline')}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: galleryViewMode === 'timeline' ? 'var(--primary)' : 'transparent', color: galleryViewMode === 'timeline' ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M440-440h80v-320h-80v320Zm0 160h80v-80h-80v80ZM120-120v-720h720v720H120Zm80-80h560v-560H200v560Zm0 0v-560 560Z"/></svg>
                TIMELINE
              </button>
              <button
                onClick={() => setGalleryViewMode('daily')}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', background: galleryViewMode === 'daily' ? 'var(--primary)' : 'transparent', color: galleryViewMode === 'daily' ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T780-120H200Zm0-80h580v-400H200v400Zm0-480h580v-80H200v80Zm0 0v-80 80Z"/></svg>
                BY DATE
              </button>
            </div>

            <p style={{ 
              background: 'rgba(0, 0, 0, 0.03)', 
              padding: '16px 20px', 
              borderRadius: '12px', 
              border: '1px solid rgba(0, 0, 0, 0.08)', 
              color: 'var(--text-main)', 
              fontSize: '0.9rem',
              lineHeight: '1.6',
              fontWeight: '600', 
              marginBottom: '35px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span>• Tap a photo for full screen.</span>
              <span>• Long press (right-click on PC) to delete.</span>
              {galleryViewMode === 'ai' && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
                  *AI (YOLOv8) automatically categorizes photos into "People", "Food", and "Scenery".
                </span>
              )}
            </p>

            <div style={{ paddingBottom: '100px' }}>
              {galleryViewMode === 'timeline' && (
                <>
                  <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>ALL PHOTOS</h2>
                  {renderPhotoGrid(photos, true)}
                </>
              )}

              {galleryViewMode === 'daily' && (
                Object.entries(getPhotosByDate()).map(([dateStr, dailyPhotos]) => (
                  <div key={dateStr}>
                    <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T780-120H200Zm0-80h580v-400H200v400Zm0-480h580v-80H200v80Zm0 0v-80 80Z"/></svg>
                      {dateStr}
                    </h2>
                    <div style={{ marginBottom: '30px' }}>
                      {renderPhotoGrid(dailyPhotos, true)}
                    </div>
                  </div>
                ))
              )}

            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px', background: 'var(--bg)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '30px', fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-0.03em' }}>AI GROUPS</h2>
            
            <p style={{ 
              background: 'rgba(0, 0, 0, 0.03)', 
              padding: '16px 20px', 
              borderRadius: '12px', 
              border: '1px solid rgba(0, 0, 0, 0.08)', 
              color: 'var(--text-main)', 
              fontSize: '0.9rem',
              lineHeight: '1.6',
              fontWeight: '600', 
              marginBottom: '35px'
            }}>
              *AI (YOLOv8) automatically categorizes photos into "People", "Food", and "Scenery".
            </p>

            <div style={{ paddingBottom: '100px' }}>
              <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px', display: 'center', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-80q0-34 17.5-62.5T224-344q67-33 133-44.5t133-11.5q67 0 133 11.5t133 44.5q29 13 46.5 41.5T720-240v80H160Zm80-80h400v-3q0-12-8.5-24T610-281q-53-26-103-37.5T410-330q-50 0-100 11.5T210-281q-13 7-21.5 19t-8.5 24v3Zm240-320q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0-80Zm0 400Z"/></svg>
                PEOPLE & PORTRAITS
              </h2>
              {renderPhotoGrid(photos.filter(p => p.ml_category === 'person'), true)}

              <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px', display: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-120v-280q0-83 58.5-141.5T360-600v-280h80v280h40v-280h80v280h40v-280h80v280q0 83-58.5 141.5T520-400v280h-80v-280h-80v280h-200Zm400-80h320v-80H560v80Zm0-120h320v-80H560v80Zm0-120h320v-80H560v80Z"/></svg>
                FOOD & RESTAURANTS
              </h2>
              {renderPhotoGrid(photos.filter(p => p.ml_category === 'food'), true)}

              <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', fontSize: '1.4rem', borderBottom: '2px solid var(--border)', paddingBottom: '10px', display: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-120v-80h720v80H120Zm160-120-160-240 102-153 178 267h-120Zm220 0-140-210 132-198 288 432h-280Z"/></svg>
                SCENERY & OTHERS
              </h2>
              {renderPhotoGrid(photos.filter(p => p.ml_category !== 'person' && p.ml_category !== 'food'), true)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'smart' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px', background: 'var(--bg)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '30px', fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-0.03em' }}>SMART FIND</h2>
            
            <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px', border: '1px solid rgba(255,255,255,0.8)' }}>
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.95rem' }}>
                Search for specific things in your photos (e.g. "dog", "car", "person")
              </p>
              
              <div style={{ position: 'relative', display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
                  <input
                    type="text"
                    placeholder="Search objects (Try 'dog' or '犬')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '18px 18px 18px 54px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '1.2rem', background: 'rgba(255,255,255,0.75)', fontWeight: '600', color: 'var(--text-main)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '25px' }}>
                {['Person', 'Dog', 'Cat', 'Car', 'Bicycle', 'Food', 'Laptop', 'Phone'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    style={{
                      padding: '10px 20px', borderRadius: '25px', border: '1px solid rgba(0,0,0,0.1)',
                      background: searchQuery.toLowerCase() === tag.toLowerCase() ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
                      color: searchQuery.toLowerCase() === tag.toLowerCase() ? 'white' : 'var(--text-main)',
                      fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', transition: '0.2s',
                      boxShadow: searchQuery.toLowerCase() === tag.toLowerCase() ? '0 4px 10px rgba(245, 158, 11, 0.4)' : 'none'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)' }}>
                  {searchQuery ? `SEARCH RESULTS (${filteredPhotos.length})` : 'ENTER A SEARCH TERM'}
                </h3>
                
                <button
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                  style={{
                    padding: '12px 22px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(255,255,255,0.6)', color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" style={{ animation: isReanalyzing ? 'spin 1.5s linear infinite' : 'none' }}>
                    <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
                  </svg>
                  {isReanalyzing ? 'RE-ANALYZING...' : 'RE-ANALYZE TRIP'}
                </button>
              </div>

              {searchQuery && renderPhotoGrid(filteredPhotos, true)}
              {!searchQuery && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', border: '2px dashed rgba(0,0,0,0.05)', borderRadius: '24px', background: 'rgba(255,255,255,0.2)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="56px" viewBox="0 -960 960 960" width="56px" fill="rgba(0,0,0,0.1)" style={{ marginBottom: '20px' }}><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
                  <p style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>Enter a search term above to find matching photos.</p>
                </div>
              )}
            </div>
            
            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
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
