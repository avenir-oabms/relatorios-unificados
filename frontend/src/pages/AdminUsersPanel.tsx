import { useEffect, useMemo, useState } from "react";
import { Users, Edit, Trash2, RotateCcw, Plus } from "lucide-react";

const API_BASE = "http://192.168.0.64:5055";

type UserRole =
  | "admin"
  | "tecnico"
  | "usuario"
  | "gerente"
  | "coordenador"
  | "diretor"
  | string;

type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: "Ativo" | "Inativo" | string;
  created_at?: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  tecnico: "#3b82f6",
  usuario: "#6b7280",
  gerente: "#f59e0b",
  coordenador: "#10b981",
  diretor: "#fb923c",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  usuario: "Usuário",
  gerente: "Gerente",
  coordenador: "Coordenador",
  diretor: "Diretor",
};

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        background: color + "20",
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

export default function AdminUsersPanel() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // modal simples de criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "usuario" as UserRole });

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      "Content-Type": "application/json",
    }),
    []
  );

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== CORRIGIDO: aceita array direto OU { users: [...] } / { results: [...] } e normaliza =====
  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const raw: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.results)
        ? data.results
        : [];

      const normalized: User[] = raw.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status:
          u.status === "Ativo" ||
          u.active === 1 ||
          u.active === true
            ? "Ativo"
            : "Inativo",
        created_at: u.created_at ?? u.createdAt ?? null,
      }));

      setList(normalized);
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar usuários");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", role: "usuario" });
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      role: (u.role as UserRole) || "usuario",
    });
    setShowModal(true);
  }

  async function saveUser() {
    try {
      const method = editing ? "PATCH" : "POST";
      const url = editing
        ? `${API_BASE}/api/auth/users/${editing.id}`
        : `${API_BASE}/api/auth/users`;
      const body = editing
        ? { name: form.name, email: form.email, role: form.role }
        : { name: form.name, email: form.email, role: form.role, password: "Trocar123!" };

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setShowModal(false);
      await fetchUsers();
      alert(editing ? "Usuário atualizado!" : "Usuário criado!");
    } catch (e: any) {
      alert("Erro ao salvar: " + (e?.message || "desconhecido"));
    }
  }

  async function resetPassword(u: User) {
    if (!confirm(`Resetar a senha de ${u.name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${u.id}/reset_password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ temporary_password: "Trocar123!" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      alert("Senha resetada com sucesso!");
    } catch (e: any) {
      alert("Erro ao resetar senha: " + (e?.message || "desconhecido"));
    }
  }

  async function toggleActive(u: User) {
    const toStatus = u.status === "Ativo" ? "Inativo" : "Ativo";
    if (!confirm(`${toStatus === "Inativo" ? "Desativar" : "Ativar"} ${u.name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${u.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: toStatus }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchUsers();
    } catch (e: any) {
      alert("Erro ao atualizar status: " + (e?.message || "desconhecido"));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header do painel (sem sidebar/header externos) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} />
          <div>
            <div style={{ fontWeight: 700, color: "#111827" }}>Gestão de Usuários</div>
            <div style={{ fontSize: 12.5, color: "#6b7280" }}>
              Gerencie usuários, permissões e acessos do sistema
            </div>
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: "#111827",
            color: "white",
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={16} /> Criar Usuário
        </button>
      </div>

      {/* Lista */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "white",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 16, color: "#6b7280" }}>Carregando usuários...</div>
        ) : error ? (
          <div
            style={{
              padding: 16,
              background: "#fef2f2",
              color: "#b91c1c",
              borderBottom: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={th}>Usuário</th>
                <th style={th}>Perfil</th>
                <th style={th}>Status</th>
                <th style={th}>Criado em</th>
                <th style={{ ...th, textAlign: "right", width: 280 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: "#e5e7eb",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          color: "#374151",
                        }}
                      >
                        {u.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{u.name}</div>
                        <div style={{ fontSize: 12.5, color: "#6b7280" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}>
                    <Badge color={ROLE_COLORS[(u.role as string) || "usuario"] || "#6b7280"}>
                      {ROLE_LABELS[(u.role as string) || "usuario"] || u.role}
                    </Badge>
                  </td>
                  <td style={td}>
                    <Badge color={u.status === "Ativo" ? "#16a34a" : "#ef4444"}>{u.status}</Badge>
                  </td>
                  <td style={td}>
                    {u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "-"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button className="btn" title="Editar" onClick={() => openEdit(u)} style={btnBlue}>
                        <Edit size={14} /> Editar
                      </button>
                      <button className="btn" title="Resetar Senha" onClick={() => resetPassword(u)} style={btnAmber}>
                        <RotateCcw size={14} /> Resetar Senha
                      </button>
                      <button
                        className="btn"
                        title={u.status === "Ativo" ? "Desativar" : "Ativar"}
                        onClick={() => toggleActive(u)}
                        style={btnRed}
                      >
                        <Trash2 size={14} /> {u.status === "Ativo" ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={5} style={{ ...td, color: "#6b7280", textAlign: "center" }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal simples */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17,24,39,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            zIndex: 80,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 18px 45px rgba(0,0,0,.22)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 12, borderBottom: "1px solid #eef2f7", fontWeight: 700 }}>
              {editing ? "Editar usuário" : "Criar usuário"}
            </div>
            <div style={{ padding: 14, display: "grid", gap: 10 }}>
              <label style={label}>Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                style={input}
              />

              <label style={label}>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                style={input}
              />

              <label style={label}>Perfil</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                style={{ ...input, height: 38 }}
              >
                <option value="admin">Administrador</option>
                <option value="tecnico">Técnico</option>
                <option value="usuario">Usuário</option>
                <option value="gerente">Gerente</option>
                <option value="coordenador">Coordenador</option>
                <option value="diretor">Diretor</option>
              </select>

              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button onClick={saveUser} style={btnDark}>
                  {editing ? "Salvar alterações" : "Criar usuário"}
                </button>
                <button onClick={() => setShowModal(false)} style={btnGray}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  padding: "10px 12px",
};

const td: React.CSSProperties = {
  fontSize: 13,
  color: "#111827",
  padding: "12px",
  verticalAlign: "middle",
};

const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#374151" };
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 14,
};

const btnBase: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12.5,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnDark: React.CSSProperties = { ...btnBase, background: "#111827", color: "white" };
const btnGray: React.CSSProperties = { ...btnBase, background: "#6b7280", color: "white" };
const btnBlue: React.CSSProperties = { ...btnBase, background: "#3b82f6", color: "white" };
const btnAmber: React.CSSProperties = { ...btnBase, background: "#d97706", color: "white" };
const btnRed: React.CSSProperties = { ...btnBase, background: "#ef4444", color: "white" };
