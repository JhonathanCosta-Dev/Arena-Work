'use client';

import { useState, useTransition } from 'react';
import { confirmMatch } from '../actions/confirm-match';
import { disputeMatch } from '../actions/dispute-match';

export function PendingMatchActions({ matchId }: { matchId: string }) {
  const [pending, startTransition] = useTransition();
  const [isDisputing, setIsDisputing] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message ?? 'Não foi possível concluir a ação.');
    });
  }

  if (isDisputing) {
    return (
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium">
          O que aconteceu? <span className="text-muted-foreground">(opcional)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={2}
            className="border-border bg-background mt-2 w-full rounded-xl border px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setIsDisputing(false)}
            className="border-border rounded-xl border px-3 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => disputeMatch({ matchId, reason: reason || undefined }))}
            className="bg-warning rounded-xl px-3 py-2.5 text-sm font-black text-black disabled:opacity-50"
          >
            {pending ? 'Enviando…' : 'Enviar contestação'}
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setIsDisputing(true)}
          className="border-border text-muted-foreground rounded-xl border px-3 py-2.5 text-sm font-bold hover:text-white disabled:opacity-50"
        >
          Contestar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => confirmMatch(matchId))}
          className="bg-success rounded-xl px-3 py-2.5 text-sm font-black text-black disabled:opacity-50"
        >
          {pending ? 'Confirmando…' : 'Confirmar'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
