import { useState, useEffect } from "react";
import { Home, Users, BarChart3, User, Settings, LogOut } from "lucide-react";

const API_BASE = "http://192.168.0.64:5055";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: number;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  gerente: "Gerente", 
  coordenador: "Coordenador",
  diretor: "Diretor",
  usuario: "Usuário"
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "tecnico", label: "Técnico" },
  { value: "gerente", label: "Gerente" },
  { value: "coordenador", label: "Coordenador" },
  { value: "diretor", label: "Diretor" },
  { value: "usuario", label: "Usuário" }
];

const ROLE_COLORS: Record<string, string> = {
  admin: "#dc2626",
  tecnico: "#2563eb",
  gerente: "#16a34a",
  coordenador: "#9333ea",
  diretor: "#ea580c",
  usuario: "#6b7280"
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "usuario",
    active: true
  });
  
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const token = localStorage.getItem("authToken");

  // Função auxiliar para formatar data
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return "Data não disponível";
    }
    
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn("Data inválida:", dateString);
        return "Data inválida";
      }
      
      // Formatar para DD/MM/AAAA HH:mm
      return date.toLocaleDateString("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Erro na data";
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Buscando usuários... Token:", token);
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      console.log("Status da resposta:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("=== DADOS RECEBIDOS DA API ===");
        console.log("Total de usuários retornados:", data.users?.length);
        
        // Log para debug das datas
        if (data.users && data.users.length > 0) {
          console.log("Exemplo de usuário com created_at:", data.users[0]);
          console.log("Campo created_at do primeiro usuário:", data.users[0].created_at);
        }
        
        // Filtrar duplicados por email (manter o primeiro de cada)
        const uniqueUsers = data.users?.filter((user: User, index: number, arr: User[]) => 
          arr.findIndex(u => u.email === user.email) === index
        ) || [];
        
        console.log("Após filtrar duplicados:", uniqueUsers.length);
        console.log("Usuários únicos:", uniqueUsers);
        
        setUsers(uniqueUsers);
      } else {
        const errorData = await res.json();
        console.log("Erro da API:", errorData);
        setError(`Erro ${res.status}: ${errorData.error || "Erro desconhecido"}`);
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.password) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        active: formData.active
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("Erro: " + data.error);
      } else {
        alert("Usuário criado com sucesso!");
        setShowCreateModal(false);
        setFormData({ name: "", email: "", password: "", role: "usuario", active: true });
        fetchUsers();
      }
    })
    .catch(() => alert("Erro ao criar usuário"));
  };

  const openEditModal = (user: User) => {
    console.log("Abrindo modal de edição para usuário:", user);
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: Boolean(user.active)
    });
    setShowEditModal(true);
  };

  const handleEditUser = async () => {
    if (!editingUser || !formData.name) {
      alert("Nome é obrigatório!");
      return;
    }

    const payload = {
      name: formData.name,
      role: formData.role,
      active: formData.active ? 1 : 0
    };

    console.log("=== DEBUG EDIÇÃO ===");
    console.log("ID do usuário sendo editado:", editingUser.id);
    console.log("Payload enviado:", JSON.stringify(payload, null, 2));
    console.log("Role original:", editingUser.role);
    console.log("Role novo:", formData.role);
    console.log("URL da requisição:", `${API_BASE}/api/auth/users/${editingUser.id}`);

    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("Status HTTP da resposta:", res.status);
      
      const data = await res.json();
      console.log("Resposta completa da API:", data);
      
      if (data.error) {
        console.error("Erro retornado pela API:", data.error);
        alert("❌ Erro: " + data.error);
      } else {
        console.log("Resposta indica sucesso, verificando persistência...");
        
        // Fechar modal e limpar estado
        setShowEditModal(false);
        const editedUserId = editingUser.id;
        const expectedRole = formData.role;
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "usuario", active: true });
        
        // Aguardar um pouco e recarregar
        setTimeout(async () => {
          console.log("Recarregando lista de usuários...");
          await fetchUsers();
          
          // Verificar se a mudança persistiu (após fetchUsers atualizar o estado)
          setTimeout(() => {
            const updatedUser = users.find(u => u.id === editedUserId);
            console.log("Usuário após recarregar:", updatedUser);
            
            if (updatedUser) {
              alert("✅ Usuário atualizado com sucesso!");
            }
          }, 500);
        }, 1000);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("❌ Erro ao editar usuário: " + (error as Error).message);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (!confirm(`Desativar usuário ${user.name}?`)) return;

    fetch(`${API_BASE}/api/auth/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ active: 0 })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("Erro: " + data.error);
      } else {
        alert("Usuário desativado!");
        fetchUsers();
      }
    })
    .catch(error => {
      alert("Erro ao desativar usuário: " + error.message);
    });
  };

  const handleResetPassword = (user: User) => {
    const newPassword = prompt("Nova senha (mínimo 8 caracteres):");
    if (!newPassword || newPassword.length < 8) {
      alert("Senha deve ter pelo menos 8 caracteres!");
      return;
    }

    fetch(`${API_BASE}/api/auth/users/${user.id}/reset_password`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ new_password: newPassword })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("Erro: " + data.error);
      } else {
        alert("Senha alterada com sucesso!");
      }
    })
    .catch(() => alert("Erro ao alterar senha"));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      `}</style>
      {/* Sidebar */}
      <div style={{
        width: "16rem",
        backgroundColor: "#242c44",
        color: "white",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Logo */}
        <div style={{
          padding: "1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
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
                borderRadius: "0.5rem"
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div style={{
              display: "none",
              width: "2.5rem",
              height: "2.5rem",
              backgroundColor: "white",
              color: "#242c44",
              borderRadius: "0.5rem",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "0.875rem"
            }}>
              SGC
            </div>
            <div>
              <h1 style={{ fontWeight: "bold", fontSize: "1.125rem", margin: 0, fontFamily: "'Poppins', sans-serif" }}>SGC</h1>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem", margin: 0 }}>Sistema de Gerenciamento Central</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{
          padding: "1rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "2.5rem",
              height: "2.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "600"
            }}>
              {currentUser.name?.[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "500", margin: 0 }}>{currentUser.name}</p>
              <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem", margin: 0 }}>
                {ROLE_LABELS[currentUser.role] || currentUser.role}
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
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => window.location.href = "/"}
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
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <Home size={20} />
            <span>Início</span>
          </button>
          
          <div style={{
            width: "100%",
            textAlign: "left",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <Users size={20} />
            <span>Usuários</span>
          </div>

          <button
            onClick={() => window.location.href = "/profile"}
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
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <User size={20} />
            <span>Meu Perfil</span>
          </button>
          
          <button style={{
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
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <BarChart3 size={20} />
            <span>Relatórios</span>
          </button>

          <button style={{
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
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 2rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>
                Gestão de Usuários
              </h1>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                Gerencie usuários, permissões e acessos do sistema
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <span>+</span>
              <span>Criar Usuário</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "2rem" }}>
          {/* Stats Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "1.5rem", 
            marginBottom: "2rem" 
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Total de Usuários</p>
                  <p style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", margin: "0.25rem 0 0 0" }}>
                    {users.length}
                  </p>
                </div>
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor: "#dbeafe",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Users size={24} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Usuários Ativos</p>
                  <p style={{ fontSize: "2rem", fontWeight: "700", color: "#059669", margin: "0.25rem 0 0 0" }}>
                    {users.filter(u => u.active).length}
                  </p>
                </div>
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor: "#d1fae5",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <User size={24} color="#059669" />
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Administradores</p>
                  <p style={{ fontSize: "2rem", fontWeight: "700", color: "#dc2626", margin: "0.25rem 0 0 0" }}>
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                </div>
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor: "#fee2e2",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Settings size={24} color="#dc2626" />
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>Usuários Inativos</p>
                  <p style={{ fontSize: "2rem", fontWeight: "700", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                    {users.filter(u => !u.active).length}
                  </p>
                </div>
                <div style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <User size={24} color="#6b7280" />
                </div>
              </div>
            </div>
          </div>

          {/* Loading/Error States */}
          {loading && (
            <div style={{
              backgroundColor: "white",
              padding: "3rem",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              textAlign: "center",
              color: "#6b7280"
            }}>
              Carregando usuários...
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.75rem",
              padding: "1rem",
              color: "#b91c1c",
              marginBottom: "1.5rem"
            }}>
              Erro: {error}
            </div>
          )}

          {/* Users Table */}
          {!loading && !error && (
            <div style={{
              backgroundColor: "white",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              overflow: "hidden"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "#f9fafb" }}>
                  <tr>
                    <th style={{ 
                      textAlign: "left", 
                      padding: "0.75rem 1.5rem", 
                      fontSize: "0.75rem", 
                      fontWeight: "500", 
                      color: "#6b7280", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      Usuário
                    </th>
                    <th style={{ 
                      textAlign: "left", 
                      padding: "0.75rem 1.5rem", 
                      fontSize: "0.75rem", 
                      fontWeight: "500", 
                      color: "#6b7280", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      Perfil
                    </th>
                    <th style={{ 
                      textAlign: "left", 
                      padding: "0.75rem 1.5rem", 
                      fontSize: "0.75rem", 
                      fontWeight: "500", 
                      color: "#6b7280", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      textAlign: "left", 
                      padding: "0.75rem 1.5rem", 
                      fontSize: "0.75rem", 
                      fontWeight: "500", 
                      color: "#6b7280", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      Criado em
                    </th>
                    <th style={{ 
                      textAlign: "right", 
                      padding: "0.75rem 1.5rem", 
                      fontSize: "0.75rem", 
                      fontWeight: "500", 
                      color: "#6b7280", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ 
                        padding: "3rem 1.5rem", 
                        textAlign: "center", 
                        color: "#6b7280" 
                      }}>
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{
                              width: "2.5rem",
                              height: "2.5rem",
                              backgroundColor: "#e5e7eb",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "0.75rem",
                              fontWeight: "500",
                              color: "#6b7280"
                            }}>
                              {user.name[0]}
                            </div>
                            <div>
                              <p style={{ fontWeight: "500", color: "#111827", margin: 0 }}>
                                {user.name}
                              </p>
                              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span style={{
                            display: "inline-flex",
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            borderRadius: "9999px",
                            backgroundColor: ROLE_COLORS[user.role] + "20",
                            color: ROLE_COLORS[user.role] || "#6b7280"
                          }}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span style={{
                            display: "inline-flex",
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            borderRadius: "9999px",
                            backgroundColor: user.active ? "#d1fae520" : "#fee2e220",
                            color: user.active ? "#059669" : "#dc2626"
                          }}>
                            {user.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                          {formatDate(user.created_at)}
                        </td>
                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                            <button
                              onClick={() => openEditModal(user)}
                              style={{
                                backgroundColor: "#3b82f6",
                                color: "white",
                                padding: "0.25rem 0.75rem",
                                border: "none",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                cursor: "pointer"
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              style={{
                                backgroundColor: "#d97706",
                                color: "white",
                                padding: "0.25rem 0.75rem",
                                border: "none",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                cursor: "pointer"
                              }}
                            >
                              Resetar Senha
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              style={{
                                backgroundColor: "#dc2626",
                                color: "white",
                                padding: "0.25rem 0.75rem",
                                border: "none",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                                cursor: "pointer"
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

      {/* Modal Criar Usuário */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            width: "100%",
            maxWidth: "28rem"
          }}>
            <div style={{
              padding: "1.5rem 1.5rem 1rem 1.5rem",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827", margin: 0 }}>
                Criar Novo Usuário
              </h3>
            </div>
            
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box"
                  }}
                  minLength={8}
                  required
                />
                <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                  Mínimo 8 caracteres
                </p>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  Perfil
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box"
                  }}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                <label htmlFor="active" style={{ fontSize: "0.875rem", color: "#111827" }}>
                  Usuário ativo
                </label>
              </div>
              
              <div style={{ display: "flex", gap: "0.75rem", paddingTop: "1rem" }}>
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
                    fontWeight: "500"
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
                    fontWeight: "500"
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
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            width: "100%",
            maxWidth: "28rem"
          }}>
            <div style={{
              padding: "1.5rem 1.5rem 1rem 1.5rem",
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827", margin: 0 }}>
                Editar Usuário
              </h3>
            </div>
            
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box"
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    boxSizing: "border-box"
                  }}
                />
                <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                  E-mail não pode ser alterado
                </p>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                  Perfil
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    console.log("Mudando role para:", e.target.value);
                    setFormData({ ...formData, role: e.target.value });
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    boxSizing: "border-box"
                  }}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="active-edit"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  style={{ marginRight: "0.5rem" }}
                />
                <label htmlFor="active-edit" style={{ fontSize: "0.875rem", color: "#111827" }}>
                  Usuário ativo
                </label>
              </div>
              
              <div style={{ display: "flex", gap: "0.75rem", paddingTop: "1rem" }}>
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
                    fontWeight: "500"
                  }}
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
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
                    fontWeight: "500"
                  }}
                >
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