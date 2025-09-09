from flask import Blueprint, request, jsonify, send_file
from functools import wraps
from sqlalchemy import text
from db import MySQLSession, MSSQLSession, ping_mysql, ping_mssql
from auth import verify_token

# ===== imports p/ geração de arquivos =====
import io, os, zipfile, datetime as dt
import pandas as pd

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.lib.units import mm

bp = Blueprint("reports", __name__, url_prefix="/api/reports")

@bp.get("/health/db")
def health_db():
    """
    Diagnóstico das conexões de banco.
    - mysql: { ok: bool, value?: 1, error?: str }
    - mssql: { ok: bool, value?: 1, error?: str }
    """
    return jsonify({
        "mysql": ping_mysql(),
        "mssql": ping_mssql(),
    })

# ===== Auth helper =====
def require_auth(f):
    @wraps(f)
    def _wrap(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        u = verify_token(token)
        if not u:
            return jsonify({"error": "Não autorizado"}), 401
        request.user = u
        return f(*args, **kwargs)
    return _wrap

def user_has_report(uid: int, report_key: str) -> bool:
    with MySQLSession() as s:
        row = s.execute(text("""
            SELECT 1
            FROM reports r
            JOIN report_permissions rp ON rp.report_id = r.id
            WHERE rp.user_id = :uid AND r.report_key = :rk
            LIMIT 1
        """), {"uid": uid, "rk": report_key}).first()
        return row is not None

# ================== CÓDIGO EXISTENTE ==================
@bp.get("/list")
@require_auth
def list_reports():
    uid = request.user["uid"]
    with MySQLSession() as s:
        rows = s.execute(text("""
            SELECT r.report_key AS `key`, r.module, r.label
            FROM reports r
            JOIN report_permissions rp ON rp.report_id = r.id
            WHERE rp.user_id = :uid
            ORDER BY r.module, r.label
        """), {"uid": uid}).mappings().all()

    grouped = {}
    for r in rows:
        grouped.setdefault(r["module"], []).append({"key": r["key"], "label": r["label"]})
    return jsonify(grouped)

@bp.post("/run/<report_key>")
@require_auth
def run_report(report_key):
    uid = request.user["uid"]
    if not user_has_report(uid, report_key):
        return jsonify({"error": "Sem permissão"}), 403

    if report_key == "adm_usuarios":
        with MySQLSession() as s:
            rows = s.execute(text("""
                SELECT id, name AS Nome, email AS Email, active AS Ativo, created_at AS CriadoEm
                FROM users
                ORDER BY id
            """)).mappings().all()
        cols = list(rows[0].keys()) if rows else []
        return jsonify({"columns": cols, "rows": rows, "total_rows": len(rows)})

    if report_key == "fin_inadimplencia_resumo":
        with MSSQLSession() as s:
            rows = s.execute(text("""
                SELECT TOP 100
                    suc.NomeSubUnidade AS Subsecao,
                    COUNT(p.ID) AS TotalInscritos
                FROM Pessoa p
                LEFT JOIN SubUnidadeConselho suc ON p.SubUnidadeAtual = suc.ID
                WHERE p.TipoCategoria = 20
                GROUP BY suc.NomeSubUnidade
                ORDER BY suc.NomeSubUnidade
            """)).mappings().all()
        cols = list(rows[0].keys()) if rows else []
        return jsonify({"columns": cols, "rows": rows, "total_rows": len(rows)})

    return jsonify({"error": "Relatório desconhecido"}), 404

# ================== RELATÓRIO: Lista Simples ==================

def _consulta_lista_simples(subsecao_like: str | None) -> pd.DataFrame:
    """Consulta base (MSSQL) com filtro opcional de subseção."""
    filtro = ""
    params = {}
    if subsecao_like:
        filtro = "AND suc.NomeSubUnidade LIKE :sub"
        params["sub"] = f"%{subsecao_like}%"

    sql = f"""
        SELECT 
            p.RegistroConselhoAtual AS OAB, 
            p.Nome,
            p.CPFCNPJ,
            s.Descricao AS Situacao,
            FORMAT(p.DataNascimentoFundacao, 'dd/MM/yyyy') AS DataNascimento,
            FORMAT(p.DataCompromisso, 'dd/MM/yyyy') AS DataCompromisso,
            p.TelefoneCelular, 
            COALESCE(p.EmailCorreio, p.EmailComercial) AS Email,
            suc.NomeSubUnidade AS Subsecao
        FROM Pessoa p
        JOIN SubUnidadeConselho suc ON p.SubUnidadeAtual = suc.ID
        JOIN Situacao s ON p.SituacaoAtual = s.ID
        WHERE p.TipoCategoria = 20
          AND p.SituacaoAtual = 14
          {filtro}
        ORDER BY p.Nome
    """
    with MSSQLSession() as s:
        rows = s.execute(text(sql), params).mappings().all()
    return pd.DataFrame(rows)

# ---------- PDF: A4 horizontal, colunas ajustadas, LGPD no rodapé ----------
def _pdf_from_df(df: pd.DataFrame, titulo: str, escopo: str) -> io.BytesIO:
    buf = io.BytesIO()

    # A4 paisagem e margens
    page_size = landscape(A4)
    left_margin = right_margin = 12 * mm
    top_margin = 12 * mm
    bottom_margin = 14 * mm

    doc = SimpleDocTemplate(
        buf,
        pagesize=page_size,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Tiny", fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="HeaderSmall", fontSize=10, leading=12, spaceAfter=4))
    styles.add(ParagraphStyle(name="TitleCenter", parent=styles["Heading1"], alignment=1))

    story = []

    # Cabeçalho com logo + título
    logo_path = os.path.join(os.path.dirname(__file__), "static", "logo_oabms.png")
    header_cells = []

    # Logo (opcional)
    if os.path.exists(logo_path):
        try:
            img = Image(logo_path, width=28 * mm, height=14 * mm, hAlign="LEFT")
        except Exception:
            img = ""
    else:
        img = ""

    titulo_p = Paragraph("Relatório simples de Inscritos", styles["TitleCenter"])
    info = Paragraph(
        f"<b>Escopo:</b> {escopo or 'Geral'} &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"<b>Gerado em:</b> {dt.datetime.now().strftime('%d/%m/%Y %H:%M')}",
        styles["HeaderSmall"]
    )

    header_cells.append([img, titulo_p])
    header = Table(header_cells, colWidths=[32 * mm, doc.width - 32 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",  (1, 0), (1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header)
    story.append(info)
    story.append(Spacer(1, 6))

    # Se não houver dados
    if df is None or df.empty:
        story.append(Paragraph("Nenhum registro encontrado.", styles["Normal"]))
        doc.build(story)
        buf.seek(0)
        return buf

    # Cabeçalhos e larguras (A4 landscape ~ 270 mm de área útil)
    columns = [
        "OAB", "Nome", "CPF/CNPJ", "Situação",
        "Data Nasc.", "Compromisso",
        "Celular", "E-mail", "Subseção",
    ]

    col_widths = [
        16 * mm,  # OAB
        65 * mm,  # Nome
        27 * mm,  # CPF/CNPJ
        20 * mm,  # Situação
        22 * mm,  # Data Nasc.
        25 * mm,  # Compromisso
        25 * mm,  # Celular
        62 * mm,  # E-mail
        27 * mm,  # Subseção
    ]

    # Constrói tabela com Paragraph para quebrar texto longo (e-mail, nome)
    def P(text: str) -> Paragraph:
        safe = (text or "").replace("&", "&amp;")
        return Paragraph(safe, styles["Tiny"])

    # normaliza DF para as colunas esperadas
    # (mantém compatibilidade com os nomes vindos do SQL)
    df = df.rename(columns={
        "Situacao": "Situação",
        "DataNascimento": "Data Nasc.",
        "DataCompromisso": "Compromisso",
        "TelefoneCelular": "Celular",
        "Subsecao": "Subseção",
        "CPFCNPJ": "CPF/CNPJ"
    })

    data = [columns]
    for _, r in df.iterrows():
        data.append([
            P(str(r.get("OAB", ""))),
            P(str(r.get("Nome", ""))),
            P(str(r.get("CPF/CNPJ", ""))),
            P(str(r.get("Situação", ""))),
            P(str(r.get("Data Nasc.", ""))),
            P(str(r.get("Compromisso", ""))),
            P(str(r.get("Celular", ""))),
            P(str(r.get("Email", ""))),
            P(str(r.get("Subseção", ""))),
        ])

    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        # header
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#23364B")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("ALIGN",      (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),

        # corpo
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("VALIGN",   (0, 1), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#F7F9FC")]),

        # linhas
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#B6C2CF")),
    ]))

    story.append(tbl)
    story.append(Spacer(1, 8))

    # Aviso LGPD no rodapé do documento
    lgpd = Paragraph(
        "LGPD — Aviso: Este relatório contém dados pessoais destinados exclusivamente às "
        "atividades institucionais da OAB/MS. É vedado o uso para fins distintos, devendo o "
        "destinatário adotar medidas de segurança compatíveis com a Lei nº 13.709/2018.",
        styles["Tiny"]
    )
    story.append(lgpd)

    doc.build(story)
    buf.seek(0)
    return buf

@bp.get("/subsecoes")
@require_auth
def subsecoes():
    with MSSQLSession() as s:
        rows = s.execute(text("""
            SELECT DISTINCT suc.NomeSubUnidade AS Subsecao
            FROM Pessoa p
            JOIN SubUnidadeConselho suc ON p.SubUnidadeAtual = suc.ID
            WHERE p.TipoCategoria = 20 AND p.SituacaoAtual = 14
            ORDER BY suc.NomeSubUnidade
        """)).mappings().all()
    items = [r["Subsecao"] for r in rows if r["Subsecao"]]
    return jsonify({"items": items})

@bp.get("/lista_simples")
@require_auth
def lista_simples():
    formato = (request.args.get("formato") or "pdf").lower()
    subsecao = (request.args.get("subsecao") or "").strip()
    modo = (request.args.get("modo") or "").lower()

    if subsecao:
        df = _consulta_lista_simples(subsecao)
        escopo = subsecao
    else:
        df = _consulta_lista_simples(None)
        escopo = "Geral"

    # ---- PDF ----
    if formato == "pdf":
        # ZIP com 1 PDF por subseção (quando geral + modo=multi)
        if not subsecao and modo == "multi" and not df.empty and "Subsecao" in df.columns:
            subs = sorted([s for s in df["Subsecao"].dropna().unique().tolist()])
            memzip = io.BytesIO()
            with zipfile.ZipFile(memzip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                for s in subs:
                    dfi = df[df["Subsecao"] == s].reset_index(drop=True)
                    pdf = _pdf_from_df(dfi, "Relatório simples de Inscritos", s)
                    zf.writestr(f"Relatorio_Lista_Simples_{s}.pdf", pdf.getvalue())
            memzip.seek(0)
            return send_file(
                memzip,
                mimetype="application/zip",
                as_attachment=True,
                download_name="Relatorio_Lista_Simples_por_Subsecao.zip",
            )

        pdf = _pdf_from_df(df, "Relatório simples de Inscritos", escopo)
        return send_file(
            pdf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"Relatorio_Lista_Simples_{escopo}.pdf",
        )

    # ---- XLSX ----
    if formato == "xlsx":
        bio = io.BytesIO()
        with pd.ExcelWriter(bio, engine="openpyxl") as w:
            (df or pd.DataFrame()).to_excel(w, index=False, sheet_name="Lista")
        bio.seek(0)
        return send_file(
            bio,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"Relatorio_Lista_Simples_{escopo}.xlsx",
        )

    # ---- CSV (padrão) ----
    bio = io.BytesIO()
    (df or pd.DataFrame()).to_csv(bio, index=False, sep=";", encoding="utf-8-sig")
    bio.seek(0)
    return send_file(
        bio,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"Relatorio_Lista_Simples_{escopo}.csv",
    )
