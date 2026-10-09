import { publicEnv } from '@/lib/env/public';

const timeZone = publicEnv.NEXT_PUBLIC_APP_TIMEZONE;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'short' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone,
  dateStyle: 'short',
  timeStyle: 'short',
});
// en-CA formats as YYYY-MM-DD, the value format of <input type="date">.
const inputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

/** Calendar day (YYYY-MM-DD) of a season start in the app timezone. */
export function seasonStartInput(startsAt: string) {
  return inputFormatter.format(new Date(startsAt));
}

/** Seasons end at 00:00 of the day after the inclusive last day, so step back 1 ms. */
export function seasonEndInput(endsAt: string) {
  return inputFormatter.format(new Date(new Date(endsAt).getTime() - 1));
}

/** Inclusive last day of a season for display. */
export function formatSeasonEnd(endsAt: string) {
  return dateFormatter.format(new Date(new Date(endsAt).getTime() - 1));
}

export const appTimeZone = timeZone;
