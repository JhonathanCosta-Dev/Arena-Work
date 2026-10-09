import { RegisterMatchForm } from '@/features/matches/components/register-match-form';
import { requireUser } from '@/lib/auth/require-user';

export default async function NewMatchPage() {
  const { userId, profile, supabase } = await requireUser();
  const { data: opponents } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('is_active', true)
    .neq('id', userId)
    .order('name');

  return <RegisterMatchForm currentPlayerName={profile.name} opponents={opponents ?? []} />;
}
