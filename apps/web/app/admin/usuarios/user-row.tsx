'use client';

import { useState } from 'react';
import { changeRole, updateUserName, deleteUser } from './actions';

type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

interface Props {
  userId: string;
  currentRole: UserRole;
  currentName: string | null;
  email: string;
}

export function UserRow({ userId, currentRole, currentName, email }: Props) {
  const [role, setRole]           = useState<UserRole>(currentRole);
  const [name, setName]           = useState(currentName ?? '');
  const [editingName, setEditing] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [roleMsg, setRoleMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [nameMsg, setNameMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [delMsg, setDelMsg]         = useState<string | null>(null);

  async function handleRoleSave() {
    setSavingRole(true);
    setRoleMsg(null);
    const fd = new FormData();
    fd.append('userId', userId);
    fd.append('role', role);
    const result = await changeRole(fd);
    setRoleMsg(result);
    setSavingRole(false);
    if (result.ok) setTimeout(() => setRoleMsg(null), 3000);
  }

  async function handleDelete() {
    setDeleting(true);
    setDelMsg(null);
    const fd = new FormData();
    fd.append('userId', userId);
    const result = await deleteUser(fd);
    if (!result.ok) {
      setDelMsg(result.text);
      setDeleting(false);
      setConfirmDel(false);
    }
    // Si ok=true la página se revalida sola y la fila desaparece
  }

  async function handleNameSave() {
    setSavingName(true);
    setNameMsg(null);
    const fd = new FormData();
    fd.append('userId', userId);
    fd.append('name', name);
    const result = await updateUserName(fd);
    setNameMsg(result);
    setSavingName(false);
    if (result.ok) { setEditing(false); setTimeout(() => setNameMsg(null), 3000); }
  }

  return (
    <>
      {/* Nombre editable */}
      <td className="px-4 py-3 align-middle">
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
              <button
                onClick={handleNameSave}
                disabled={savingName}
                className="rounded bg-[var(--color-accent)] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
              >
                {savingName ? '…' : '✓'}
              </button>
              <button onClick={() => setEditing(false)} className="text-[var(--color-muted)] text-xs">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <p className="font-medium text-sm">{name || '—'}</p>
              <button
                onClick={() => setEditing(true)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-all"
                title="Editar nombre"
              >
                ✏
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--color-muted)]">{email}</p>
          {nameMsg && (
            <p className={`text-[10px] mt-0.5 ${nameMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {nameMsg.ok ? '✓ ' : '⚠ '}{nameMsg.text}
            </p>
          )}
        </div>
      </td>

      {/* Rol */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <select
            value={role}
            onChange={e => { setRole(e.target.value as UserRole); setRoleMsg(null); }}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
          >
            <option value="USER">USER</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            onClick={handleRoleSave}
            disabled={savingRole}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {savingRole ? '…' : 'Guardar'}
          </button>
        </div>
        {roleMsg && (
          <p className={`text-[10px] mt-1 ${roleMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {roleMsg.ok ? '✓ ' : '⚠ '}{roleMsg.text}
          </p>
        )}
      </td>

      {/* Eliminar */}
      <td className="px-4 py-3 align-middle">
        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            title="Eliminar usuario"
            className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Eliminar
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-red-400 font-medium">¿Confirmar?</p>
            <div className="flex gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '…' : 'Sí, borrar'}
              </button>
              <button
                onClick={() => { setConfirmDel(false); setDelMsg(null); }}
                className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:bg-white/5"
              >
                No
              </button>
            </div>
            {delMsg && <p className="text-[10px] text-red-400">⚠ {delMsg}</p>}
          </div>
        )}
      </td>
    </>
  );
}
