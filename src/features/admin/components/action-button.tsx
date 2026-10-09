'use client';

import { useActionState, useState } from 'react';
import type { ActionState } from '../actions/action-state';

type ActionButtonProps = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  /** When set, the first click asks for confirmation with this text. */
  confirmLabel?: string;
  variant?: 'primary' | 'success' | 'danger' | 'ghost';
};

const variants = {
  primary: 'bg-primary text-white',
  success: 'bg-success text-black',
  danger: 'border border-danger/60 text-danger hover:bg-danger/10',
  ghost: 'border border-border text-muted-foreground hover:text-white',
};

export function ActionButton({
  action,
  fields,
  label,
  pendingLabel = 'Aguarde…',
  confirmLabel,
  variant = 'ghost',
}: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [isConfirming, setIsConfirming] = useState(false);
  const needsConfirm = Boolean(confirmLabel) && !isConfirming;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (needsConfirm) {
          event.preventDefault();
          setIsConfirming(true);
        }
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="flex gap-2">
        {isConfirming ? (
          <button
            type="button"
            onClick={() => setIsConfirming(false)}
            className="border-border text-muted-foreground rounded-lg border px-3 py-2 text-xs font-bold"
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg px-3 py-2 text-xs font-black disabled:opacity-50 ${variants[variant]}`}
        >
          {pending ? pendingLabel : isConfirming ? confirmLabel : label}
        </button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-danger max-w-56 text-right text-xs">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
