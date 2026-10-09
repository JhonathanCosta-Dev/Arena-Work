'use client';

import { useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { registerMatch } from '../actions/register-match';
import { createMatchSchema, type CreateMatchInput } from '../schemas/create-match';

type Opponent = { id: string; name: string };

export function RegisterMatchForm({
  currentPlayerName,
  opponents,
}: {
  currentPlayerName: string;
  opponents: Opponent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateMatchInput>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      requestId: crypto.randomUUID(),
      opponentId: '',
      scoreSelf: 2,
      scoreOpponent: 1,
    },
  });

  const opponentId = useWatch({
    control: form.control,
    name: 'opponentId',
  });

  function submit(values: CreateMatchInput) {
    form.clearErrors('root');
    startTransition(async () => {
      const result = await registerMatch(values);
      if (!result.ok) {
        form.setError('root', { message: result.message });
        return;
      }
      router.push('/matches?registered=1');
    });
  }

  return (
    <section className="mx-auto max-w-xl">
      <p className="text-primary text-xs font-black tracking-[0.28em]">REGISTRAR</p>
      <h1 className="mt-2 text-3xl font-black">Resultado da mesa</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Você registra. O adversário confirma. Só então entra no ranking.
      </p>

      <form
        onSubmit={form.handleSubmit(submit)}
        className="border-border bg-card mt-8 rounded-3xl border p-5 sm:p-7"
      >
        <label className="text-sm font-bold">
          Adversário
          <select
            {...form.register('opponentId')}
            className="border-border bg-background mt-2 w-full rounded-xl border px-3 py-3 text-base"
          >
            <option value="">Selecione...</option>
            {opponents.map((opponent) => (
              <option key={opponent.id} value={opponent.id}>
                {opponent.name}
              </option>
            ))}
          </select>
        </label>
        {form.formState.errors.opponentId ? (
          <p className="text-danger mt-2 text-sm">{form.formState.errors.opponentId.message}</p>
        ) : null}

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div>
            <div className="truncate text-sm font-bold">{currentPlayerName}</div>
            <input
              aria-label={`Sets de ${currentPlayerName}`}
              inputMode="numeric"
              {...form.register('scoreSelf', { valueAsNumber: true })}
              className="border-border bg-background mt-3 w-full rounded-2xl border py-5 text-center font-mono text-4xl font-black"
            />
          </div>
          <div className="text-muted-foreground pt-8 font-mono text-xl">×</div>
          <div>
            <div className="truncate text-sm font-bold">
              {opponents.find((opponent) => opponent.id === opponentId)?.name ?? 'Adversário'}
            </div>
            <input
              aria-label="Sets do adversário"
              inputMode="numeric"
              {...form.register('scoreOpponent', { valueAsNumber: true })}
              className="border-border bg-background mt-3 w-full rounded-2xl border py-5 text-center font-mono text-4xl font-black"
            />
          </div>
        </div>

        {form.formState.errors.scoreSelf ? (
          <p className="text-danger mt-4 text-sm">{form.formState.errors.scoreSelf.message}</p>
        ) : null}
        {form.formState.errors.root ? (
          <p role="alert" className="text-danger mt-5 text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !opponentId}
          className="bg-primary mt-6 w-full rounded-xl px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Registrando…' : 'Registrar e solicitar confirmação'}
        </button>
      </form>
    </section>
  );
}
