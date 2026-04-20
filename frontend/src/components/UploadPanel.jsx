import React, { useState } from 'react';
import axios from 'axios';

const UploadPanel = ({ onUploadSuccess, currentUserId, currentTripId, isOpen, onClose }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !currentUserId || !currentTripId) {
      alert("ユーザーと旅行が選択されていません。上部メニューから選択または作成してください。");
      return;
    }
    setUploading(true);
    let successCount = 0;
    
    // 順番にアップロード（プログレス表示を綺麗にするならPromise.allでも可）
    for (const f of files) {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('user_id', currentUserId);
      formData.append('trip_id', currentTripId);
      
      try {
        await axios.post(`http://${window.location.hostname}:8080/api/photos/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
      }
    }
    
    setUploading(false);
    setFiles([]);
    if (document.getElementById('photo-upload-input')) {
       document.getElementById('photo-upload-input').value = ""; // 入力欄のリセット
    }
    
    if (successCount > 0 && onUploadSuccess) {
      onUploadSuccess();
    }
    
    if (successCount < files.length) {
      alert(`${files.length - successCount}枚のアップロードに失敗しました。`);
    }
  };

  const closePanel = () => {
    setFiles([]); // 閉じたら選択中のファイルもリセット
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      bottom: '15px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: 'calc(100vw - 30px)',
      maxWidth: '340px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>📷 写真を追加</h3>
        <button 
          onClick={closePanel}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '0 5px' }}
        >
          ✕
        </button>
      </div>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
           border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
           borderRadius: '12px',
           padding: '15px',
           textAlign: 'center',
           background: dragOver ? 'rgba(79, 70, 229, 0.05)' : 'rgba(255,255,255,0.4)',
           transition: 'all 0.2s',
           cursor: 'pointer'
        }}
        onClick={() => document.getElementById('photo-upload-input').click()}
      >
        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
          {files.length > 0 ? `${files.length}枚の画像を選択中` : "ここをタップして写真を選択"}
        </p>
        <div style={{ 
            background: 'var(--bg-gradient)', padding: '8px 12px', borderRadius: '8px', 
            display: 'inline-block', fontSize: '0.85rem', fontWeight: '600', border: '1px solid var(--border)', color: 'var(--primary)' 
        }}>
          ファイルを探す
          <input 
            id="photo-upload-input"
            type="file" 
            accept="image/*" 
            multiple
            onChange={handleFileChange} 
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <button 
        onClick={handleUpload} 
        disabled={files.length === 0 || uploading || !currentUserId || !currentTripId}
        style={{
          padding: '12px',
          background: (files.length > 0 && currentUserId && currentTripId) ? 'var(--primary)' : '#cbd5e1',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: (files.length > 0 && currentUserId && currentTripId) ? 'pointer' : 'not-allowed',
          fontWeight: 'bold',
          fontSize: '1rem',
          boxShadow: (files.length > 0 && currentUserId && currentTripId) ? '0 4px 14px 0 rgba(79, 70, 229, 0.39)' : 'none'
        }}
      >
        {uploading ? '送信中...' : 'アップロード'}
      </button>
    </div>
  );
};

export default UploadPanel;
