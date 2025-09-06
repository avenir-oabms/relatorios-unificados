import React, { useEffect, useRef, useState } from "react";
import { Edit3, LogOut, MoreVertical } from "lucide-react";

type Props = {
  userName?: string;
  onEdit: () => void;
  onLogout: () => void;
};

export default function ProfileButtonGroup({ userName = "Meu Perfil", onEdit, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
      <span
        style={{
          fontSize: ".95rem",
          fontWeight: 600,
          color: "white",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 160,
        }}
        title={userName}
      >
        {userName}
      </span>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Opções"
        style={{
          height: 28,
          width: 28,
          display: "grid",
          placeItems: "center",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,.2)",
          background: "transparent",
          color: "white",
          cursor: "pointer",
        }}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: 34,
            right: 0,
            background: "white",
            color: "#111827",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
            border: "1px solid #e5e7eb",
            minWidth: 200,
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: ".9rem",
            }}
          >
            <Edit3 size={16} />
            Editar perfil
          </button>
          <div style={{ height: 1, background: "#f3f4f6" }} />
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: ".9rem",
              color: "#b91c1c",
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
