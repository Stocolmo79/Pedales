"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          className="rounded-lg border border-black/[.08] bg-transparent px-3 py-2 outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
