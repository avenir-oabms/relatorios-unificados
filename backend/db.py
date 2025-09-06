import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
load_dotenv()

# ---- MySQL (auth/permissões) ----
MYSQL_HOST = os.getenv("MYSQL_HOST","localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT","3306"))
MYSQL_DB   = os.getenv("MYSQL_DB","relatorios_auth")
MYSQL_USER = os.getenv("MYSQL_USER","root")
MYSQL_PW   = os.getenv("MYSQL_PASSWORD","")

_mysql_url = f"mysql+pymysql://{urllib.parse.quote_plus(MYSQL_USER)}:{urllib.parse.quote_plus(MYSQL_PW)}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
mysql_engine = create_engine(_mysql_url, pool_pre_ping=True)
MySQLSession = sessionmaker(bind=mysql_engine, autoflush=False, autocommit=False)

# ---- SQL Server (dados) ----
MSSQL_DSN = os.getenv("MSSQL_DSN")
_mssql_url = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(MSSQL_DSN)}"
mssql_engine = create_engine(_mssql_url, pool_pre_ping=True)
MSSQLSession = sessionmaker(bind=mssql_engine, autoflush=False, autocommit=False)

def ping_mysql():
    with mysql_engine.connect() as c:
        return c.execute(text("SELECT 1")).scalar()

def ping_mssql():
    with mssql_engine.connect() as c:
        return c.execute(text("SELECT 1")).scalar()
