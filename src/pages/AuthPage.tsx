import React from 'react';
import { AuthPanel } from '../components/AuthPanel';

export default function AuthPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #0b3a85 0%, #0c5bb5 100%)' }}>
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <img src="/finova_logo.png" alt="Finova" style={{ width: 120, height: 'auto', marginBottom: 12 }} />
        <h1 style={{ margin: 0, fontWeight: 600 }}>Finova</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>Giriş yap</p>
        <div style={{ background: '#fff', color: '#0b1a33', borderRadius: 12, padding: 16, marginTop: 16 }}>
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}


