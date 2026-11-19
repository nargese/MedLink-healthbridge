import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const loginAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(1024) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const email = data.email.toLowerCase();
    const locked = await supabaseAdmin.rpc('login_locked', { _email: email });
    if (locked.error) throw new Error('Connexion indisponible.');
    if (locked.data) return { session: null, message: 'Compte temporairement verrouillé après 5 tentatives échouées. Réessayez dans 15 minutes.' };
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error('Connexion indisponible.');
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      } },
    });
    const result = await client.auth.signInWithPassword({ email, password: data.password });
    const recorded = await supabaseAdmin.rpc('record_login', { _email: email, _success: !result.error });
    if (recorded.error) throw new Error('Connexion indisponible.');
    if (result.error || !result.data.session) return { session: null, message: 'Identifiants incorrects ou adresse non confirmée.' };
    return { session: { access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token }, message: null };
  });