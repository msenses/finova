import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setIsAuthed(Boolean(data.session));
      if (!cancelled) setLoading(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(Boolean(session));
    });
    void init();
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;
  if (!isAuthed) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
}


