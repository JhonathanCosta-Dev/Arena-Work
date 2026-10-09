import 'server-only';

import { notFound } from 'next/navigation';
import { requireUser } from './require-user';

export async function requireAdmin() {
  const context = await requireUser();
  if (context.profile.role !== 'admin') notFound();
  return context;
}
