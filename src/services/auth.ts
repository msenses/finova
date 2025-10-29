import { supabase } from '../lib/supabaseClient';

export type SignInResult = { data: any | null; error: { code: 'user_not_found' | 'invalid_password' | 'unknown'; message: string } | null };

export async function signInWithUsernameOrEmail(identifier: string, password: string): Promise<SignInResult> {
  const id = identifier.trim();
  let email = id;

  // 1) Kullanıcı adı ya da e‑posta var mı kontrol et (user_profiles referansı üzerinden)
  if (id.includes('@')) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', id)
      .single();
    if (error || !data?.email) {
      return { data: null, error: { code: 'user_not_found', message: 'E‑posta kayıtlı değil' } };
    }
    email = data.email as string;
  } else {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('username', id)
      .single();
    if (error || !data?.email) {
      return { data: null, error: { code: 'user_not_found', message: 'Kullanıcı adı kayıtlı değil' } };
    }
    email = data.email as string;
  }

  // 2) Parola ile giriş dene
  const res = await supabase.auth.signInWithPassword({ email, password });
  if (res.error) {
    return { data: null, error: { code: 'invalid_password', message: 'Şifre uyuşmuyor' } };
  }
  return { data: res.data, error: null };
}


