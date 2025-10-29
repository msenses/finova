import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Status = 'checking' | 'reachable' | 'unreachable';

export function HealthCheck() {
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Ağ bağlantısını doğrulamak için Storage API'yi çağırıyoruz.
        // Anon key ile genelde yetkisiz döner; önemli olan ulaşılırlığı test etmektir.
        const { data, error } = await supabase.storage.listBuckets();

        if (cancelled) return;

        if (error || data) {
          setStatus('reachable');
          setMessage(error ? `ok (reachable, returned error: ${error.message})` : 'ok');
        } else {
          setStatus('reachable');
          setMessage('ok');
        }
      } catch (e: any) {
        if (cancelled) return;
        setStatus('unreachable');
        setMessage(e?.message ?? 'network error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const url = process.env.REACT_APP_SUPABASE_URL;
  const color = status === 'reachable' ? '#16a34a' : status === 'checking' ? '#f59e0b' : '#dc2626';

  return (
    <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 14, opacity: 0.8 }}>Supabase</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <div style={{ fontWeight: 600 }}>{status}</div>
        <div style={{ opacity: 0.8 }}>— {message}</div>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>URL: {url}</div>
    </div>
  );
}


