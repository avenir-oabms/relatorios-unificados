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
import AdminUsersPanel from "./AdminUsersPanel";

const API_BASE = "http://192.168.0.64:5055";

/** Tipagens básicas (apenas para o topo/perfil) */
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

export default function AdminPage() {
  const token = localStorage.getItem("authToken");

  // próprio usuário (perfil)
  const storedUser: CurrentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const [me, setMe] = useState<CurrentUser>(storedUser || ({} as CurrentUser));

  // topo direito: badges (placeholders)
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [pendingTasks, setPendingTasks] = useState<number>(0);

  // modais
  const [showSelfEditModal, setShowSelfEditModal] = useState(false);
  const [selfForm, setSelfForm] = useState({
    name: storedUser?.name || "",
    email: storedUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    // futuros contadores podem vir do backend:
    // setUnreadAlerts(...); setPendingTasks(...);
  }, []);

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

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
            label="Gerencial"
            onClick={() => (window.location.href = "/management")}
            title="Administrar usuários e relatórios"
            active
          />

          <MenuButton
            icon={<BarChart3 size={18} />}
            label="Relatórios"
            onClick={() => (window.location.href = "/reports")}
            title={isAdmin ? "Relatórios" : "Acesso por perfil (em breve por departamento/pessoa)"}
          />

          {/* Demais itens – rótulos curtos */}
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
            padding: "0.6rem 1rem",
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

            {/* TOPO DIREITO */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

        {/* Conteúdo: agora apenas o miolo reutilizável */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.2rem" }}>
          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <AdminUsersPanel />
          </div>
        </div>
      </div>

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
              <p>Versão: 1.0.0 (placeholder) • Build: {new Date().toLocaleDateString("pt-BR")}</p>
              <p>Contato: ti@oabms.org.br (placeholder).</p>
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

      {/* Modal: Meu Perfil */}
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
    </div>
  );
}
