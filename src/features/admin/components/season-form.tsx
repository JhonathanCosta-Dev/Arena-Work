'use client';

import { useActionState } from 'react';
import { saveSeasonAction } from '../actions/seasons';

type SeasonFormProps = {
  season?: { id: string; name: string; startDate: string; endDate: string };
};

const inputClass =
  'mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none ring-primary focus:ring-2';

export function SeasonForm({ season }: SeasonFormProps) {
  const [state, action, pending] = useActionState(saveSeasonAction, null);

  return (
    <form action={action} className="space-y-4">
      {season ? <input type="hidden" name="seasonId" value={season.id} /> : null}
      <label className="block text-sm font-medium">
        Nome
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={season?.name}
          placeholder="Ex.: Novembro 2026"
          className={inputClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Começa em
          <input
            name="startDate"
            type="date"
            required
            defaultValue={season?.startDate}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </label>
        <label className="block text-sm font-medium">
          Termina em <span className="text-muted-foreground">(inclusive)</span>
          <input
            name="endDate"
            type="date"
            required
            defaultValue={season?.endDate}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </label>
      </div>
      {state ? (
        <p
          role={state.ok ? 'status' : 'alert'}
          className={`text-sm ${state.ok ? 'text-success' : 'text-danger'}`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-primary w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Salvando…' : season ? 'Salvar alterações' : 'Criar temporada'}
      </button>
    </form>
  );
}
