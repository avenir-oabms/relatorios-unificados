// frontend/src/pages/ReportsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  BarChart3,
  Settings,
  Bell,
  ClipboardList,
  LogOut,
  Pencil,
  Info,
  Lock,
  ChevronDown,
} from "lucide-react";
import { downloadRelatorio } from "../utils/relatorioDownloader";

const API_BASE = "http://192.168.0.64:5055";

type UserRole = "admin" | "tecnico" | "usuario" | "gerente" | "coordenador" | "diretor";
type FormatoSaida = "pdf-retrato" | "pdf-paisagem" | "xlsx" | "csv";

type UserType = {
  id: number;
  name: string;
  email: string;
  role: UserRole | string;
};

type SubsecaoType = {
  id: number;
  nome: string;
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

/** ===== Modal do Relatório simples de Inscritos ===== */
function ModalRelatorioSimples({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: { subsecao: string; formato: FormatoSaida; campos: string[] }) => void;
}) {
  const [subsecaoSelecionada, setSubsecaoSelecionada] = useState<number | null>(null);
  const [formato, setFormato] = useState<FormatoSaida>("pdf-retrato");
  const [subsecoes, setSubsecoes] = useState<SubsecaoType[]>([]);
  const [loadingSubsecoes, setLoadingSubsecoes] = useState(false);
  
  // Campos disponíveis para seleção
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>([
    "OAB", "Nome", "CPF/CNPJ", "Situacao", "DataNascimento", "DataCompromisso", "TelefoneCelular", "Email", "Subsecao"
  ]);

  const camposDisponiveis = [
    { id: "OAB", label: "Número OAB", obrigatorio: true },
    { id: "Nome", label: "Nome Completo", obrigatorio: true },
    { id: "CPF/CNPJ", label: "CPF/CNPJ", obrigatorio: false },
    { id: "Situacao", label: "Situação", obrigatorio: false },
    { id: "DataNascimento", label: "Data de Nascimento", obrigatorio: false },
    { id: "DataCompromisso", label: "Data do Compromisso", obrigatorio: false },
    { id: "TelefoneCelular", label: "Telefone Celular", obrigatorio: false },
    { id: "Email", label: "E-mail", obrigatorio: false },
    { id: "Subsecao", label: "Subseção", obrigatorio: false },
  ];

  // Carregar subseções quando o modal abrir
  useEffect(() => {
    if (open) {
      carregarSubsecoes();
    }
  }, [open]);

  const carregarSubsecoes = async () => {
    setLoadingSubsecoes(true);
    try {
      const response = await fetch(`${API_BASE}/api/reports/subsecoes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const data = await response.json();
      
      if (data.error) {
        console.error("Erro ao carregar subseções:", data.error);
        setSubsecoes([]);
      } else {
        setSubsecoes(data.items || []);
      }
    } catch (error) {
      console.error("Erro ao carregar subseções:", error);
      setSubsecoes([]);
    } finally {
      setLoadingSubsecoes(false);
    }
  };

  const toggleCampo = (campoId: string) => {
    const campo = camposDisponiveis.find(c => c.id === campoId);
    if (campo?.obrigatorio) return; // Não permite desmarcar campos obrigatórios

    setCamposSelecionados(prev => 
      prev.includes(campoId)
        ? prev.filter(id => id !== campoId)
        : [...prev, campoId]
    );
  };

  const handleSubmit = () => {
    // Encontrar o nome da subseção selecionada ou usar string vazia para "Todas"
    const nomeSubsecao = subsecaoSelecionada 
      ? subsecoes.find(s => s.id === subsecaoSelecionada)?.nome || ""
      : "";
    
    onSubmit({ 
      subsecao: nomeSubsecao, 
      formato, 
      campos: camposSelecionados 
    });
  };

  if (!open) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "20px",
          borderRadius: "20px",
          background: "white",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "modalSlideIn 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>
          {`
            @keyframes modalSlideIn {
              from {
                opacity: 0;
                transform: scale(0.9) translateY(20px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}
        </style>

        {/* Header do Modal */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "24px",
          position: "relative",
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: "20px", 
            fontWeight: 600,
            paddingRight: "40px",
          }}>
            Relatório Simples de Inscritos
          </h3>
          <p style={{ 
            margin: "4px 0 0 0", 
            fontSize: "14px", 
            opacity: 0.9,
          }}>
            Configure os parâmetros e campos do relatório
          </p>
          
          <button 
            onClick={onClose}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              transition: "background 0.2s ease",
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gap: "20px" }}>
            
            {/* Seção de Filtros */}
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600, color: "#374151" }}>
                Filtros do Relatório
              </h4>
              
              <div style={{ display: "grid", gap: "16px" }}>
                {/* Subseção - NOVO DROPDOWN */}
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "6px", 
                    fontSize: "14px", 
                    fontWeight: 500, 
                    color: "#374151" 
                  }}>
                    Subseção (opcional)
                  </label>
                  
                  <div style={{ position: "relative" }}>
                    <select
                      value={subsecaoSelecionada || ""}
                      onChange={(e) => setSubsecaoSelecionada(e.target.value ? Number(e.target.value) : null)}
                      disabled={loadingSubsecoes}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 12px",
                        paddingRight: "40px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                        outline: "none",
                        background: "white",
                        cursor: loadingSubsecoes ? "not-allowed" : "pointer",
                        appearance: "none",
                        transition: "border-color 0.2s ease",
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    >
                      <option value="">
                        {loadingSubsecoes ? "Carregando..." : "Todas as subseções (Relatório Geral)"}
                      </option>
                      {subsecoes.map((subsecao) => (
                        <option key={subsecao.id} value={subsecao.id}>
                          {subsecao.nome}
                        </option>
                      ))}
                    </select>
                    
                    {/* Ícone do dropdown */}
                    <ChevronDown 
                      size={16} 
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#6b7280",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                  
                  <p style={{ 
                    margin: "4px 0 0 0", 
                    fontSize: "12px", 
                    color: "#6b7280" 
                  }}>
                    Selecione uma subseção específica ou deixe em "Todas" para relatório geral
                  </p>
                </div>

                {/* Formato */}
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "6px", 
                    fontSize: "14px", 
                    fontWeight: 500, 
                    color: "#374151" 
                  }}>
                    Formato de Saída
                  </label>
                  <select
                    value={formato}
                    onChange={(e) => setFormato(e.target.value as FormatoSaida)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <option value="pdf-retrato">📄 PDF - Retrato (ideal para poucos campos)</option>
                    <option value="pdf-paisagem">📰 PDF - Paisagem (ideal para muitos campos)</option>
                    <option value="xlsx">📊 Excel (.xlsx) - Planilha com formatação</option>
                    <option value="csv">📋 CSV - Dados puros para importação</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Seção de Campos */}
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600, color: "#374151" }}>
                Campos do Relatório
              </h4>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280" }}>
                Selecione quais informações incluir no relatório. Campos obrigatórios não podem ser desmarcados.
              </p>
              
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "8px",
                background: "#f9fafb",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
              }}>
                {camposDisponiveis.map((campo) => (
                  <label
                    key={campo.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px",
                      borderRadius: "6px",
                      cursor: campo.obrigatorio ? "not-allowed" : "pointer",
                      background: camposSelecionados.includes(campo.id) ? "#e0f2fe" : "transparent",
                      transition: "background 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      if (!campo.obrigatorio) {
                        e.currentTarget.style.background = camposSelecionados.includes(campo.id) ? "#b3e5fc" : "#f0f9ff";
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = camposSelecionados.includes(campo.id) ? "#e0f2fe" : "transparent";
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={camposSelecionados.includes(campo.id)}
                      onChange={() => toggleCampo(campo.id)}
                      disabled={campo.obrigatorio}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "#667eea",
                        cursor: campo.obrigatorio ? "not-allowed" : "pointer",
                      }}
                    />
                    <span style={{
                      fontSize: "14px",
                      fontWeight: campo.obrigatorio ? 600 : 400,
                      color: campo.obrigatorio ? "#374151" : "#4b5563",
                    }}>
                      {campo.label}
                      {campo.obrigatorio && (
                        <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              
              <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
                <span style={{ color: "#ef4444" }}>*</span> Campos obrigatórios
              </p>
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div style={{
          background: "#f9fafb",
          padding: "20px 24px",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            {camposSelecionados.length} campos selecionados
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                background: "white",
                color: "#374151",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "white";
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: "10px 24px",
                border: "none",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "transform 0.2s ease",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);

  // Badges (placeholders)
  const [unreadAlerts] = useState<number>(0);
  const [pendingTasks] = useState<number>(0);

  // Modal: Meu Perfil
  const [showSelfEditModal, setShowSelfEditModal] = useState(false);
  const [selfForm, setSelfForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Modal: Sobre / Créditos
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Abas internas - APENAS 3 ABAS
  const [activeTab, setActiveTab] = useState<"cadastral" | "financeiro" | "etico">("cadastral");
  
  // Estados para submenus dropdown
  const [showCadastralDropdown, setShowCadastralDropdown] = useState(false);
  const [showFinanceiroDropdown, setShowFinanceiroDropdown] = useState(false);
  const [showEticoDropdown, setShowEticoDropdown] = useState(false);

  // Modal Relatório Simples
  const [openRelatorioSimples, setOpenRelatorioSimples] = useState(false);

  useEffect(() => {
    const currentUser = getUserFromStorage();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  function handleLogout() {
    localStorage.clear();
    navigate("/login");
  }

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
    if (!user?.id) return alert("Usuário atual não encontrado.");
    if (!selfForm.name.trim()) return alert("Informe um nome válido.");

    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: selfForm.name }),
      });
      const data = await res.json();
      if (data.error) return alert("Erro ao salvar: " + data.error);

      const updated = { ...user, name: selfForm.name };
      localStorage.setItem("authUser", JSON.stringify(updated));
      setUser(updated);
      alert("Nome atualizado com sucesso!");
    } catch {
      alert("Erro ao atualizar nome.");
    }
  }

  async function handleChangeMyPassword() {
    if (!selfForm.currentPassword || !selfForm.newPassword) return alert("Informe a senha atual e a nova senha.");
    if (selfForm.newPassword.length < 8) return alert("A nova senha deve ter pelo menos 8 caracteres.");
    if (selfForm.newPassword !== selfForm.confirmNewPassword) return alert("A confirmação de senha não confere.");
    try {
      const res = await fetch(`${API_BASE}/api/auth/change_password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: selfForm.currentPassword,
          new_password: selfForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.error) return alert("Erro ao alterar senha: " + data.error);
      alert("Senha alterada com sucesso!");
      setSelfForm((p) => ({ ...p, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
    } catch {
      alert("Erro ao alterar senha.");
    }
  }

  if (!user) return null;
  const isAdmin = user.role === "admin";

  // Helpers UI
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
        padding: "0.55rem 0.8rem",
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
      <span style={{ fontSize: ".875rem" }}>{label}</span>
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
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
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
          <MenuButton icon={<Home size={18} />} label="Início" onClick={() => navigate("/")} />
          {user.role === "admin" && (
            <MenuButton icon={<Users size={18} />} label="Gerencial" onClick={() => navigate("/management")} title="Administrar usuários e relatórios" />
          )}
          <MenuButton
            icon={<BarChart3 size={18} />}
            label="Relatórios"
            active
            onClick={() => navigate("/reports")}
            title="Relatórios"
          />
          <MenuButton icon={<ClipboardList size={18} />} label="Comunicado Interno" onClick={() => navigate("/")} title="CI - Sistema de Comunicado Interno" />
          <MenuButton icon={<ClipboardList size={18} />} label="Chamados" onClick={() => navigate("/")} title="Central de Chamados" />
          <MenuButton icon={<Settings size={18} />} label="Ajustes" onClick={() => navigate("/")} title="Ajustes Gerenciais" />
          <MenuButton icon={<Bell size={18} />} label="Avisos" onClick={() => navigate("/")} title="Central de Avisos" />
          <MenuButton icon={<ClipboardList size={18} />} label="Calendário" onClick={() => navigate("/")} title="Calendário Institucional" />
          <MenuButton icon={<ClipboardList size={18} />} label="Tarefas" onClick={() => navigate("/")} title="Sistema de Tarefas" />
          <MenuButton icon={<Bell size={18} />} label="Notificações" onClick={() => navigate("/notifications")} title="Central de Notificações" />
        </nav>

        {/* Rodapé / Créditos */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "0.6rem 0.8rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            fontSize: "0.72rem",
            color: "rgba(255,255,255,.85)",
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
          <div>
            Desenvolvido pelo <strong>Departamento de Tecnologia da Informação</strong> OAB/MS
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header mais estreito */}
        <div
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "0.6rem 1rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>Relatórios</h1>
              <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0.2rem 0 0 0" }}>
                Indicadores e análises do sistema
              </p>
            </div>

            {/* Topo direito: atalhos com badge + perfil */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BadgeIcon icon={<Bell size={16} />} title="Notificações" count={unreadAlerts} />
              <BadgeIcon icon={<ClipboardList size={16} />} title="Tarefas" count={pendingTasks} />

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
                  title={user.name}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                  {ROLE_LABELS[user.role as string] || (user.role as string)}
                </div>
              </div>

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
                title={user.email}
              >
                {user.name?.[0]}
              </div>

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
        <main style={{ flex: 1, padding: "1.2rem", overflow: "auto" }}>
          {!isAdmin ? (
            // Bloqueio por perfil
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "2rem",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                color: "#374151",
              }}
            >
              <Lock size={38} />
              <h3 style={{ margin: "0.6rem 0 0.25rem 0" }}>Acesso restrito</h3>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Esta área é permitida apenas para o perfil <strong>Administrador</strong>.
              </p>
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => navigate("/")}
                  style={{
                    background: "#111827",
                    color: "white",
                    padding: "0.5rem 0.9rem",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Voltar para Início
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Menu horizontal com APENAS 3 ABAS */}
              <div
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: "#2c3e50",
                    position: "relative",
                  }}
                >
                  {/* Tab Cadastral */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => setShowCadastralDropdown(true)}
                    onMouseLeave={() => setTimeout(() => setShowCadastralDropdown(false), 150)}
                  >
                    <button
                      onClick={() => setActiveTab("cadastral")}
                      style={{
                        padding: "12px 20px",
                        background: activeTab === "cadastral" ? "#27ae60" : "#34495e",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        transition: "background 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        if (activeTab !== "cadastral") {
                          e.currentTarget.style.background = "#27ae60";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (activeTab !== "cadastral") {
                          e.currentTarget.style.background = "#34495e";
                        }
                      }}
                    >
                      Cadastral
                    </button>

                    {/* Dropdown Cadastral */}
                    {showCadastralDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          background: "#2c3e50",
                          minWidth: 220,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                          zIndex: 1000,
                        }}
                        onMouseEnter={() => setShowCadastralDropdown(true)}
                        onMouseLeave={() => setShowCadastralDropdown(false)}
                      >
                        <div
                          onClick={() => {
                            setActiveTab("cadastral");
                            setOpenRelatorioSimples(true);
                            setShowCadastralDropdown(false);
                          }}
                          style={{
                            padding: "12px 20px",
                            background: "#27ae60",
                            color: "white",
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "background 0.2s ease",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#2ecc71")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "#27ae60")}
                        >
                          Listagem Simples - Inscritos
                        </div>
                        <div
                          style={{
                            padding: "12px 20px",
                            color: "#bdc3c7",
                            fontSize: 13,
                            cursor: "not-allowed",
                          }}
                        >
                          Dashboard Avançado (em breve)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tab Financeiro */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => setShowFinanceiroDropdown(true)}
                    onMouseLeave={() => setTimeout(() => setShowFinanceiroDropdown(false), 150)}
                  >
                    <button
                      onClick={() => setActiveTab("financeiro")}
                      style={{
                        padding: "12px 20px",
                        background: activeTab === "financeiro" ? "#27ae60" : "#34495e",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        transition: "background 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        if (activeTab !== "financeiro") {
                          e.currentTarget.style.background = "#27ae60";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (activeTab !== "financeiro") {
                          e.currentTarget.style.background = "#34495e";
                        }
                      }}
                    >
                      Financeiro
                    </button>

                    {/* Dropdown Financeiro */}
                    {showFinanceiroDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          background: "#2c3e50",
                          minWidth: 220,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                          zIndex: 1000,
                        }}
                        onMouseEnter={() => setShowFinanceiroDropdown(true)}
                        onMouseLeave={() => setShowFinanceiroDropdown(false)}
                      >
                        <div
                          style={{
                            padding: "12px 20px",
                            color: "#bdc3c7",
                            fontSize: 13,
                            cursor: "not-allowed",
                          }}
                        >
                          Relatório de Anuidades (em breve)
                        </div>
                        <div
                          style={{
                            padding: "12px 20px",
                            color: "#bdc3c7",
                            fontSize: 13,
                            cursor: "not-allowed",
                          }}
                        >
                          Inadimplência (em breve)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tab Ético */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => setShowEticoDropdown(true)}
                    onMouseLeave={() => setTimeout(() => setShowEticoDropdown(false), 150)}
                  >
                    <button
                      onClick={() => setActiveTab("etico")}
                      style={{
                        padding: "12px 20px",
                        background: activeTab === "etico" ? "#27ae60" : "#34495e",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        transition: "background 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        if (activeTab !== "etico") {
                          e.currentTarget.style.background = "#27ae60";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (activeTab !== "etico") {
                          e.currentTarget.style.background = "#34495e";
                        }
                      }}
                    >
                      Ético
                    </button>

                    {/* Dropdown Ético */}
                    {showEticoDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          background: "#2c3e50",
                          minWidth: 220,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                          zIndex: 1000,
                        }}
                        onMouseEnter={() => setShowEticoDropdown(true)}
                        onMouseLeave={() => setShowEticoDropdown(false)}
                      >
                        <div
                          style={{
                            padding: "12px 20px",
                            color: "#bdc3c7",
                            fontSize: 13,
                            cursor: "not-allowed",
                          }}
                        >
                          Processos Éticos (em breve)
                        </div>
                        <div
                          style={{
                            padding: "12px 20px",
                            color: "#bdc3c7",
                            fontSize: 13,
                            cursor: "not-allowed",
                          }}
                        >
                          Tribunal de Ética (em breve)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Conteúdo das abas */}
              {activeTab === "cadastral" && (
                <section
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                    Indicadores — Cadastral
                  </h3>
                  <p style={{ margin: "0.25rem 0 1.5rem 0", color: "#6b7280" }}>
                    Principais métricas do sistema cadastral
                  </p>

                  {/* KPIs Dashboard */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 16,
                      marginBottom: 24,
                    }}
                  >
                    {/* KPI 1 - Total de Inscritos */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: 12,
                        padding: 20,
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Total de Inscritos</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>12.547</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          <span style={{ color: "#a7f3d0" }}>↗ +2.3%</span> vs mês anterior
                        </div>
                      </div>
                      <div style={{ 
                        position: "absolute", 
                        top: 10, 
                        right: 10, 
                        fontSize: 40, 
                        opacity: 0.2 
                      }}>👥</div>
                    </div>

                    {/* KPI 2 - Inscritos Ativos */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        borderRadius: 12,
                        padding: 20,
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Inscritos Ativos</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>11.892</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          94.8% do total
                        </div>
                      </div>
                      <div style={{ 
                        position: "absolute", 
                        top: 10, 
                        right: 10, 
                        fontSize: 40, 
                        opacity: 0.2 
                      }}>✅</div>
                    </div>

                    {/* KPI 3 - Por Subseção */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        borderRadius: 12,
                        padding: 20,
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Subseções Ativas</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>79</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          Campo Grande: 3.247 inscritos
                        </div>
                      </div>
                      <div style={{ 
                        position: "absolute", 
                        top: 10, 
                        right: 10, 
                        fontSize: 40, 
                        opacity: 0.2 
                      }}>🏢</div>
                    </div>

                    {/* KPI 4 - Novos Inscritos */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        borderRadius: 12,
                        padding: 20,
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative", zIndex: 2 }}>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Novos (Este Mês)</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>89</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          <span style={{ color: "#c4b5fd" }}>↗ +15%</span> vs agosto
                        </div>
                      </div>
                      <div style={{ 
                        position: "absolute", 
                        top: 10, 
                        right: 10, 
                        fontSize: 40, 
                        opacity: 0.2 
                      }}>📈</div>
                    </div>
                  </div>

                  {/* Relatórios Cadastrais */}
                  <div>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600, color: "#374151" }}>
                      Relatórios Cadastrais
                    </h4>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: 16 
                    }}>
                      {/* Card: Relatório simples de Inscritos - ATIVO */}
                      <div
                        style={{
                          position: "relative",
                          borderRadius: 12,
                          border: "2px solid #10b981",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "white",
                          padding: 20,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                        }}
                        onClick={() => setOpenRelatorioSimples(true)}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
                        }}
                      >
                        {/* Badge de Status */}
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            background: "rgba(255, 255, 255, 0.2)",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Ativo
                        </div>
                        
                        <div style={{ marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                            Relatório simples de Inscritos
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
                            Lista por subseção (ou Geral), com exportação em PDF, Excel ou CSV.
                          </p>
                        </div>

                        {/* Informações adicionais */}
                        <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: 11, opacity: 0.8 }}>
                          <span>📄 PDF - Retrato</span>
                          <span>📄 PDF - Paisagem</span>
                          <span>📊 Excel</span>
                          <span>📋 CSV</span>
                        </div>

                        <button
                          style={{
                            width: "100%",
                            background: "rgba(255, 255, 255, 0.15)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            borderRadius: 8,
                            padding: "8px 16px",
                            color: "white",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                          }}
                        >
                          Abrir Relatório
                        </button>
                      </div>

                      {/* Card: Placeholder */}
                      <div
                        style={{
                          borderRadius: 12,
                          border: "2px dashed #d1d5db",
                          background: "#f9fafb",
                          color: "#9ca3af",
                          padding: 20,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          minHeight: 140,
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>➕</div>
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                          Novos Relatórios
                        </h4>
                        <p style={{ margin: 0, fontSize: 12 }}>
                          Relatórios adicionais serão implementados
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "financeiro" && (
                <section
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                    Relatórios Financeiros
                  </h3>
                  <p style={{ margin: "0.25rem 0 1.5rem 0", color: "#6b7280" }}>
                    Relatórios de anuidades, inadimplência e controle financeiro
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                    {/* Placeholder */}
                    <div
                      style={{
                        borderRadius: 12,
                        border: "2px dashed #d1d5db",
                        background: "#f9fafb",
                        color: "#9ca3af",
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        minHeight: 160,
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        Relatórios Financeiros
                      </h4>
                      <p style={{ margin: 0, fontSize: 12 }}>
                        Relatórios financeiros em desenvolvimento
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "etico" && (
                <section
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                    Relatórios de Ética
                  </h3>
                  <p style={{ margin: "0.25rem 0 1.5rem 0", color: "#6b7280" }}>
                    Processos disciplinares e acompanhamento do Tribunal de Ética
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                    {/* Placeholder */}
                    <div
                      style={{
                        borderRadius: 12,
                        border: "2px dashed #d1d5db",
                        background: "#f9fafb",
                        color: "#9ca3af",
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        minHeight: 160,
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }}>⚖️</div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        Relatórios de Ética
                      </h4>
                      <p style={{ margin: 0, fontSize: 12 }}>
                        Relatórios de ética em desenvolvimento
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal: Relatório simples */}
      <ModalRelatorioSimples
        open={openRelatorioSimples}
        onClose={() => setOpenRelatorioSimples(false)}
        onSubmit={async (params) => {
          try {
            // CORREÇÃO PRINCIPAL: Processar o formato para separar orientação
            let formato = params.formato;
            let orientacao = "paisagem"; // padrão
            
            // Processar formatos compostos do frontend
            if (params.formato === "pdf-retrato") {
              formato = "pdf";
              orientacao = "retrato";
            } else if (params.formato === "pdf-paisagem") {
              formato = "pdf";
              orientacao = "paisagem";
            }
            // xlsx e csv permanecem inalterados
            
            console.log("Enviando parâmetros:", {
              formato,
              orientacao,
              subsecao: params.subsecao,
              campos: params.campos
            });

            await downloadRelatorio({
              baseUrl: API_BASE,
              path: "/api/reports/lista_simples",
              params: {
                formato: formato, // Agora será apenas "pdf", "xlsx" ou "csv"
                subsecao: params.subsecao,
                campos: params.campos.join(','),
                orientacao: orientacao, // Novo parâmetro específico
                ...(formato === "pdf" && !params.subsecao ? { modo: "multi" } : {}),
              },
              filenamePrefix: "Relatorio_Lista_Simples",
              escopoKey: "subsecao",
            });
            
            console.log("Relatório gerado com sucesso!");
            
          } catch (e: any) {
            console.error("Erro ao gerar relatório:", e);
            alert(e?.message || "Falha ao gerar relatório.");
          } finally {
            setOpenRelatorioSimples(false);
          }
        }}
      />
    </div>
  );
}