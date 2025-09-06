// frontend/src/lib/api.ts

const API_BASE = "http://192.168.0.64:5055"; // Está definido no próprio arquivo

// ==== Tipos ====
export type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "tecnico" | "usuario";
  active: boolean;
};

export type Aviso = {
  id: number;
  titulo: string;
  mensagem: string;
};

// ==== Helpers de Storage ====
export function getUserFromStorage(): User | null {
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

// ==== Fetch centralizado ====
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`Erro API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

// ==== AUTH ====
export const AuthAPI = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<User>("/auth/me"),
};

// ==== MURAL ====
export const MuralAPI = {
  listar: () => apiFetch<Aviso[]>("/mural"),
  criar: (aviso: Omit<Aviso, "id">) =>
    apiFetch<Aviso>("/mural", {
      method: "POST",
      body: JSON.stringify(aviso),
    }),
  remover: (id: number) =>
    apiFetch<{ status: string; id: number }>(`/mural/${id}`, {
      method: "DELETE",
    }),
};
