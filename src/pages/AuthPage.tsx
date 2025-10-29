import React, { useState } from 'react';
import { signInWithUsernameOrEmail } from '../services/auth';

export default function AuthPage() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await signInWithUsernameOrEmail(id, password);
      if (error) {
        setMessage(error.message);
        return;
      }
      window.location.href = '/app';
    } catch (e: any) {
      setMessage(e?.message ?? 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #0b3a85 0%, #0c5bb5 100%)' }}>
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <img src="/finova_logo.png" alt="Finova" style={{ width: 120, height: 'auto', marginBottom: 12 }} />
        <h1 style={{ margin: 0, fontWeight: 600 }}>Finova</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>Kullanıcı adı/e‑posta ve şifre ile giriş</p>
        <form onSubmit={onSubmit} style={{ background: '#fff', color: '#0b1a33', borderRadius: 12, padding: 16, marginTop: 16, textAlign: 'left', minWidth: 320 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Kullanıcı adı veya e‑posta</div>
            <input className="form-control" value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Şifre</div>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn" type="submit" disabled={loading || !id || !password}>{loading ? 'Giriş yapılıyor...' : 'Giriş yap'}</button>
          </div>
          {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
        </form>
      </div>
    </div>
  );
}


