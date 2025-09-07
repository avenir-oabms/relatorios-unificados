from flask import Blueprint, request, jsonify
from functools import wraps
from sqlalchemy import text
from db import MySQLSession, MSSQLSession, ping_mysql, ping_mssql
from auth import verify_token

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

def user_has_report(uid:int, report_key:str)->bool:
    with MySQLSession() as s:
        row = s.execute(text("""
            SELECT 1
            FROM reports r
            JOIN report_permissions rp ON rp.report_id = r.id
            WHERE rp.user_id = :uid AND r.report_key = :rk
            LIMIT 1
        """), {"uid": uid, "rk": report_key}).first()
        return row is not None

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

# Exemplo de "run" simples para validar fluxo
@bp.post("/run/<report_key>")
@require_auth
def run_report(report_key):
    uid = request.user["uid"]
    if not user_has_report(uid, report_key):
        return jsonify({"error": "Sem permissão"}), 403

    # 2 seeds: adm_usuarios (MySQL) e fin_inadimplencia_resumo (MSSQL)
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
