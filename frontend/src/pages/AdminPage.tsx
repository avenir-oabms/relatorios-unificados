import { useEffect, useState } from "react";
import { Home, Users, BarChart3, User, Settings, LogOut, Pencil } from "lucide-react";

const API_BASE = "http://192.168.0.64:5055";

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

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Sidebar */}
      <div style={{ width: "16rem", backgroundColor: "#242c44", color: "white", display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img
              src="/logos/logo_oabms.png"
              alt="OAB MS"
              style={{ width: "2.5rem", height: "2.5rem", objectFit: "contain", backgroundColor: "white", padding: "0.25rem", borderRadius: "0.5rem" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 style={{ fontWeight: "bold", fontSize: "1.125rem", margin: 0 }}>SGC</h1>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", margin: 0 }}>Sistema de Gerenciamento Central</p>
            </div>
          </div>
        </div>

        {/* Navegação (sem bloco de usuário aqui) */}
        <nav style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Home size={20} />
            <span>Início</span>
          </button>

          <div
            style={{
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <Users size={20} />
            <span>Usuários</span>
          </div>

          <button
            onClick={() => (window.location.href = "/profile")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <User size={20} />
            <span>Meu Perfil</span>
          </button>

          <button
            style={{
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <BarChart3 size={20} />
            <span>Relatórios</span>
          </button>

          <button
            style={{
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem 2rem", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>Gestão de Usuários</h1>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                Gerencie usuários, permissões e acessos do sistema
              </p>
            </div>

            {/* TOPO DIREITO: nome + cargo + ícones (editar/sair) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, color: "#111827", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={me?.name}>
                  {me?.name}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {ROLE_LABELS[me?.role || ""] || me?.role}
                </div>
              </div>

              <div
                style={{
                  width: 36,
                  height: 36,
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

              <button
                onClick={openSelfModal}
                title="Editar meu perfil"
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
                <Pencil size={16} />
              </button>

              <button
                onClick={handleLogout}
                title="Sair"
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
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "2rem" }}>
          {/* Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Total de Usuários</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", margin: "0.25rem 0 0 0" }}>{users.length}</p>
                </div>
                <div style={{ width: "3rem", height: "3rem", backgroundColor: "#dbeafe", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={24} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Usuários Ativos</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#059669", margin: "0.25rem 0 0 0" }}>{users.filter((u) => !!u.active).length}</p>
                </div>
                <div style={{ width: "3rem", height: "3rem", backgroundColor: "#d1fae5", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={24} color="#059669" />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Administradores</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#dc2626", margin: "0.25rem 0 0 0" }}>{users.filter((u) => u.role === "admin").length}</p>
                </div>
                <div style={{ width: "3rem", height: "3rem", backgroundColor: "#fee2e2", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Settings size={24} color="#dc2626" />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Usuários Inativos</p>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#6b7280", margin: "0.25rem 0 0 0" }}>{users.filter((u) => !u.active).length}</p>
                </div>
                <div style={{ width: "3rem", height: "3rem", backgroundColor: "#f3f4f6", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={24} color="#6b7280" />
                </div>
              </div>
            </div>
          </div>

          {/* Botão Criar Usuário (agora abaixo dos cards) */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.6rem 1.1rem",
                border: "none",
                borderRadius: "0.6rem",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 10px rgba(59,130,246,.25)",
              }}
            >
              <span>+</span>
              <span>Criar Usuário</span>
            </button>
          </div>

          {/* Loading / Error */}
          {loading && (
            <div style={{ backgroundColor: "white", padding: "3rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", textAlign: "center", color: "#6b7280" }}>
              Carregando usuários...
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.75rem", padding: "1rem", color: "#b91c1c", marginBottom: "1.5rem" }}>
              Erro: {error}
            </div>
          )}

          {/* Tabela */}
          {!loading && !error && (
            <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "#f9fafb" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Usuário</th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Perfil</th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Criado em</th>
                    <th style={{ textAlign: "right", padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#6b7280" }}>Nenhum usuário encontrado</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ width: "2.5rem", height: "2.5rem", backgroundColor: "#e5e7eb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "0.75rem", fontWeight: 500, color: "#6b7280" }}>
                              {user.name[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: 500, color: "#111827", margin: 0 }}>{user.name}</p>
                              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              borderRadius: "9999px",
                              backgroundColor: `${(ROLE_COLORS[user.role] || "#6b7280")}20`,
                              color: ROLE_COLORS[user.role] || "#6b7280",
                            }}
                          >
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              borderRadius: "9999px",
                              backgroundColor: (!!user.active ? "#d1fae520" : "#fee2e220"),
                              color: !!user.active ? "#059669" : "#dc2626",
                            }}
                          >
                            {!!user.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#6b7280" }}>{formatDate(user.created_at)}</td>
                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                            <button
                              onClick={() => openEditModal(user)}
                              style={{ backgroundColor: "#3b82f6", color: "white", padding: "0.25rem 0.75rem", border: "none", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              style={{ backgroundColor: "#d97706", color: "white", padding: "0.25rem 0.75rem", border: "none", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}
                            >
                              Resetar Senha
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              style={{ backgroundColor: "#dc2626", color: "white", padding: "0.25rem 0.75rem", border: "none", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}
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

      {/* Modal Criar Usuário */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.5rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)", width: "100%", maxWidth: "28rem" }}>
            <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827", margin: 0 }}>Criar Novo Usuário</h3>
            </div>

            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>Senha</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", boxSizing: "border-box" }}
                  minLength={8}
                  required
                />
                <p style={{ fontSize: ".75rem", color: "#6b7280", margin: ".25rem 0 0 0" }}>Mínimo 8 caracteres</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", boxSizing: "border-box" }}
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

              <div style={{ display: "flex", gap: ".75rem", paddingTop: "1rem" }}>
                <button
                  onClick={handleCreateUser}
                  style={{ flex: 1, backgroundColor: "#3b82f6", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Criar Usuário
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: "", email: "", password: "", role: "usuario", active: true });
                  }}
                  style={{ flex: 1, backgroundColor: "#6b7280", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário (admin -> outros usuários) */}
      {showEditModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }}>
          <div style={{ backgroundColor: "white", borderRadius: "0.5rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)", width: "100%", maxWidth: "28rem" }}>
            <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827", margin: 0 }}>Editar Usuário</h3>
            </div>

            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", backgroundColor: "#f3f4f6", color: "#6b7280", boxSizing: "border-box" }}
                />
                <p style={{ fontSize: ".75rem", color: "#6b7280", margin: ".25rem 0 0 0" }}>E-mail não pode ser alterado</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: ".875rem", fontWeight: 500, color: "#374151", marginBottom: ".25rem" }}>Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", fontSize: ".875rem", boxSizing: "border-box" }}
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

              <div style={{ display: "flex", gap: ".75rem", paddingTop: "1rem" }}>
                <button
                  onClick={handleEditUser}
                  style={{ flex: 1, backgroundColor: "#3b82f6", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setFormData({ name: "", email: "", password: "", role: "usuario", active: true } as any);
                  }}
                  style={{ flex: 1, backgroundColor: "#6b7280", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edição do Próprio Usuário (versão aprovada, compacta) */}
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
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setShowSelfEditModal(false)}
                  style={{
                    flex: 1,
                    background: "#111827",
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
      )}
    </div>
  );
}
