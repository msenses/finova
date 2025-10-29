import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSessionEmail(data.session?.user?.email ?? null);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });

    void init();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async () => {
    setLoading(true);
    setMessage('');
    try {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });
      if (error) throw error;
      setMessage('Giriş bağlantısı e‑posta adresinize gönderildi.');
    } catch (e: any) {
      setMessage(e?.message ?? 'Beklenmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMessage('Çıkış yapıldı.');
    } catch (e: any) {
      setMessage(e?.message ?? 'Beklenmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  if (sessionEmail) {
    return (
      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: 8 }}>Oturum: {sessionEmail}</div>
        <button onClick={signOut} disabled={loading}>
          {loading ? 'Çıkış yapılıyor...' : 'Çıkış yap'}
        </button>
        {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>E‑posta ile giriş</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          placeholder="ornek@firma.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', minWidth: 240 }}
        />
        <button onClick={sendMagicLink} disabled={loading || !email}>
          {loading ? 'Gönderiliyor...' : 'Giriş bağlantısı gönder'}
        </button>
      </div>
      {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
    </div>
  );
}


