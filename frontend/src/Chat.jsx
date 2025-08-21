import { useEffect, useState, useRef } from 'react';
import {
  generateAESKey,
  exportAESKey,
  importRSAPublicKey,
  encryptAESKeyWithRSA,
  bufferToBase64,
  encryptMessageWithAES,
  decryptMessageWithAES,
} from './cryptoUtils';
import axios from 'axios';

function Chat({ username }) {
  const [ws, setWs] = useState(null);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [aesKey, setAesKey] = useState(null);
  const [recipient, setRecipient] = useState('');
  const chatEndRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  const WS_BASE  = API_BASE.replace(/^http/i, 'ws'); // http->ws, https->wss

  useEffect(() => {
    if (!username) return;
    const socket = new WebSocket(`${WS_BASE}/ws/${username}`);

    socket.onopen = () => { setWs(socket); };
    socket.onmessage = async (event) => {
      const data = event.data;

      if (data.startsWith('[KEY] ')) {
        const encryptedKeyB64 = data.slice(6);
        try {
          const encryptedBytes = Uint8Array.from(atob(encryptedKeyB64), c => c.charCodeAt(0));
          const decryptedAES = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            window.myPrivateKey,
            encryptedBytes
          );
          const importedKey = await window.crypto.subtle.importKey(
            'raw',
            decryptedAES,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          );
          window.myAESKey = importedKey;
          setAesKey(importedKey);
          setChat((prev) => [...prev, 'Session key received.']);
        } catch (err) {
          setChat((prev) => [...prev, 'Make sure users have added each other in both windows. If both session keys recieved, start messaging!']);
        }
        return;
      }

      const match = data.match(/^\[Encrypted\] (\w+):\s+(.+)$/);
      if (!match) { setChat((p) => [...p, data]); return; }

      const sender = match[1];
      const encryptedB64 = match[2];
      try {
        const text = await decryptMessageWithAES(window.myAESKey, encryptedB64);
        setChat((p) => [...p, `${sender}: ${text}`]);
      } catch {
        setChat((p) => [...p, `${sender}: [Decryption Error]`]);
      }
    };

    socket.onclose = () => { setWs(null); };
    return () => { try { socket.close(); } catch {} };
  }, [username]);

  const handleAddRecipient = async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) { alert('Still connecting…'); return; }
    const name = prompt('Enter recipient username:');
    if (!name) return;

    try {
      const key = await generateAESKey();
      setAesKey(key);
      window.myAESKey = key;

      const aesBytes = await exportAESKey(key);
      const res = await axios.get(`${API_BASE}/public_key/${name}`);
      const recipientPem = res.data.public_key;

      const recipientKey = await importRSAPublicKey(recipientPem);
      const encryptedAES = await encryptAESKeyWithRSA(aesBytes, recipientKey);
      const encryptedAESB64 = bufferToBase64(encryptedAES);

      ws.send(`[KEY] ${encryptedAESB64}`);
      setRecipient(name);
      setChat((p) => [...p, `Recipient set to "${name}". Shared a new session key.`]);
    } catch (err) {
      setChat((p) => [...p, 'Could not set recipient / share key.']);
    }
  };

  const sendMessage = async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!aesKey) { alert('Add a recipient first to share a session key.'); return; }
    if (!message.trim()) return;

    const encrypted = await encryptMessageWithAES(aesKey, message);
    ws.send(encrypted);
    setMessage('');
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // — visuals —
  const shell = {
    width: 680,
    padding: '16px',
    borderRadius: 12,
    background: '#14171a',
    border: '1px solid #222a33',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  };
  const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 };
  const info = { color: '#9fb3c8', fontSize: 14 };
  const chatBox = {
    height: 380,
    border: '1px solid #222a33',
    borderRadius: 8,
    background: '#0f1318',
    color: '#eaecef',
    padding: '12px',
    overflowY: 'auto',
    marginBottom: 12,
  };
  const row = { display: 'flex', gap: 8 };
  const inputStyle = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #2a3642',
    background: '#0f1318',
    color: '#eaecef',
    outline: 'none',
  };
  const btn = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #2a3642',
    background: '#1b232c',
    color: '#eaecef',
    cursor: 'pointer',
  };
  const smallBtn = { ...btn, padding: '8px 12px', fontSize: 14 };

  return (
    <div style={shell}>
      <div style={header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Welcome, {username}</div>
          <div style={info}>
            {aesKey ? 'Secure session ready' : 'No session key yet. Cannot send message until recipients added each other'}{recipient ? ` • recipient: ${recipient}` : ''}
          </div>
        </div>
        <button style={smallBtn} onClick={handleAddRecipient}>Add recipient</button>
      </div>

      <div style={chatBox}>
        {chat.map((msg, i) => (<div key={i} style={{ marginBottom: 6 }}>{msg}</div>))}
        <div ref={chatEndRef} />
      </div>

      <div style={row}>
        <input
          type="text"
          placeholder={aesKey ? 'Type your message…' : 'Add a recipient to start'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={inputStyle}
        />
        <button style={btn} onClick={sendMessage} disabled={!aesKey || !ws}>Send</button>
      </div>
    </div>
  );
}

export default Chat;
