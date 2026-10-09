import Link from 'next/link';
import { ArenaWorkLogo } from '@/components/brand/arena-work-logo';
import { loginAction } from '@/features/auth/actions/login';
import { signupAction } from '@/features/auth/actions/signup';

const inputClass =
  'mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-base outline-none ring-primary focus:ring-2';

const loginErrors: Record<string, string> = {
  inactive: 'Seu acesso ainda não foi liberado ou foi desativado. Fale com um administrador.',
};

const signupErrors: Record<string, string> = {
  invalid: 'Confira os dados: nome com 2+ letras, e-mail válido e senha com 8+ caracteres.',
  weak: 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  failed: 'Não foi possível criar a conta agora. Tente novamente.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; status?: string }>;
}) {
  const { error, mode, status } = await searchParams;
  const isSignup = mode === 'signup';
  const message = error
    ? isSignup
      ? (signupErrors[error] ?? signupErrors.failed)
      : (loginErrors[error] ?? 'Não foi possível entrar. Confira e-mail e senha.')
    : null;

  return (
    <main className="bg-background grid min-h-dvh place-items-center px-4 py-10">
      <section className="border-border bg-card w-full max-w-sm rounded-3xl border p-6 shadow-2xl shadow-black/40 sm:p-8">
        <ArenaWorkLogo priority className="mx-auto mb-8 h-auto w-44" />
        <h1 className="text-3xl font-black tracking-tight">
          {isSignup ? 'Crie sua conta.' : 'Entre na competição.'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {isSignup
            ? 'Depois do cadastro, um administrador libera o seu acesso.'
            : 'Acesso exclusivo para funcionários autorizados.'}
        </p>

        <nav
          aria-label="Acesso"
          className="bg-background mt-8 grid grid-cols-2 gap-1 rounded-xl p-1"
        >
          <Link
            href="/login"
            aria-current={isSignup ? undefined : 'page'}
            className={`rounded-lg py-2 text-center text-sm font-bold ${isSignup ? 'text-muted-foreground hover:text-white' : 'bg-card-elevated text-white'}`}
          >
            Entrar
          </Link>
          <Link
            href="/login?mode=signup"
            aria-current={isSignup ? 'page' : undefined}
            className={`rounded-lg py-2 text-center text-sm font-bold ${isSignup ? 'bg-card-elevated text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            Criar conta
          </Link>
        </nav>

        {status === 'pending' ? (
          <p
            role="status"
            className="border-warning/40 bg-warning/10 text-warning mt-6 rounded-xl border p-3 text-sm leading-6"
          >
            Cadastro recebido! Seu acesso está aguardando aprovação de um administrador.
          </p>
        ) : null}

        {isSignup ? (
          <form action={signupAction} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Nome
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Senha
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                className={inputClass}
              />
            </label>
            {message ? (
              <p role="alert" className="text-danger text-sm">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              className="bg-primary text-primary-foreground w-full rounded-xl px-4 py-3.5 text-sm font-black transition hover:brightness-110"
            >
              Criar conta
            </button>
          </form>
        ) : (
          <form action={loginAction} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium">
              Senha
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </label>
            {message ? (
              <p role="alert" className="text-danger text-sm">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              className="bg-primary text-primary-foreground w-full rounded-xl px-4 py-3.5 text-sm font-black transition hover:brightness-110"
            >
              Entrar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
