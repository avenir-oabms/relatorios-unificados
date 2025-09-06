import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Users, BarChart3, User, Settings, LogOut, Pencil } from "lucide-react";

const API_BASE = "http://192.168.0.64:5055";

type UserRole = "admin" | "tecnico" | "usuario" | "gerente" | "coordenador" | "diretor";

type UserType = {
  id: number;
  name: string;
  email: string;
  role: UserRole | string;
  active?: number | boolean;
};

type Aviso = {
  id: number;
  titulo: string;
  mensagem: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  usuario: "Usuário",
  gerente: "Gerente",
  coordenador: "Coordenador",
  diretor: "Diretor",
};

const getUserFromStorage = (): UserType | null => {
  try {
    const authUser = localStorage.getItem("authUser");
    return authUser ? JSON.parse(authUser) : null;
  } catch {
    return null;
  }
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("authToken");
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal do próprio usuário
  const [showSelfEditModal, setShowSelfEditModal] = useState(false);
  const [selfForm, setSelfForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    const currentUser = getUserFromStorage();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);
    loadData(currentUser);
  }, [navigate]);

  const loadData = async (currentUser: UserType) => {
    setLoading(true);
    setError(null);
    try {
      const avisosResponse = await fetchWithAuth(`${API_BASE}/api/mural/`);
      if (avisosResponse.ok) {
        const avisosData = await avisosResponse.json();
        setAvisos(Array.isArray(avisosData) ? avisosData : []);
      }
      if (currentUser.role === "admin") {
        const usersResponse = await fetchWithAuth(`${API_BASE}/api/auth/users`);
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados do servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  function openSelfModal() {
    const curr = getUserFromStorage();
    if (!curr) return;
    setSelfForm({
      name: curr.name || "",
      email: curr.email || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setShowSelfEditModal(true);
  }

  async function handleSaveMyName() {
    if (!user?.id) {
      alert("Usuário atual não encontrado.");
      return;
    }
    if (!selfForm.name.trim()) {
      alert("Informe um nome válido.");
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/auth/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: selfForm.name }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro ao salvar: " + data.error);
        return;
      }
      const updated = { ...user, name: selfForm.name };
      localStorage.setItem("authUser", JSON.stringify(updated));
      setUser(updated);
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
      const res = await fetchWithAuth(`${API_BASE}/api/auth/change_password`, {
        method: "POST",
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

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div>Redirecionando...</div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const activeUsers = users.filter((u) => !!u.active).length;
  const totalUsers = users.length;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      `}</style>

      {/* Sidebar (sem bloco do usuário) */}
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
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img
              src="/logos/logo_oabms.png"
              alt="OAB MS"
              style={{
                width: "2.5rem",
                height: "2.5rem",
                objectFit: "contain",
                backgroundColor: "white",
                padding: "0.25rem",
                borderRadius: "0.5rem",
              }}
              onError={(e) => (e.currentTarget as HTMLImageElement).style.display = "none"}
            />
            <div>
              <h1 style={{ fontWeight: "bold", fontSize: "1.125rem", margin: 0 }}>SGC</h1>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", margin: 0 }}>
                Sistema de Gerenciamento Central
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav
          style={{
            flex: 1,
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              color: "white",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Home size={20} />
            <span>Início</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                color: "white",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Users size={20} />
              <span>Usuários</span>
            </button>
          )}

          <button
            onClick={() => navigate("/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              color: "white",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <User size={20} />
            <span>Meu Perfil</span>
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              color: "white",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <BarChart3 size={20} />
            <span>Relatórios</span>
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              color: "white",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header com usuário no topo direito */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "1rem 2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 600, margin: 0, color: "#1f2937" }}>
                Painel Principal
              </h1>
              <p style={{ color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                Bem-vindo ao sistema, {user.name}!
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    maxWidth: 220,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={user.name}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {ROLE_LABELS[user.role] || (user.role as string)}
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
                title={user.email}
              >
                {user.name?.[0]}
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

        {/* Conteúdo Principal */}
        <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
          {/* Cards - só admin */}
          {isAdmin && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p>Total de Usuários</p>
                <h2>{totalUsers}</h2>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p>Usuários Ativos</p>
                <h2 style={{ color: "#059669" }}>{activeUsers}</h2>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p>Avisos Publicados</p>
                <h2 style={{ color: "#f59e0b" }}>{avisos.length}</h2>
              </div>
            </div>
          )}

          {/* Mural de Avisos */}
          <section
            style={{
              backgroundColor: "white",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem",
            }}
          >
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Mural de Avisos</h3>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {loading ? (
                <p>Carregando avisos...</p>
              ) : error ? (
                <p style={{ color: "#dc2626" }}>Erro ao carregar avisos: {error}</p>
              ) : avisos.length === 0 ? (
                <p>Nenhum aviso publicado.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {avisos.map((aviso) => (
                    <div
                      key={aviso.id}
                      style={{
                        padding: "1rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        borderLeft: "4px solid #3b82f6",
                      }}
                    >
                      <h4>{aviso.titulo}</h4>
                      <p>{aviso.mensagem}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Próximas Funcionalidades */}
          <section
            style={{
              backgroundColor: "white",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Próximas Funcionalidades</h3>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                {[
                  { title: "Sistema de Tarefas", desc: "Kanban para gerenciar atividades", icon: "📋" },
                  { title: "Chat Interno", desc: "Comunicação entre usuários", icon: "💬" },
                  { title: "Calendário", desc: "Agendamento e eventos", icon: "📅" },
                  { title: "Notificações", desc: "Alertas em tempo real", icon: "🔔" },
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.5rem",
                      border: "2px dashed #d1d5db",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{item.icon}</div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
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
            {/* Header compacto (sem X) */}
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
                {user.name?.[0]}
              </div>
              <div>
                <div id="meu-perfil-title" style={{ fontWeight: 600, color: "#111827", lineHeight: 1.2 }}>
                  Meu Perfil
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{user.email}</div>
              </div>
            </div>

            {/* Body */}
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
                        name: user?.name || "",
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
