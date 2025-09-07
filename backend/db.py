import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# =========================
# MySQL (auth/permissões)
# =========================
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DB   = os.getenv("MYSQL_DB", "relatorios_auth")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PW   = os.getenv("MYSQL_PASSWORD", "")

_mysql_url = (
    f"mysql+pymysql://{urllib.parse.quote_plus(MYSQL_USER)}:"
    f"{urllib.parse.quote_plus(MYSQL_PW)}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
)

mysql_engine = create_engine(_mysql_url, pool_pre_ping=True)
MySQLSession = sessionmaker(bind=mysql_engine, autoflush=False, autocommit=False)

def ping_mysql():
    """Retorna dict com diagnóstico do MySQL sem quebrar o app."""
    try:
        with mysql_engine.connect() as c:
            val = c.execute(text("SELECT 1")).scalar()
        return {"ok": True, "value": int(val)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# =========================
# SQL Server (dados dos relatórios)
# =========================
MSSQL_DSN = os.getenv("MSSQL_DSN", "").strip()

_mssql_url = None
mssql_engine = None
MSSQLSession = None
_mssql_engine_error = None

if MSSQL_DSN:
    try:
        # urlencode completo do DSN para o dialect pyodbc
        _mssql_url = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(MSSQL_DSN)}"
        mssql_engine = create_engine(_mssql_url, pool_pre_ping=True)
        MSSQLSession = sessionmaker(bind=mssql_engine, autoflush=False, autocommit=False)
    except Exception as e:
        # Não derruba o app caso o SQL Server esteja inacessível agora
        _mssql_engine_error = str(e)
        mssql_engine = None
        MSSQLSession = None

def ping_mssql():
    """
    Retorna dict com diagnóstico do SQL Server.
    - ok=True com value=1 quando tudo certo
    - ok=False com motivo quando DSN ausente ou engine falhou
    """
    if not MSSQL_DSN:
        return {"ok": False, "error": "MSSQL_DSN não definido no .env"}
    if mssql_engine is None:
        return {"ok": False, "error": _mssql_engine_error or "Engine MSSQL não inicializado"}
    try:
        with mssql_engine.connect() as c:
            val = c.execute(text("SELECT 1")).scalar()
        return {"ok": True, "value": int(val)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# Helpers opcionais (úteis para relatórios)
def mssql_scalar(sql: str):
    """Executa uma query que retorna apenas um escalar."""
    if mssql_engine is None:
        raise RuntimeError(_mssql_engine_error or "Engine MSSQL não inicializado")
    with mssql_engine.connect() as c:
        return c.execute(text(sql)).scalar()

def mysql_scalar(sql: str):
    """Executa uma query escalar no MySQL."""
    with mysql_engine.connect() as c:
        return c.execute(text(sql)).scalar()
