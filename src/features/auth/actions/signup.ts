'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { createAdminClient } from '@/lib/supabase/admin';

const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(72),
});

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) redirect('/login?mode=signup&error=invalid');

  // Created through the Auth Admin API so no confirmation e-mail is needed (the project's default
  // mailer only reaches team members). The profile trigger still creates it inactive: access is
  // granted only when an admin approves it in /admin.
  const { error } = await createAdminClient().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name },
  });

  // An existing e-mail gets the same answer as a new one, so the form doesn't reveal who is registered.
  if (error && error.code !== 'email_exists') {
    logger.warn('auth.signup_failed', { code: error.code ?? null });
    const reason = error.code === 'weak_password' ? 'weak' : 'failed';
    redirect(`/login?mode=signup&error=${reason}`);
  }

  redirect('/login?status=pending');
}
