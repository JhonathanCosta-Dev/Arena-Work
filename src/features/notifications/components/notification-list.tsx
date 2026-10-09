'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import {
  BellRing,
  CircleCheckBig,
  ChevronRight,
  Scale,
  ShieldAlert,
  Smile,
  type LucideIcon,
} from 'lucide-react';
import { ConfirmMatchDialog } from '@/features/matches/components/confirm-match-dialog';
import { formatDateTime } from '@/lib/dates';
import { markAllNotificationsRead, markNotificationRead } from '../actions/mark-read';
import type { AppNotification } from '../server/get-notifications';

const icons: Record<string, { icon: LucideIcon; tone: string }> = {
  match_confirmation_requested: { icon: BellRing, tone: 'text-warning bg-warning/10' },
  match_confirmed: { icon: CircleCheckBig, tone: 'text-success bg-success/10' },
  match_disputed: { icon: ShieldAlert, tone: 'text-danger bg-danger/10' },
  bad_loser_cleared: { icon: Smile, tone: 'text-success bg-success/10' },
  match_draw_pending: { icon: Scale, tone: 'text-warning bg-warning/10' },
};

function Row({ notification }: { notification: AppNotification }) {
  const { icon: Icon, tone } = icons[notification.type] ?? icons.match_confirmation_requested!;
  const unread = !notification.readAt;
  const awaitingAnswer =
    notification.type === 'match_confirmation_requested' &&
    notification.match?.status === 'pending_confirmation';

  return (
    <span className="flex w-full items-start gap-3 text-left">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${unread ? 'font-black' : 'font-bold'}`}>
            {notification.title}
          </span>
          {unread ? (
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-label="não lida" />
          ) : null}
        </span>
        <span className="text-muted-foreground block text-xs leading-5">{notification.body}</span>
        <span className="mt-1 flex items-center gap-2">
          <time dateTime={notification.createdAt} className="text-muted-foreground text-[11px]">
            {formatDateTime(notification.createdAt)}
          </time>
          {awaitingAnswer ? (
            <span className="bg-primary rounded-full px-2 py-0.5 text-[10px] font-black text-white">
              Responder
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="text-muted-foreground mt-3 size-4 shrink-0" aria-hidden="true" />
    </span>
  );
}

const rowClass =
  'border-border bg-card hover:bg-card-elevated block w-full rounded-2xl border p-4 transition active:scale-[.99]';

export function NotificationList({
  notifications,
  userId,
}: {
  notifications: AppNotification[];
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.readAt);

  if (!notifications.length) {
    return <p className="text-muted-foreground text-sm">Nada por aqui ainda.</p>;
  }

  return (
    <div className="space-y-4">
      {hasUnread ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => markAllNotificationsRead())}
            className="text-muted-foreground text-xs font-bold hover:text-white disabled:opacity-50"
          >
            Marcar todas como lidas
          </button>
        </div>
      ) : null}
      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li key={notification.id}>
            {notification.match ? (
              <ConfirmMatchDialog
                match={notification.match}
                currentUserId={userId}
                notificationId={notification.readAt ? undefined : notification.id}
                triggerClassName={rowClass}
              >
                <Row notification={notification} />
              </ConfirmMatchDialog>
            ) : (
              <Link
                href={`/players/${userId}`}
                onClick={() => {
                  if (!notification.readAt) void markNotificationRead(notification.id);
                }}
                className={rowClass}
              >
                <Row notification={notification} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
