import { useState } from "react";

const API_BASE = "http://192.168.0.64:5055";

type LoginResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: string };
  reports: unknown[];
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Falha no login.");
        return;
      }
      const { token, user } = data as LoginResponse;
      localStorage.setItem("authToken", token);
      localStorage.setItem("authUser", JSON.stringify(user));
      window.location.href = "/";
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f7f8" }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 360, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 10px 24px rgba(0,0,0,.06)" }}
      >
        {/* Logo da OAB */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img 
            src="/logos/logo_oabms.png" 
            alt="OAB MS" 
            style={{
              height: 100,
              width: "auto",
              marginBottom: 16,
              objectFit: "contain"
            }}
            onError={(e) => {
              // Fallback caso a imagem não carregue
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling.style.display = "block";
            }}
          />
          {/* Fallback caso a logo não carregue */}
          <div style={{
            display: "none",
            width: 64,
            height: 64,
            backgroundColor: "#2563eb",
            borderRadius: 12,
            margin: "0 auto 16px auto",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: 18
          }}>
            OAB
          </div>
          <h1 style={{ fontSize: 20, margin: 0, color: "#1f2937" }}>Sistema de Gerenciamento Central</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0 0" }}>OAB Mato Grosso do Sul</p>
        </div>

        <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@oabms.org.br"
          style={{ 
            width: "100%", 
            marginBottom: 12, 
            padding: "10px 12px", 
            borderRadius: 8, 
            border: "1px solid #d0d5dd",
            boxSizing: "border-box"
          }}
        />

        <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>Senha</label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              borderRadius: 8, 
              border: "1px solid #d0d5dd",
              boxSizing: "border-box"
            }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={{ 
              position: "absolute", 
              right: 8, 
              top: "50%", 
              transform: "translateY(-50%)",
              border: "none", 
              background: "transparent", 
              cursor: "pointer", 
              fontSize: 12 
            }}
          >
            {showPwd ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {error && (
          <div style={{ 
            background: "#fee4e2", 
            color: "#b42318", 
            padding: "8px 10px", 
            borderRadius: 8, 
            marginBottom: 12,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <button
          disabled={loading}
          type="submit"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#9ca3af" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p style={{ marginTop: 12, fontSize: 12, color: "#667085", textAlign: "center" }}>
          Use as credenciais que funcionam no Postman
        </p>
      </form>
    </div>
  );
}