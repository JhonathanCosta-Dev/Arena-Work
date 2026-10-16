'use client';

import { useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { registerMatch } from '../actions/register-match';
import { POINTS_TO_WIN_OPTIONS, validateGameScore } from '../domain/score';
import { createMatchSchema, type CreateMatchInput } from '../schemas/create-match';

type Opponent = { id: string; name: string };

function outcomeLine(pointsToWin: number, self: number, opponent: number, rival: string) {
  try {
    const winner = validateGameScore(pointsToWin, self, opponent);
    return winner === 'playerA'
      ? `Você venceu ${self}×${opponent}`
      : `${rival} venceu ${opponent}×${self}`;
  } catch {
    return null;
  }
}

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
      pointsToWin: 11,
    },
  });

  const [opponentId, pointsToWin, scoreSelf, scoreOpponent] = useWatch({
    control: form.control,
    name: ['opponentId', 'pointsToWin', 'scoreSelf', 'scoreOpponent'],
  });
  const rivalName = opponents.find((opponent) => opponent.id === opponentId)?.name ?? 'Adversário';
  const outcome = outcomeLine(pointsToWin, scoreSelf, scoreOpponent, rivalName);

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
      <h1 className="mt-2 text-3xl font-black">Resultado do jogo</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Registre cada jogo separado, com os pontos. Vale jogo de 11 ou 21, com 2 de diferença. O
        adversário aceita e só então entra no ranking.
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

        <fieldset className="mt-6">
          <legend className="text-sm font-bold">Jogo até</legend>
          <div className="bg-background mt-2 grid grid-cols-2 gap-1 rounded-xl p-1">
            {POINTS_TO_WIN_OPTIONS.map((option) => (
              <label
                key={option}
                className="has-[:checked]:bg-card-elevated text-muted-foreground has-[:focus-visible]:ring-primary cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-bold has-[:checked]:text-white has-[:focus-visible]:ring-2"
              >
                {/* Controlled: RHF hands radio values back as strings, and the schema wants 11 | 21. */}
                <input
                  type="radio"
                  name="pointsToWin"
                  value={option}
                  checked={pointsToWin === option}
                  onChange={() => form.setValue('pointsToWin', option, { shouldValidate: true })}
                  className="sr-only"
                />
                {option} pontos
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div>
            <div className="truncate text-sm font-bold">{currentPlayerName}</div>
            <input
              aria-label={`Pontos de ${currentPlayerName}`}
              inputMode="numeric"
              placeholder="0"
              {...form.register('scoreSelf', { valueAsNumber: true })}
              className="border-border bg-background mt-3 w-full rounded-2xl border py-5 text-center font-mono text-4xl font-black"
            />
          </div>
          <div className="text-muted-foreground pt-8 font-mono text-xl">×</div>
          <div>
            <div className="truncate text-sm font-bold">{rivalName}</div>
            <input
              aria-label="Pontos do adversário"
              inputMode="numeric"
              placeholder="0"
              {...form.register('scoreOpponent', { valueAsNumber: true })}
              className="border-border bg-background mt-3 w-full rounded-2xl border py-5 text-center font-mono text-4xl font-black"
            />
          </div>
        </div>

        {outcome ? (
          <p role="status" className="text-success mt-4 text-center text-sm font-bold">
            {outcome}
          </p>
        ) : null}
        {form.formState.errors.scoreSelf ? (
          <p className="text-danger mt-4 text-sm">{form.formState.errors.scoreSelf.message}</p>
        ) : null}
        {form.formState.errors.scoreOpponent ? (
          <p className="text-danger mt-2 text-sm">
            {form.formState.errors.scoreOpponent.message}
          </p>
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
