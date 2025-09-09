import { useEffect, useMemo, useState } from "react";
import { Users, Edit, Trash2, RotateCcw, Plus, Maximize2, Minimize2, Square, Move, X } from "lucide-react";

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
        padding: "3px 8px",
        borderRadius: 5,
        background: color + "15",
        color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
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

  // modal redimensionável de criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "usuario" as UserRole });
  const [modalSize, setModalSize] = useState<"normal" | "large" | "fullscreen">("normal");

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
    setModalSize("normal");
    setShowModal(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      role: (u.role as UserRole) || "usuario",
    });
    setModalSize("normal");
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
        body: JSON.stringify({ new_password: "Trocar123!" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      alert("Senha resetada com sucesso!");
    } catch (e: any) {
      alert("Erro ao resetar senha: " + (e?.message || "desconhecido"));
    }
  }

  async function toggleActive(u: User) {
    const toActive = u.status === "Ativo" ? 0 : 1;
    const actionText = u.status === "Ativo" ? "Desativar" : "Ativar";
    if (!confirm(`${actionText} ${u.name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${u.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ active: toActive }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchUsers();
    } catch (e: any) {
      alert("Erro ao atualizar status: " + (e?.message || "desconhecido"));
    }
  }

  // Função para obter o estilo do modal baseado no tamanho
  const getModalStyle = () => {
    const baseStyle = {
      background: "white",
      borderRadius: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    };

    switch (modalSize) {
      case "normal":
        return {
          ...baseStyle,
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
        };
      case "large":
        return {
          ...baseStyle,
          width: "90%",
          maxWidth: "800px",
          maxHeight: "90vh",
        };
      case "fullscreen":
        return {
          ...baseStyle,
          width: "95vw",
          height: "95vh",
          maxWidth: "none",
          maxHeight: "none",
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Header do painel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} />
          <div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 16 }}>Gestão de Usuários</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Gerencie usuários, permissões e acessos do sistema
            </div>
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: "#111827",
            color: "white",
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 32,
          }}
        >
          <Plus size={14} /> Criar Usuário
        </button>
      </div>

      {/* Lista */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "white",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 16, color: "#6b7280", fontSize: 14 }}>Carregando usuários...</div>
        ) : error ? (
          <div
            style={{
              padding: 16,
              background: "#fef2f2",
              color: "#b91c1c",
              borderBottom: "1px solid #fecaca",
              fontSize: 14,
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
                <th style={{ ...th, textAlign: "right", width: 240 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#e5e7eb",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 600,
                          color: "#374151",
                          fontSize: 12,
                        }}
                      >
                        {u.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: "#111827", fontSize: 14, lineHeight: 1.3 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.3 }}>{u.email}</div>
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
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "-"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button 
                        title="Editar" 
                        onClick={() => openEdit(u)} 
                        style={btnBlue}
                      >
                        <Edit size={13} /> Editar
                      </button>
                      <button 
                        title="Resetar Senha" 
                        onClick={() => resetPassword(u)} 
                        style={btnAmber}
                      >
                        <RotateCcw size={13} /> Resetar
                      </button>
                      <button
                        title={u.status === "Ativo" ? "Desativar" : "Ativar"}
                        onClick={() => toggleActive(u)}
                        style={u.status === "Ativo" ? btnRed : btnGreen}
                      >
                        <Trash2 size={13} /> {u.status === "Ativo" ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={5} style={{ ...td, color: "#6b7280", textAlign: "center", fontSize: 14 }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Redimensionável */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17,24,39,.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 80,
          }}
        >
          <div style={getModalStyle()}>
            {/* Header do Modal com controles de tamanho */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: 16 }}>
                  {editing ? "Editar usuário" : "Criar usuário"}
                </div>
                {editing && (
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                    ID: {editing.id}
                  </div>
                )}
              </div>

              {/* Controles de redimensionamento */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => setModalSize("normal")}
                  title="Tamanho normal"
                  style={{
                    ...modalControlBtn,
                    background: modalSize === "normal" ? "#3b82f6" : "#e5e7eb",
                    color: modalSize === "normal" ? "white" : "#6b7280",
                  }}
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={() => setModalSize("large")}
                  title="Tamanho grande"
                  style={{
                    ...modalControlBtn,
                    background: modalSize === "large" ? "#3b82f6" : "#e5e7eb",
                    color: modalSize === "large" ? "white" : "#6b7280",
                  }}
                >
                  <Square size={14} />
                </button>
                <button
                  onClick={() => setModalSize("fullscreen")}
                  title="Tela cheia"
                  style={{
                    ...modalControlBtn,
                    background: modalSize === "fullscreen" ? "#3b82f6" : "#e5e7eb",
                    color: modalSize === "fullscreen" ? "white" : "#6b7280",
                  }}
                >
                  <Maximize2 size={14} />
                </button>
                
                <div style={{ width: 1, height: 20, background: "#d1d5db", margin: "0 4px" }} />
                
                <button
                  onClick={() => setShowModal(false)}
                  title="Fechar"
                  style={{
                    ...modalControlBtn,
                    background: "#ef4444",
                    color: "white",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div 
              style={{ 
                padding: modalSize === "fullscreen" ? 24 : 16, 
                display: "grid", 
                gap: modalSize === "fullscreen" ? 16 : 12,
                overflow: "auto",
                maxHeight: modalSize === "fullscreen" ? "calc(95vh - 140px)" : "70vh"
              }}
            >
              {/* Formulário em colunas para tela cheia */}
              <div 
                style={{
                  display: modalSize === "fullscreen" ? "grid" : "block",
                  gridTemplateColumns: modalSize === "fullscreen" ? "1fr 1fr" : "1fr",
                  gap: modalSize === "fullscreen" ? 20 : 0,
                }}
              >
                {/* Coluna 1 - Dados básicos */}
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>
                    Informações Básicas
                  </div>
                  
                  <div>
                    <label style={label}>Nome</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      style={input}
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  <div>
                    <label style={label}>E-mail</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      style={input}
                      placeholder="exemplo@oabms.org.br"
                    />
                  </div>

                  <div>
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
                  </div>
                </div>

                {/* Coluna 2 - Informações adicionais (só aparece em fullscreen) */}
                {modalSize === "fullscreen" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>
                      Configurações Adicionais
                    </div>
                    
                    <div>
                      <label style={label}>Departamento</label>
                      <select style={{ ...input, height: 38 }}>
                        <option value="">Selecione o departamento</option>
                        <option value="ti">Tecnologia da Informação</option>
                        <option value="juridico">Jurídico</option>
                        <option value="administrativo">Administrativo</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="presidencia">Presidência</option>
                      </select>
                    </div>

                    <div>
                      <label style={label}>Observações</label>
                      <textarea
                        style={{
                          ...input,
                          height: 80,
                          resize: "vertical",
                          minHeight: 60,
                        }}
                        placeholder="Observações sobre o usuário..."
                      />
                    </div>

                    <div style={{ 
                      background: "#f0f9ff", 
                      border: "1px solid #0ea5e9", 
                      borderRadius: 8, 
                      padding: 12,
                      fontSize: 12,
                      color: "#0369a1"
                    }}>
                      <strong>Nota:</strong> Campos adicionais estarão disponíveis em versões futuras.
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé com botões */}
              <div style={{ 
                display: "flex", 
                gap: 8, 
                marginTop: modalSize === "fullscreen" ? 20 : 12,
                paddingTop: 12,
                borderTop: "1px solid #e5e7eb"
              }}>
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

// Estilos otimizados
const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  padding: "10px 12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const td: React.CSSProperties = {
  fontSize: 13,
  color: "#111827",
  padding: "10px 12px",
  verticalAlign: "middle",
};

const label: React.CSSProperties = { 
  fontSize: 13, 
  fontWeight: 600, 
  color: "#374151",
  marginBottom: 4,
  display: "block",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  transition: "border-color 0.2s, box-shadow 0.2s",
  outline: "none",
  backgroundColor: "white",
};

const btnBase: React.CSSProperties = {
  padding: "5px 8px",
  borderRadius: 5,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 11,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  lineHeight: 1.2,
};

const btnDark: React.CSSProperties = { 
  ...btnBase, 
  background: "#111827", 
  color: "white",
  padding: "10px 16px",
  fontSize: 13,
};

const btnGray: React.CSSProperties = { 
  ...btnBase, 
  background: "#6b7280", 
  color: "white",
  padding: "10px 16px",
  fontSize: 13,
};

const btnBlue: React.CSSProperties = { 
  ...btnBase, 
  background: "#3b82f6", 
  color: "white" 
};

const btnAmber: React.CSSProperties = { 
  ...btnBase, 
  background: "#f59e0b", 
  color: "white" 
};

const btnRed: React.CSSProperties = { 
  ...btnBase, 
  background: "#ef4444", 
  color: "white" 
};

const btnGreen: React.CSSProperties = { 
  ...btnBase, 
  background: "#16a34a", 
  color: "white" 
};

const modalControlBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 4,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s",
};