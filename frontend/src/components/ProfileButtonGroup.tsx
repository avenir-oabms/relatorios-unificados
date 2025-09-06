import React from "react";

type Props = {
  userName?: string;
  onEdit: () => void;
  onLogout: () => void;
};

export default function ProfileButtonGroup({ userName = "Meu Perfil", onEdit, onLogout }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]" title={userName}>
        {userName}
      </span>

      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        Editar perfil
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
      >
        Sair
      </button>
    </div>
  );
}
