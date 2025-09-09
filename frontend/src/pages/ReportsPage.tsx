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
} from "lucide-react";
import { downloadRelatorio } from "../utils/relatorioDownloader";

const API_BASE = "http://192.168.0.64:5055";

type UserRole = "admin" | "tecnico" | "usuario" | "gerente" | "coordenador" | "diretor";
type FormatoSaida = "pdf" | "xlsx" | "csv";

type UserType = {
  id: number;
  name: string;
  email: string;
  role: UserRole | string;
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

/** ===== Modal do Relatório simples de Inscritos (Subseções) ===== */
function ModalRelatorioSimples({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: { subsecao: string; formato: FormatoSaida }) => void;
}) {
  const [subsecao, setSubsecao] = useState("");
  const [formato, setFormato] = useState<FormatoSaida>("pdf");
  if (!open) return null;

  return (
    <div aria-modal role="dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Relatório simples de Inscritos</h3>
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Subseção (opcional)</label>
            <input
              type="text"
              value={subsecao}
              onChange={(e) => setSubsecao(e.target.value)}
              placeholder="Ex.: Dourados — deixe em branco para Geral"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Se deixar em branco, o relatório será gerado como <b>Geral</b>.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Formato</label>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as FormatoSaida)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-400"
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="rounded-lg bg-[#242C44] px-4 py-2 font-medium text-white hover:opacity-90"
            onClick={() => onSubmit({ subsecao, formato })}
          >
            Gerar
          </button>
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

  // Abas internas
  const [activeTab, setActiveTab] = useState<"cadastral" | "usuarios" | "operacional" | "subsecoes">("cadastral");

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

  const TabButton = ({
    label,
    active,
    onClick,
    disabled,
  }: {
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        border: "1px solid " + (active ? "#111827" : "#e5e7eb"),
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontWeight: 600,
        fontSize: 13,
      }}
      title={disabled ? "Em breve" : undefined}
    >
      {label}
    </button>
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
              {/* Abas internas */}
              <div
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <TabButton label="Cadastral" active={activeTab === "cadastral"} onClick={() => setActiveTab("cadastral")} />
                <TabButton label="Usuários (em breve)" disabled />
                <TabButton label="Operacional (em breve)" disabled />
                <TabButton label="Subseções" active={activeTab === "subsecoes"} onClick={() => setActiveTab("subsecoes")} />
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
                  <p style={{ margin: "0.25rem 0 1rem 0", color: "#6b7280" }}>
                    Base para conectar ao SQL Server e exibir KPIs. (Placeholders)
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 14,
                          background: "#f9fafb",
                        }}
                      >
                        <div style={{ height: 10, width: "40%", background: "#e5e7eb", borderRadius: 6 }} />
                        <div
                          style={{
                            marginTop: 10,
                            height: 28,
                            width: "60%",
                            background: "#e5e7eb",
                            borderRadius: 6,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === "subsecoes" && (
                <section
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                    Subseções
                  </h3>
                  <p style={{ margin: "0.25rem 0 1rem 0", color: "#6b7280" }}>
                    Selecione um relatório para gerar.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Card: Relatório simples de Inscritos */}
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-1 text-sm font-semibold">Relatório simples de Inscritos</div>
                      <p className="mb-3 text-xs text-gray-600">
                        Lista por subseção (ou Geral), com exportação em PDF, Excel ou CSV.
                      </p>
                      <button
                        onClick={() => setOpenRelatorioSimples(true)}
                        className="rounded-lg bg-[#242C44] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Abrir
                      </button>
                    </div>

                    {/* Espaço para futuros relatórios */}
                    <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400">
                      (em breve) Outros relatórios de Subseções
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
          await downloadRelatorio({
            baseUrl: API_BASE,
            // 🔁 usa o prefixo certo do backend (app.py registra /api/reports)
            path: "/api/reports/lista_simples",
            params: {
              formato: params.formato,
              subsecao: params.subsecao,
              // se PDF e sem subseção → gerar um PDF por subseção (ZIP)
              ...(params.formato === "pdf" && !params.subsecao ? { modo: "multi" } : {}),
            },
            filenamePrefix: "Relatorio_Lista_Simples",
            escopoKey: "subsecao",
          });
          setOpenRelatorioSimples(false);
        }}
      />
    </div>
  );
}
