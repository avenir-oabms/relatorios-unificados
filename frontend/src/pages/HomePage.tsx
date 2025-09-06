import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Users, BarChart3, User, Settings, LogOut } from "lucide-react";

const API_BASE = "http://192.168.0.64:5055";

type UserRole = "admin" | "tecnico" | "usuario" | "gerente" | "coordenador" | "diretor";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  active?: number;
};

type Aviso = {
  id: number;
  titulo: string;
  mensagem: string;
};

const getUserFromStorage = (): User | null => {
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
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
};

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getUserFromStorage();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);
    loadData(currentUser);
  }, [navigate]);

  const loadData = async (currentUser: User) => {
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
  const activeUsers = users.filter((u) => u.active).length;
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
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div>
              <h1
                style={{
                  fontWeight: "bold",
                  fontSize: "1.125rem",
                  margin: 0,
                }}
              >
                SGC
              </h1>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "0.75rem",
                  margin: 0,
                }}
              >
                Sistema de Gerenciamento Central
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
              }}
            >
              {user.name?.[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "500", margin: 0 }}>{user.name}</p>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "0.75rem",
                  margin: 0,
                }}
              >
                {user.role === "admin" ? "Administrador" : user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "white",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                cursor: "pointer",
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Navigation */}
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
        {/* Header */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "1rem 2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "600",
              margin: 0,
              color: "#1f2937",
            }}
          >
            Painel Principal
          </h1>
          <p style={{ color: "#6b7280" }}>Bem-vindo ao sistema, {user.name}!</p>
        </div>

        {/* Conteúdo Principal (mantido do HomePage original) */}
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
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  margin: 0,
                }}
              >
                Mural de Avisos
              </h3>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {loading ? (
                <p>Carregando avisos...</p>
              ) : error ? (
                <p style={{ color: "#dc2626" }}>
                  Erro ao carregar avisos: {error}
                </p>
              ) : avisos.length === 0 ? (
                <p>Nenhum aviso publicado.</p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
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
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
                Próximas Funcionalidades
              </h3>
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
                  {
                    title: "Sistema de Tarefas",
                    desc: "Kanban para gerenciar atividades",
                    icon: "📋",
                  },
                  {
                    title: "Chat Interno",
                    desc: "Comunicação entre usuários",
                    icon: "💬",
                  },
                  {
                    title: "Calendário",
                    desc: "Agendamento e eventos",
                    icon: "📅",
                  },
                  {
                    title: "Notificações",
                    desc: "Alertas em tempo real",
                    icon: "🔔",
                  },
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
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                      {item.icon}
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
