// frontend/src/utils/relatorioDownloader.ts
type Params = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params: Params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
  });
  return q.toString();
}

function getFilenameFromContentDisposition(dispo?: string | null, fallback?: string) {
  if (!dispo) return fallback;
  // Ex.: content-disposition: attachment; filename="Relatorio_Lista_Simples_Geral.xlsx"
  const m = /filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i.exec(dispo);
  if (m && m[1]) return decodeURIComponent(m[1]);
  return fallback;
}

export async function downloadRelatorio(opts: {
  baseUrl: string;
  path: string;                   // ex.: "/api/reports/lista_simples"
  params?: Params;                // ex.: { formato: 'xlsx', subsecao: 'Coxim' }
  filenamePrefix?: string;        // fallback se o servidor não mandar filename
  escopoKey?: string;             // nome do param para compor o fallback (ex.: 'subsecao')
}) {
  const { baseUrl, path, params = {}, filenamePrefix = "arquivo", escopoKey } = opts;

  // Monta URL
  const url = new URL(path, baseUrl);
  const query = buildQuery(params);
  if (query) url.search = query;

  // Recupera token do login
  const token = localStorage.getItem("authToken") || "";

  // Faz o request com Authorization SEMPRE
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
    },
  });

  // Trata erros (401, 403, etc.)
  if (!res.ok) {
    // Tenta ler JSON de erro do backend
    let msg = `Falha ao gerar arquivo (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // pode não ser JSON
    }
    alert(msg);
    throw new Error(msg);
  }

  // Extrai nome sugerido
  const dispo = res.headers.get("content-disposition");
  const extByType: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "text/csv": ".csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  };
  const contentType = res.headers.get("content-type") || "";
  const ext = Object.entries(extByType).find(([t]) => contentType.startsWith(t))?.[1] || "";

  let fallback = filenamePrefix;
  if (escopoKey && params[escopoKey]) fallback += `_${String(params[escopoKey])}`;
  if (!fallback.endsWith(ext)) fallback += ext;

  const filename = getFilenameFromContentDisposition(dispo, fallback);

  // Baixa o blob e faz o download
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || fallback;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
