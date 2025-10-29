import { supabase } from '../lib/supabaseClient';

export async function signInWithUsernameOrEmail(identifier: string, password: string) {
  const id = identifier.trim();
  let email = id;
  if (!id.includes('@')) {
    // username ile giriş: user_profiles'tan email çek
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('username', id)
      .single();
    if (error || !data?.email) {
      return { data: null, error: error ?? new Error('Kullanıcı adı için e-posta eşlemesi bulunamadı') };
    }
    email = data.email as string;
  }
  return await supabase.auth.signInWithPassword({ email, password });
}


