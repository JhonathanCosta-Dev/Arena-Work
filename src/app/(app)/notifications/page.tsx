import { NotificationList } from '@/features/notifications/components/notification-list';
import { getNotifications } from '@/features/notifications/server/get-notifications';
import { requireUser } from '@/lib/auth/require-user';

export default async function NotificationsPage() {
  const { userId, supabase } = await requireUser();
  const notifications = await getNotifications(supabase, userId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-primary text-xs font-black tracking-[0.28em]">NOTIFICAÇÕES</p>
        <h1 className="mt-2 text-3xl font-black">Sua atividade</h1>
      </div>
      <NotificationList notifications={notifications} userId={userId} />
    </div>
  );
}
