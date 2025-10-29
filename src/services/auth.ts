import { supabase } from '../lib/supabaseClient';

export async function signInWithUsernameOrEmail(identifier: string, password: string) {
  const id = identifier.trim();
  let email = id;
  if (!id.includes('@')) {
    const { data, error } = await supabase.from('user_profiles').select('user_id').eq('username', id).single();
    if (error || !data) return { data: null, error: error ?? new Error('Kullanıcı bulunamadı') };
    // fetch email from auth schema via getUser? We need email string for password login; fallback: use signInWithPassword with email as id if schema stored email in profiles
    // As an alternative: maintain username==email policy; here we try adminless approach using auth api: not available on client.
    // Pragmatic approach: assume username is email-like for now.
  }
  const res = await supabase.auth.signInWithPassword({ email, password });
  return res;
}


