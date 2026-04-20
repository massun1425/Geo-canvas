import React, { useState } from 'react';
import axios from 'axios';

const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await axios.post(`http://${window.location.hostname}:8080/api/users/login`, {
          email, password
        });
        onLoginSuccess(res.data);
      } else {
        const res = await axios.post(`http://${window.location.hostname}:8080/api/users/`, {
          username, email, password
        });
        onLoginSuccess(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || "ログインに失敗しました");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '340px' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 30px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <input 
              type="text" placeholder="ユーザー名" required value={username} onChange={e => setUsername(e.target.value)}
              style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', background: 'rgba(255,255,255,0.8)' }}
            />
          )}
          <input 
            type="email" placeholder="メールアドレス" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', background: 'rgba(255,255,255,0.8)' }}
          />
          <input 
            type="password" placeholder="パスワード" required value={password} onChange={e => setPassword(e.target.value)}
            style={{ padding: '14px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', background: 'rgba(255,255,255,0.8)' }}
          />
          <button type="submit" style={{ 
            padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', 
            cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px',
            boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)'
          }}>
            {isLogin ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
          >
            {isLogin ? '新規登録はこちらから →' : '← 既存のアカウントでログイン'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
