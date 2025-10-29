import { supabase } from '../lib/supabaseClient';

export type SignInResult = { data: any | null; error: { code: 'user_not_found' | 'invalid_password' | 'unknown'; message: string } | null };

export async function signInWithUsernameOrEmail(identifier: string, password: string): Promise<SignInResult> {
  const id = identifier.trim();
  let email = id;

  // Eğer e‑posta verildiyse önce direkt giriş deneriz; başarısızsa profilden varlığını kontrol ederiz
  if (id.includes('@')) {
    const res = await supabase.auth.signInWithPassword({ email: id, password });
    if (!res.error) return { data: res.data, error: null };
    // Başarısızsa email user_profiles'ta var mı kontrol et → daha iyi hata
    const { data: p, error: pe } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', id)
      .single();
    if (pe || !p?.email) return { data: null, error: { code: 'user_not_found', message: 'E‑posta kayıtlı değil' } };
    return { data: null, error: { code: 'invalid_password', message: 'Şifre uyuşmuyor' } };
  } else {
    // Kullanıcı adı → profilden email bul, sonra giriş dene
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('username', id)
      .single();
    if (error || !data?.email) {
      return { data: null, error: { code: 'user_not_found', message: 'Kullanıcı adı kayıtlı değil' } };
    }
    email = data.email as string;
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) return { data: null, error: { code: 'invalid_password', message: 'Şifre uyuşmuyor' } };
    return { data: res.data, error: null };
  }
}


