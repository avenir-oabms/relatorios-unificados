// Utilitário genérico para baixar relatórios (PDF, XLSX, CSV)
// Reutilize em todos os relatórios do sistema.

export type FormatoSaida = "pdf" | "xlsx" | "csv";

export type DownloadRelatorioInput = {
  /** Base do backend, ex.: "http://192.168.0.64:5055" */
  baseUrl: string;
  /** Caminho do endpoint, ex.: "/api/relatorios/lista_simples" */
  path: string;
  /** Parâmetros de query; ex.: { formato: 'pdf', subsecao: 'Dourados' } */
  params: Record<string, string | number | boolean | undefined | null>;
  /** Prefixo do arquivo; ex.: "Relatorio_Lista_Simples" */
  filenamePrefix: string;
  /** Campo que representa o escopo para compor o nome; ex.: "subsecao" */
  escopoKey?: string;
  /** Força extensão (se não vier de "formato") */
  forceExt?: "pdf" | "xlsx" | "csv";
  /** Nome do header do token (padrão "Authorization") */
  authHeaderName?: string;
  /** Prefixo do valor do token (padrão "Bearer ") */
  authPrefix?: string;
};

export async function downloadRelatorio({
  baseUrl,
  path,
  params,
  filenamePrefix,
  escopoKey = "subsecao",
  forceExt,
  authHeaderName = "Authorization",
  authPrefix = "Bearer ",
}: DownloadRelatorioInput): Promise<void> {
  const token = localStorage.getItem("authToken") || "";

  // Monta querystring
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) qs.set(k, String(v));
  });

  const url = `${trimRight(baseUrl)}/${trimLeft(path)}?${qs.toString()}`;

  // Tenta baixar via fetch (permite header Authorization)
  try {
    const headers: Record<string, string> = {};
    if (token) headers[authHeaderName] = `${authPrefix}${token}`;

    const resp = await fetch(url, { headers });

    // Se o servidor não aceitar o fetch (CORS, etc), cai no fallback
    if (!resp.ok || !resp.body) {
      window.open(url, "_blank");
      return;
    }

    const blob = await resp.blob();

    // Define extensão
    const formatoParam = String(params?.formato || "").toLowerCase();
    const ext =
      forceExt ||
      (formatoParam === "xlsx" ? "xlsx" : formatoParam === "csv" ? "csv" : "pdf");

    // Define "escopo" a partir de escopoKey
    const rawEscopo = String(params?.[escopoKey] || "").trim();
    const escopo = rawEscopo.length ? rawEscopo : "Geral";

    // Nome final do arquivo
    const filename = `${filenamePrefix}_${sanitize(escopo)}.${ext}`;

    // Dispara download
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch (e) {
    console.error("downloadRelatorio: falha no fetch, aplicando fallback.", e);
    window.open(url, "_blank");
  }
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-\.]+/g, "");
}

function trimLeft(s: string) {
  return s.replace(/^\/+/, "");
}

function trimRight(s: string) {
  return s.replace(/\/+$/, "");
}
