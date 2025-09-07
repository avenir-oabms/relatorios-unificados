import { useEffect, useState } from "react";
import {
  Home,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Pencil,
  Bell,
  ClipboardList,
  Info,
} from "lucide-react";

const API_BASE = "http://192.168.0.64:5055";

/** Tipagens */
type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: number | boolean;
  created_at: string | null;
};

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  gerente: "Gerente",
  coordenador: "Coordenador",
  diretor: "Diretor",
  usuario: "Usuário",
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "tecnico", label: "Técnico" },
  { value: "gerente", label: "Gerente" },
  { value: "coordenador", label: "Coordenador" },
  { value: "diretor", label: "Diretor" },
  { value: "usuario", label: "Usuário" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "#dc2626",
  tecnico: "#2563eb",
  gerente: "#16a34a",
  coordenador: "#9333ea",
  diretor: "#ea580c",
  usuario: "#6b7280",
};

export default function AdminPage() {
  const token = localStorage.getItem("authToken");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modais de CRUD (existentes)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // estados do form de CRUD
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "usuario",
    active: true,
  });

  // próprio usuário (perfil)
  const storedUser: CurrentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const [me, setMe] = useState<CurrentUser>(storedUser || ({} as CurrentUser));
  const [showSelfEditModal, setShowSelfEditModal] = useState(false);
  const [selfForm, setSelfForm] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // topo direito: badges (placeholders iniciais)
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [pendingTasks, setPendingTasks] = useState<number>(0);

  // modal “sobre / créditos”
  const [showAboutModal, setShowAboutModal] = useState(false);

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "Data não disponível";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "Data inválida";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Erro ${res.status}: ${errData.error || "Erro desconhecido"}`);
      }
      const data = await res.json();
      const unique = (data.users || []).filter(
        (u: UserRow, i: number, arr: UserRow[]) => arr.findIndex((x) => x.email === u.email) === i
      );
      setUsers(unique);
    } catch (e: any) {
      setError(e.message || "Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // endpoints reais de contadores podem ser ligados aqui depois
    // setUnreadAlerts(...); setPendingTasks(...);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CRUD existente
  function handleCreateUser() {
    if (!formData.name || !formData.email || !formData.password) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        active: formData.active,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert("Erro: " + data.error);
          return;
        }
        alert("Usuário criado com sucesso!");
        setShowCreateModal(false);
        setFormData({ name: "", email: "", password: "", role: "usuario", active: true });
        fetchUsers();
      })
      .catch(() => alert("Erro ao criar usuário"));
  }

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: Boolean(user.active),
    } as any);
    setShowEditModal(true);
  }

  async function handleEditUser() {
    if (!editingUser || !formData.name.trim()) {
      alert("Nome é obrigatório!");
      return;
    }

    const payload = {
      name: formData.name,
      role: formData.role,
      active: formData.active ? 1 : 0,
    };

    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro: " + data.error);
        return;
      }
      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "usuario", active: true } as any);
      await fetchUsers();
      alert("Usuário atualizado com sucesso!");
    } catch (e: any) {
      alert("Erro ao editar usuário: " + e.message);
    }
  }

  function handleDeleteUser(user: UserRow) {
    if (!confirm(`Desativar usuário ${user.name}?`)) return;

    fetch(`${API_BASE}/api/auth/users/${user.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active: 0 }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert("Erro: " + data.error);
          return;
        }
        alert("Usuário desativado!");
        fetchUsers();
      })
      .catch((e) => alert("Erro ao desativar usuário: " + e.message));
  }

  function handleResetPassword(user: UserRow) {
    const newPassword = prompt("Nova senha (mínimo 8 caracteres):");
    if (!newPassword || newPassword.length < 8) {
      alert("Senha deve ter pelo menos 8 caracteres!");
      return;
    }

    fetch(`${API_BASE}/api/auth/users/${user.id}/reset_password`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ new_password: newPassword }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert("Erro: " + data.error);
          return;
        }
        alert("Senha alterada com sucesso!");
      })
      .catch(() => alert("Erro ao alterar senha"));
  }

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  // Modal do próprio usuário
  function openSelfModal() {
    const curr: CurrentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    setMe(curr);
    setSelfForm({
      name: curr?.name || "",
      email: curr?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setShowSelfEditModal(true);
  }

  async function handleSaveMyName() {
    if (!me?.id) {
      alert("Usuário atual não encontrado.");
      return;
    }
    if (!selfForm.name.trim()) {
      alert("Informe um nome válido.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${me.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: selfForm.name }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro ao salvar: " + data.error);
        return;
      }

      const updated = { ...me, name: selfForm.name };
      localStorage.setItem("authUser", JSON.stringify(updated));
      setMe(updated);
      alert("Nome atualizado com sucesso!");
    } catch {
      alert("Erro ao atualizar nome.");
    }
  }

  async function handleChangeMyPassword() {
    if (!selfForm.currentPassword || !selfForm.newPassword) {
      alert("Informe a senha atual e a nova senha.");
      return;
    }
    if (selfForm.newPassword.length < 8) {
      alert("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (selfForm.newPassword !== selfForm.confirmNewPassword) {
      alert("A confirmação de senha não confere.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/change_password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: selfForm.currentPassword,
          new_password: selfForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro ao alterar senha: " + data.error);
        return;
      }
      alert("Senha alterada com sucesso!");
      setSelfForm((p) => ({ ...p, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
    } catch {
      alert("Erro ao alterar senha.");
    }
  }

  // helpers UI
  const MenuButton = ({
    icon,
    label,
    onClick,
    active = false,
    title,
  }: {
    icon: JSX.Element;
    label: string;
    onClick?: () => void;
    active?: boolean;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "0.55rem 0.8rem", // mais compacto
        borderRadius: "0.5rem",
        backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
        border: "none",
        color: "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
      onMouseOut={(e) =>
        (e.currentTarget.style.backgroundColor = active ? "rgba(255,255,255,0.12)" : "transparent")
      }
    >
      {icon}
      <span style={{ fontSize: ".875rem" /* fonte um pouco menor */ }}>{label}</span>
    </button>
  );

  const BadgeIcon = ({
    icon,
    count,
    title,
    onClick,
  }: {
    icon: JSX.Element;
    count?: number;
    title?: string;
    onClick?: () => void;
  }) => (
    <div style={{ position: "relative" }}>
      <button
        onClick={onClick}
        title={title}
        style={{
          height: 34,
          width: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          cursor: "pointer",
        }}
      >
        {icon}
      </button>
      {count && count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            padding: "0 4px",
            background: "#ef4444",
            color: "white",
            borderRadius: 999,
            fontSize: 11,
            lineHeight: "18px",
            textAlign: "center",
            boxShadow: "0 0 0 2px #fff",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );

  const isAdmin = (me?.role || "") === "admin";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Sidebar */}
      <div
        style={{
          width: "16rem",
          backgroundColor: "#242c44",
          color: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "1.2rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <img
              src="/logos/logo_oabms.png"
              alt="OAB MS"
              style={{
                width: "2.2rem",
                height: "2.2rem",
                objectFit: "contain",
                backgroundColor: "white",
                padding: "0.2rem",
                borderRadius: "0.45rem",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 style={{ fontWeight: "bold", fontSize: "1rem", margin: 0 }}>SGC</h1>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.7rem", margin: 0 }}>
                Sistema de Gerenciamento Central
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav style={{ flex: 1, padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <MenuButton icon={<Home size={18} />} label="Início" onClick={() => (window.location.href = "/")} />

          <MenuButton
            icon={<Users size={18} />}
            label="Usuários"
            onClick={() => (window.location.href = "/admin")}
            active
          />

          {/* Relatórios (sem submenu) */}
          <MenuButton
            icon={<BarChart3 size={18} />}
            label="Relatórios"
            onClick={() => (window.location.href = "/reports")}
            title={isAdmin ? "Relatórios" : "Acesso por perfil (em breve por departamento/pessoa)"}
          />

          {/* Demais itens – rótulos curtos para não quebrar linha */}
          <MenuButton icon={<ClipboardList size={18} />} label="Comunicado Interno" onClick={() => (window.location.href = "/")} title="CI - Sistema de Comunicado Interno" />
          <MenuButton icon={<ClipboardList size={18} />} label="Chamados" onClick={() => (window.location.href = "/")} title="Central de Chamados" />
          <MenuButton icon={<Settings size={18} />} label="Ajustes" onClick={() => (window.location.href = "/")} title="Ajustes Gerenciais" />
          <MenuButton icon={<Bell size={18} />} label="Avisos" onClick={() => (window.location.href = "/")} title="Central de Avisos" />
          <MenuButton icon={<ClipboardList size={18} />} label="Calendário" onClick={() => (window.location.href = "/")} title="Calendário Institucional" />
          <MenuButton icon={<ClipboardList size={18} />} label="Tarefas" onClick={() => (window.location.href = "/")} title="Sistema de Tarefas" />
          <MenuButton icon={<Bell size={18} />} label="Notificações" onClick={() => (window.location.href = "/")} title="Central de Notificações (atalhos e pendências)" />
        </nav>

        {/* Rodapé / Créditos */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "0.6rem 0.8rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => setShowAboutModal(true)}
            title="Sobre o sistema"
            style={{
              height: 28,
              width: 28,
              display: "grid",
              placeItems: "center",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Info size={16} />
          </button>
          <div style={{ fontSize: "0.72rem", lineHeight: 1.3, color: "rgba(255,255,255,.85)" }}>
            Desenvolvido pelo <strong>Departamento de Tecnologia da Informação</strong> OAB/MS
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header mais estreito */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "0.6rem 1rem", // mais estreito
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>Gestão de Usuários</h1>
              <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0.2rem 0 0 0" }}>
                Gerencie usuários, permissões e acessos do sistema
              </p>
            </div>

            {/* TOPO DIREITO: atalhos + nome + avatar + editar/sair */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Atalhos com badge */}
              <BadgeIcon
                icon={<Bell size={16} />}
                count={unreadAlerts}
                title="Notificações"
                onClick={() => (window.location.href = "/notifications")}
              />
              <BadgeIcon
                icon={<ClipboardList size={16} />}
                count={pendingTasks}
                title="Tarefas"
                onClick={() => (window.location.href = "/tasks")}
              />

              {/* Nome e cargo */}
              <div style={{ textAlign: "right", marginLeft: 6 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    maxWidth: 220,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: ".9rem",
                    lineHeight: 1.1,
                  }}
                  title={me?.name}
                >
                  {me?.name}
                </div>
                <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                  {ROLE_LABELS[me?.role || ""] || me?.role}
                </div>
              </div>

              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 600,
                  color: "#374151",
                }}
                title={me?.email}
              >
                {me?.name?.[0]}
              </div>

              {/* Editar e Sair */}
              <button
                onClick={openSelfModal}
                title="Editar meu perfil"
                style={{
                  height: 32,
                  width: 32,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <Pencil size={15} />
              </button>

              <button
                onClick={handleLogout}
                title="Sair"
                style={{
                  height: 32,
                  width: 32,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.2rem" }}>
          {/* Botão Criar Usuário */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.8rem" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.55rem 1rem",
                border: "none",
                borderRadius: "0.55rem",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                boxShadow: "0 4px 10px rgba(59,130,246,.18)",
              }}
            >
              <span>+</span>
              <span>Criar Usuário</span>
            </button>
          </div>

          {/* Loading / Error */}
          {loading && (
            <div
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Carregando usuários...
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.75rem",
                padding: "1rem",
                color: "#b91c1c",
                marginBottom: "1rem",
              }}
            >
              Erro: {error}
            </div>
          )}

          {/* Tabela */}
          {!loading && !error && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.06)",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "#f9fafb" }}>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Usuário
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Perfil
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Criado em
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.6rem 1rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "2rem 1rem", textAlign: "center", color: "#6b7280" }}>
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div
                              style={{
                                width: "2.2rem",
                                height: "2.2rem",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: "0.6rem",
                                fontWeight: 500,
                                color: "#6b7280",
                              }}
                            >
                              {user.name[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, color: "#111827", margin: 0, fontSize: ".95rem" }}>{user.name}</p>
                              <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "0.22rem 0.48rem",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              borderRadius: 999,
                              backgroundColor: `${(ROLE_COLORS[user.role] || "#6b7280")}1A`,
                              color: ROLE_COLORS[user.role] || "#6b7280",
                            }}
                          >
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "0.22rem 0.48rem",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              borderRadius: 999,
                              backgroundColor: (!!user.active ? "#d1fae51A" : "#fee2e21A"),
                              color: !!user.active ? "#059669" : "#dc2626",
                            }}
                          >
                            {!!user.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: "#6b7280" }}>{formatDate(user.created_at)}</td>
                        <td style={{ padding: "0.8rem 1rem", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem" }}>
                            <button
                              onClick={() => openEditModal(user)}
                              style={{
                                backgroundColor: "#3b82f6",
                                color: "white",
                                padding: "0.25rem 0.7rem",
                                border: "none",
                                borderRadius: "0.3rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              style={{
                                backgroundColor: "#d97706",
                                color: "white",
                                padding: "0.25rem 0.7rem",
                                border: "none",
                                borderRadius: "0.3rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Resetar Senha
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              style={{
                                backgroundColor: "#dc2626",
                                color: "white",
                                padding: "0.25rem 0.7rem",
                                border: "none",
                                borderRadius: "0.3rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Desativar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Edição do Próprio Usuário (compacto) */}
      {showSelfEditModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(17,24,39,.55)",
            backdropFilter: "blur(1px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            zIndex: 80,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              boxShadow: "0 18px 45px rgba(0,0,0,.22)",
              width: "100%",
              maxWidth: "26rem",
            }}
            role="dialog"
            aria-labelledby="meu-perfil-title"
          >
            {/* Header compacto */}
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid #eef2f7",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {me?.name?.[0]}
              </div>
              <div>
                <div id="meu-perfil-title" style={{ fontWeight: 600, color: "#111827", lineHeight: 1.2 }}>
                  Meu Perfil
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{me?.email}</div>
              </div>
            </div>

            <div style={{ padding: 14, display: "grid", gap: 12 }}>
              {/* Nome */}
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Nome</label>
                <input
                  type="text"
                  value={selfForm.name}
                  onChange={(e) => setSelfForm((p) => ({ ...p, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleSaveMyName}
                    style={{
                      flex: 1,
                      background: "#3b82f6",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Salvar nome
                  </button>
                  <button
                    onClick={() =>
                      setSelfForm((p) => ({
                        ...p,
                        name: me?.name || "",
                        currentPassword: "",
                        newPassword: "",
                        confirmNewPassword: "",
                      }))
                    }
                    style={{
                      background: "#6b7280",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Desfazer
                  </button>
                </div>
              </div>

              <div style={{ height: 1, background: "#f3f4f6" }} />

              {/* Senha */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>Alterar senha</div>

                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Senha atual</label>
                <input
                  type="password"
                  value={selfForm.currentPassword}
                  onChange={(e) => setSelfForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />

                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Nova senha</label>
                <input
                  type="password"
                  value={selfForm.newPassword}
                  onChange={(e) => setSelfForm((p) => ({ ...p, newPassword: e.target.value }))}
                  minLength={8}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />

                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Confirmar nova senha</label>
                <input
                  type="password"
                  value={selfForm.confirmNewPassword}
                  onChange={(e) => setSelfForm((p) => ({ ...p, confirmNewPassword: e.target.value }))}
                  minLength={8}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleChangeMyPassword}
                    style={{
                      flex: 1,
                      background: "#d97706",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Alterar senha
                  </button>
                  <button
                    onClick={() => setSelfForm((p) => ({ ...p, currentPassword: "", newPassword: "", confirmNewPassword: "" }))}
                    style={{
                      background: "#6b7280",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => setShowSelfEditModal(false)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Usuário */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)",
              width: "100%",
              maxWidth: "28rem",
            }}
          >
            <div style={{ padding: "1rem 1rem 0.6rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827", margin: 0 }}>Criar Novo Usuário</h3>
            </div>

            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>Senha</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    boxSizing: "border-box",
                  }}
                  minLength={8}
                  required
                />
                <p style={{ fontSize: ".72rem", color: "#6b7280", margin: ".25rem 0 0 0" }}>Mínimo 8 caracteres</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    boxSizing: "border-box",
                  }}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  style={{ marginRight: "0.5rem" }}
                />
                <label htmlFor="active" style={{ fontSize: ".875rem", color: "#111827" }}>
                  Usuário ativo
                </label>
              </div>

              <div style={{ display: "flex", gap: ".6rem", paddingTop: ".6rem" }}>
                <button
                  onClick={handleCreateUser}
                  style={{
                    flex: 1,
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Criar Usuário
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: "", email: "", password: "", role: "usuario", active: true });
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#6b7280",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {showEditModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.5rem",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)",
              width: "100%",
              maxWidth: "28rem",
            }}
          >
            <div style={{ padding: "1rem 1rem 0.6rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827", margin: 0 }}>Editar Usuário</h3>
            </div>

            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: ".72rem", color: "#6b7280", margin: ".25rem 0 0 0" }}>E-mail não pode ser alterado</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: ".25rem" }}>Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: ".875rem",
                    boxSizing: "border-box",
                  }}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="active-edit"
                  checked={formData.active as any}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked } as any)}
                  style={{ marginRight: "0.5rem" }}
                />
                <label htmlFor="active-edit" style={{ fontSize: ".875rem", color: "#111827" }}>
                  Usuário ativo
                </label>
              </div>

              <div style={{ display: "flex", gap: ".6rem", paddingTop: ".6rem" }}>
                <button
                  onClick={handleEditUser}
                  style={{
                    flex: 1,
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setFormData({ name: "", email: "", password: "", role: "usuario", active: true } as any);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#6b7280",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal “Sobre / Créditos” */}
      {showAboutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,.55)",
            backdropFilter: "blur(1px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            zIndex: 90,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              boxShadow: "0 18px 45px rgba(0,0,0,.22)",
              width: "100%",
              maxWidth: "30rem",
            }}
            role="dialog"
            aria-labelledby="sobre-title"
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid #eef2f7",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Info size={18} />
              <div id="sobre-title" style={{ fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                Sobre o SGC
              </div>
            </div>

            <div style={{ padding: 14, display: "grid", gap: 10, fontSize: 14, color: "#374151" }}>
              <p>
                <strong>SGC — Sistema de Gerenciamento Central</strong><br />
                Desenvolvido pelo <strong>Departamento de Tecnologia da Informação</strong> OAB/MS.
              </p>
              <p>
                Versão: 1.0.0 (placeholder) • Build: {new Date().toLocaleDateString("pt-BR")}
              </p>
              <p>
                Contato: ti@oabms.org.br (placeholder). Este modal pode exibir changelog, termos de uso e políticas de privacidade.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => setShowAboutModal(false)}
                  style={{
                    background: "#111827",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
