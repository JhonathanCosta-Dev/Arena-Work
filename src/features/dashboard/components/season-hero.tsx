import Image from 'next/image';
import Link from 'next/link';
import type { Company } from '@/features/company/server/get-company';
import { formatDate, formatSeasonEnd } from '@/lib/dates';
import { seasonProgress } from '../domain/insights';

type SeasonHeroProps = {
  company: Company;
  playerName: string;
  isAdmin: boolean;
  season: { name: string; starts_at: string; ends_at: string } | null;
};

function statusLine(progress: ReturnType<typeof seasonProgress>) {
  if (!progress.hasStarted) return 'Começa em breve';
  if (progress.hasEnded) return 'Prazo encerrado · aguardando o fechamento';
  if (progress.daysLeft <= 1) return 'Último dia!';
  return `Faltam ${progress.daysLeft} dias`;
}

function CompanyBadge({ company }: { company: Company }) {
  if (!company.name && !company.iconUrl) return null;
  return (
    <div className="mb-4 flex items-center gap-2">
      {company.iconUrl ? (
        <span className="bg-background relative size-8 overflow-hidden rounded-full">
          <Image src={company.iconUrl} alt="" fill sizes="32px" className="object-cover" />
        </span>
      ) : null}
      {company.name ? <span className="text-sm font-black">{company.name}</span> : null}
    </div>
  );
}

export function SeasonHero({ company, playerName, isAdmin, season }: SeasonHeroProps) {
  const firstName = playerName.split(' ')[0];

  if (!season) {
    return (
      <section className="border-border bg-card rounded-3xl border p-5 sm:p-7">
        <CompanyBadge company={company} />
        <p className="text-primary text-xs font-black tracking-[0.28em]">PING PONG</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Sem temporada ativa</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Olá, {firstName}. A mesa volta a valer assim que uma temporada for aberta.
        </p>
        {isAdmin ? (
          <Link
            href="/admin"
            className="bg-primary mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-black text-white"
          >
            Criar temporada
          </Link>
        ) : null}
      </section>
    );
  }

  const progress = seasonProgress(season.starts_at, season.ends_at);
  const urgent = progress.hasStarted && !progress.hasEnded && progress.daysLeft <= 3;

  return (
    <section className="border-border bg-card relative overflow-hidden rounded-3xl border p-5 sm:p-7">
      {company.bannerUrl ? (
        <>
          <Image
            src={company.bannerUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
          {/* Keeps text readable on any banner. */}
          <div
            aria-hidden="true"
            className="from-card via-card/85 to-card/40 absolute inset-0 bg-gradient-to-t"
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="bg-primary/20 pointer-events-none absolute -top-24 -right-16 size-64 rounded-full blur-3xl"
        />
      )}
      <div className="relative">
        <CompanyBadge company={company} />
        <p className="text-primary text-xs font-black tracking-[0.28em]">PING PONG · TEMPORADA</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{season.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">Olá, {firstName}. A mesa está valendo.</p>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className={`font-black ${urgent ? 'text-primary' : 'text-white'}`}>
              {statusLine(progress)}
            </span>
            <span className="text-muted-foreground">
              {formatDate(season.starts_at)} → {formatSeasonEnd(season.ends_at)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Andamento da temporada"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.elapsed * 100)}
            className="bg-background mt-2 h-2 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.max(2, progress.elapsed * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
