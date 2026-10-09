import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const requireUser = cache(async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const subject = data?.claims?.sub;
  if (error || typeof subject !== 'string') {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_path, banner_path, role, is_active')
    .eq('id', subject)
    .single();

  if (!profile?.is_active) {
    redirect('/login?error=inactive');
  }

  return { userId: subject, profile, supabase };
});
