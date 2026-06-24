'use client';

import { useActionState } from 'react';
import { updateProfile } from './actions';

const inputCls = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors';

interface Props {
  initialName: string;
  initialUsername: string;
  email: string;
}

export function ProfileForm({ initialName, initialUsername, email }: Props) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Nombre de perfil
          <span className="ml-2 text-xs text-[var(--color-muted)] font-normal">visible para todos</span>
        </label>
        <input
          name="name"
          defaultValue={initialName}
          required
          placeholder="Tu nombre"
          className={inputCls}
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Este es el nombre que ven los demás en la plataforma.
        </p>
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Nombre de usuario
          <span className="ml-2 text-xs text-[var(--color-muted)] font-normal">@usuario</span>
        </label>
        <div className="flex items-center gap-0">
          <span className="rounded-l-lg border border-r-0 border-[var(--color-border)] bg-white/5 px-3 py-2.5 text-sm text-[var(--color-muted)] select-none">
            @
          </span>
          <input
            name="username"
            defaultValue={initialUsername}
            placeholder="tu_usuario"
            pattern="[a-z0-9_]{3,30}"
            title="Solo letras minúsculas, números y guion bajo, 3-30 caracteres"
            className={inputCls + ' rounded-l-none'}
          />
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Solo letras minúsculas, números y _ · 3 a 30 caracteres.
        </p>
      </div>

      {/* Email — solo lectura */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Correo electrónico
          <span className="ml-2 text-xs text-[var(--color-muted)] font-normal">no editable</span>
        </label>
        <input
          value={email}
          readOnly
          className={inputCls + ' opacity-50 cursor-not-allowed'}
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          El correo viene de tu cuenta de Google y no se puede cambiar aquí.
        </p>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {state && (
          <p className={`text-sm ${state.ok ? 'text-green-400' : 'text-red-400'}`}>
            {state.ok ? '✓ ' : '⚠ '}{state.text}
          </p>
        )}
      </div>
    </form>
  );
}
