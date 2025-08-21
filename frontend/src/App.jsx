import { useState } from 'react';
import axios from 'axios';
import Chat from './Chat';

async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportPublicKeyToPem(key) {
  const spki = await window.crypto.subtle.exportKey('spki', key);
  const b64 = window.btoa(String.fromCharCode(...new Uint8Array(spki)));
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');
  const [loggedInUser, setLoggedInUser] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const pageCenter = {
    minHeight: '100vh',
    width: '100%',
    display: 'grid',
    placeItems: 'center',
  };

  const card = {
    width: 380,
    padding: '20px',
    borderRadius: 12,
    background: '#14171a',
    border: '1px solid #222a33',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  };

  const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #2a3642',
    background: '#0f1318',
    color: '#eaecef',
    outline: 'none',
    marginBottom: '12px',
  };

  const btn = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #2a3642',
    background: '#1b232c',
    color: '#eaecef',
    cursor: 'pointer',
  };

  const handleRegister = async () => {
    try {
      const res = await axios.post(`${API_BASE}/register`, { username, password });
      setMessage(`Registered as ${res.data.username}`);
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Registration failed');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE}/login`, { username, password });
      const { access_token } = res.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      setLoggedInUser(username);
      setMessage('Logged in successfully');

      const keyPair = await generateKeyPair();
      window.myPrivateKey = keyPair.privateKey;
      const publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);
      await axios.post(`${API_BASE}/public_key`, { username, public_key: publicKeyPem });
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Login failed');
    }
  };

  const handleLogout = () => {
    setToken('');
    setLoggedInUser('');
    localStorage.removeItem('token');
    setMessage('Logged out');
  };

  if (token) {
    // Logged-in view: center the chat card (and put a small Logout above it)
    return (
      <div style={pageCenter}>
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <button onClick={handleLogout} style={{ ...btn, width: 120 }}>Logout</button>
          {/* Chat component has its own dark card styling */}
          <Chat username={loggedInUser} />
        </div>
      </div>
    );
  }

  // Auth view: centered dark card
  return (
    <div style={pageCenter}>
      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Encrypted Chat App – Auth</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleRegister} style={btn}>Register</button>
          <button onClick={handleLogin} style={btn}>Login</button>
        </div>

        <p style={{ marginTop: 12, color: '#9fb3c8' }}>{message}</p>
      </div>
    </div>
  );
}

export default App;
