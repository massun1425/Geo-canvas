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
      alert(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '50px 40px', width: '380px' }}>
        <h2 style={{ 
          textAlign: 'center', margin: '0 0 35px 0', fontSize: '2.4rem', 
          fontWeight: '900', color: 'var(--text-main)', lineHeight: '1.1' 
        }}>
          {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <input 
              type="text" placeholder="USERNAME" required value={username} onChange={e => setUsername(e.target.value)}
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '16px', background: 'rgba(255,255,255,0.6)' }}
            />
          )}
          <input 
            type="email" placeholder="EMAIL" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '16px', background: 'rgba(255,255,255,0.6)' }}
          />
          <input 
            type="password" placeholder="PASSWORD" required value={password} onChange={e => setPassword(e.target.value)}
            style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '16px', background: 'rgba(255,255,255,0.6)' }}
          />
          <button type="submit" style={{ 
            padding: '16px', background: 'var(--primary)', color: 'var(--text-main)', border: 'none', borderRadius: '12px', 
            cursor: 'pointer', fontWeight: '800', fontSize: '18px', marginTop: '10px',
            boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.4)'
          }}>
            {isLogin ? 'LOGIN' : 'SIGN UP'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto' }}
          >
            {isLogin ? (
              <>NEW HERE? CREATE ACCOUNT <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"/></svg></>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m400-240-240-240 240-240 56 58-142 142h486v80H274l142 142-56 58Z"/></svg> BACK TO LOGIN</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
