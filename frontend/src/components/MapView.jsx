import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import axios from 'axios';

// 緯度経度から住所（県・市）を取得して表示するコンポーネント
const LocationName = ({ latitude, longitude }) => {
  const [address, setAddress] = useState('📍 場所を特定中...');

  useEffect(() => {
    let isMounted = true;
    const fetchLocation = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=ja`);
        const data = await response.json();
        
        if (isMounted && data && data.address) {
          const pref = data.address.province || data.address.state || data.address.region || '';
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || '';
          const locationString = `${pref} ${city}`.trim();
          
          setAddress(locationString ? `📍 ${locationString}` : '📍 詳細な場所不明');
        }
      } catch (error) {
        if (isMounted) setAddress('📍 場所取得エラー');
      }
    };
    
    fetchLocation();
    
    return () => { isMounted = false; };
  }, [latitude, longitude]);

  return (
    <span style={{ fontSize: '0.75rem', color: '#6B7280', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>
      {address}
    </span>
  );
};

// Leafletのデフォルトアイコンのパスを正しく設定するための修正
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 写真の座標に合わせて地図の表示範囲を自動調整するコンポーネント
function MapAutoFitter({ photos }) {
  const map = useMap();
  useEffect(() => {
    const validPhotos = photos.filter(p => p.latitude && p.longitude);
    if (validPhotos.length > 0) {
      const bounds = L.latLngBounds(validPhotos.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [photos, map]);
  return null;
}

// マウスパッド（ホイール）のスクロールを「移動（パン）」に割り当てるコンポーネント
function MapScrollToPan() {
  const map = useMap();
  
  useEffect(() => {
    const container = map.getContainer();
    
    const handleWheel = (e) => {
      // e.ctrlKey が true の場合（ピンチズームや Ctrl+スクロール）はズームを優先
      if (e.ctrlKey) return;
      e.preventDefault();
      map.panBy([e.deltaX, e.deltaY], { animate: false });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [map]);

  return null;
}

// 指定した写真の座標へカメラを少しだけスワイプさせるコンポーネント（強引なズーム展開をしない用）
function ActivePhotoHandler({ activePhotoId, photos }) {
  const map = useMap();
  
  useEffect(() => {
    if (activePhotoId && photos) {
      const target = photos.find(p => p.id === activePhotoId);
      if (target && target.latitude && target.longitude) {
        // ズームレベルは変えずに、パン（スワイプ）だけする
        map.panTo([target.latitude, target.longitude], { animate: true });
      }
    }
  }, [activePhotoId, photos, map]);
  return null;
}

// クラスタ（重なったピン）のアイコンを、画像ではなくCSSで描画するシャープなピンにする関数
const createCustomClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background-color: var(--primary, #4F46E5); /* アプリのテーマカラー */
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: -2px 2px 4px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-family: sans-serif;
          font-size: ${count > 99 ? '10px' : '13px'};
          font-weight: bold;
        ">${count}</span>
      </div>
    `,
    className: '', // Leafletデフォルトの四角背景を消す
    iconSize: [30, 30],
    iconAnchor: [15, 36] // 45度回転後の尖った先端(下部)に座標を合わせる
  });
};

const formatDateTime = (isoString) => {
  if (!isoString) return '日付不明';
  const localIsoString = isoString.replace(/(Z|[+-]\d{2}:\d{2}(:\d{2})?)$/, '');
  return new Date(localIsoString).toLocaleString('ja-JP', { 
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' 
  });
};

// ポップアップの中身を共通コンポーネント化（通常のマップ上のピン用 ＆ ギャラリー選択時の単独ポップアップ用）
const PhotoPopupContent = ({ photo, currentUserId, onDelete }) => (
  <div style={{ display: 'flex', flexDirection: 'column', width: '180px' }}>
    <img 
      loading="lazy"
      src={`http://${window.location.hostname}:8080/api/photos/${photo.id}/image?user_id=${currentUserId}`} 
      alt="Trip" 
      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '140px', objectFit: 'cover' }} 
    />
    <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <LocationName latitude={photo.latitude} longitude={photo.longitude} />
        <span style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '600' }}>
          {formatDateTime(photo.captured_at)}
        </span>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(photo.id);
        }}
        style={{ 
          color: '#dc3545', border: 'none', background: 'rgba(220, 53, 69, 0.15)', 
          cursor: 'pointer', fontSize: '0.9rem', padding: '5px 8px', borderRadius: '6px',
          display: 'flex', alignItems: 'center', transition: 'background 0.2s'
        }}
        title="この写真を削除"
      >
        🗑️
      </button>
    </div>
  </div>
);

// 【案A】ポップアップのオンデマンド読み込み用コンポーネント
// 裏側での大量の通信とDOM作成を防ぎ、クリックされた時だけ要素を作成する
const PhotoMarker = ({ photo, currentUserId, onDelete, markerRefs }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Marker 
      position={[photo.latitude, photo.longitude]}
      ref={(r) => { if (r && markerRefs.current) markerRefs.current[photo.id] = r; }}
      eventHandlers={{
        click: () => setIsOpen(true),
        popupopen: () => setIsOpen(true),
        popupclose: () => setIsOpen(false)
      }}
    >
      <Popup closeButton={false} className="custom-popup">
        {isOpen ? (
          <PhotoPopupContent photo={photo} currentUserId={currentUserId} onDelete={onDelete} />
        ) : (
          <div style={{ width: '180px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Loading...</span>
          </div>
        )}
      </Popup>
    </Marker>
  );
};

const MapView = ({ photos, onDeleteSuccess, currentUserId, activePhotoId }) => {
  const [mapCenter, setMapCenter] = useState([35.6812, 139.7671]); // デフォルト東京
  const markerRefs = useRef({});
  const clusterRef = useRef(null); // クラスタリングのインスタンス操作用

  // 削除処理もメモ化（子コンポーネントへのpropsの再生成を防ぐ）
  const handleDelete = useCallback(async (photoId) => {
    if (!window.confirm("この写真を削除してよろしいですか？")) return;
    try {
      await axios.delete(`http://${window.location.hostname}:8080/api/photos/${photoId}`);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("削除に失敗しました。");
    }
  }, [onDeleteSuccess]);

  // 【案B】ポリライン（青い線）の計算結果と描画をキャッシュ（メモ化）
  const polylinePositions = useMemo(() => {
    return photos
      .filter(photo => photo.latitude && photo.longitude)
      .map(photo => [photo.latitude, photo.longitude]);
  }, [photos]);

  // 【案B】重い地図要素（何百ものピンとクラスタ）全体を完全にキャッシュ（メモ化）
  // photos配列自体が更新された時だけ再計算する
  const mapOverlayElements = useMemo(() => {
    return (
      <>
        {/* ルート（ポリライン）の描画 */}
        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} color="blue" weight={4} opacity={0.6} />
        )}

        {/* マーカークラスタリング */}
        <MarkerClusterGroup 
          ref={clusterRef}
          spiderfyOnMaxZoom={true} 
          showCoverageOnHover={false} 
          maxClusterRadius={20}
          removeOutsideVisibleBounds={false} /* スマホのスワイプ対策: 画面外のピンを破棄せず裏で表示維持（チラつき防止） */
          iconCreateFunction={createCustomClusterIcon}
        >
          {photos.map(photo => {
            if (!photo.latitude || !photo.longitude) return null;
            return (
              <PhotoMarker 
                key={photo.id}
                photo={photo}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                markerRefs={markerRefs}
              />
            );
          })}
        </MarkerClusterGroup>
      </>
    );
  }, [photos, currentUserId, polylinePositions, handleDelete]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapScrollToPan />
        <MapAutoFitter photos={photos} />
        <ActivePhotoHandler activePhotoId={activePhotoId} photos={photos} />
        
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          keepBuffer={3} /* スマホのスワイプ対策: 画面領域の3個分外側までタイル画像を裏で先読み確保（グレー画面防止） */
          updateWhenIdle={false} /* スワイプ中も積極的に裏側で画像を読み込む */
        />

        {/* Leafletデフォルトの余白（邪魔な白い枠）を消去し、画像を端までピタッと表示するためのスタイル */}
        <style>{`
          .custom-popup .leaflet-popup-content-wrapper {
            padding: 0;
            overflow: hidden;
            border-radius: 12px;
          }
          .custom-popup .leaflet-popup-content {
            margin: 0;
            width: auto !important;
          }
        `}</style>
        
        {/* 毎回再計算させないために切り出したキャッシュ済みのレイヤー */}
        {mapOverlayElements}

        {/* ギャラリー側のタップに連動する単独のポップアップ（クラスタ破壊・勝手なズームを抑止） */}
        {activePhotoId && (() => {
          const target = photos.find(p => p.id === activePhotoId);
          if (target && target.latitude && target.longitude) {
            return (
              <Popup position={[target.latitude, target.longitude]} closeButton={false} className="custom-popup">
                <PhotoPopupContent photo={target} currentUserId={currentUserId} onDelete={handleDelete} />
              </Popup>
            );
          }
          return null;
        })()}
      </MapContainer>
    </div>
  );
};

export default MapView;
