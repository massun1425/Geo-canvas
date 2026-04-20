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
      alert(`${files.length - successCount} uploads failed.`);
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
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      padding: '25px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      width: 'calc(100vw - 40px)',
      maxWidth: '380px',
      border: '1px solid rgba(255,255,255,0.7)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.05em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ADD PHOTOS
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z"/></svg>
        </h3>
        <button 
          onClick={closePanel}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 5px', display: 'flex', alignItems: 'center' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
        </button>
      </div>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
           border: `2px dashed ${dragOver ? 'var(--primary)' : 'rgba(0,0,0,0.1)'}`,
           borderRadius: '14px',
           padding: '25px 20px',
           textAlign: 'center',
           background: dragOver ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.5)',
           transition: 'all 0.2s',
           cursor: 'pointer'
        }}
        onClick={() => document.getElementById('photo-upload-input').click()}
      >
        <p style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700' }}>
          {files.length > 0 ? `${files.length} FILES SELECTED` : "TAP OR DRAG PHOTOS HERE"}
        </p>
        <div style={{ 
            background: 'white', padding: '10px 18px', borderRadius: '10px', 
            display: 'inline-block', fontSize: '0.9rem', fontWeight: '800', border: '1px solid var(--border)', color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)'
        }}>
          BROWSE FILES
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
          padding: '16px',
          background: (files.length > 0 && currentUserId && currentTripId) ? 'var(--primary)' : '#e2e8f0',
          color: (files.length > 0 && currentUserId && currentTripId) ? 'var(--text-main)' : '#94a3b8',
          border: 'none',
          borderRadius: '12px',
          cursor: (files.length > 0 && currentUserId && currentTripId) ? 'pointer' : 'not-allowed',
          fontWeight: '900',
          fontSize: '1.1rem',
          boxShadow: (files.length > 0 && currentUserId && currentTripId) ? '0 10px 15px -3px rgba(245, 158, 11, 0.4)' : 'none'
        }}
      >
        {uploading ? 'UPLOADING...' : 'SAVE TO TRIP'}
      </button>
    </div>
  );
};

export default UploadPanel;
