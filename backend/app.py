# app.py — Flask app com CORS corrigido para funcionamento

from flask import Flask, jsonify, request
from flask_cors import CORS
import os

# ==== Blueprints / módulos ====
try:
    from reports import bp as reports_bp
except Exception as e:
    reports_bp = None
    print(f"[app] Aviso: não consegui importar reports.bp -> {e}")

try:
    from auth import bp as auth_bp
except Exception:
    auth_bp = None

try:
    from users import bp as users_bp
except Exception:
    users_bp = None

try:
    from mural import bp as mural_bp
except Exception:
    mural_bp = None

# ==== App / CORS ====
app = Flask(__name__)

# CORS mais permissivo para desenvolvimento - ADICIONANDO MAIS PORTAS
CORS(app, 
     origins=[
         "http://192.168.0.64:5173", 
         "http://localhost:5173", 
         "http://127.0.0.1:5173",
         "http://192.168.0.64:3000",  # React padrão
         "http://localhost:3000",     # React padrão
         "http://127.0.0.1:3000"      # React padrão
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     expose_headers=["Content-Disposition"])

# Opcional: responder preflight mais explicitamente
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        resp = jsonify({'status': 'ok'})
        origin = request.headers.get('Origin')
        allowed_origins = [
            "http://192.168.0.64:5173", 
            "http://localhost:5173", 
            "http://127.0.0.1:5173",
            "http://192.168.0.64:3000",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]
        if origin in allowed_origins:
            resp.headers['Access-Control-Allow-Origin'] = origin
        resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept'
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return resp

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    allowed_origins = [
        "http://192.168.0.64:5173", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://192.168.0.64:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
    return response

# ==== Health básico da API ====
@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "message": "API funcionando"})

# ==== Registro dos blueprints ====
if reports_bp:
    app.register_blueprint(reports_bp)   # /api/reports/...
    print("[app] Blueprint 'reports' registrado com sucesso")
else:
    print("[app] ERRO: Blueprint 'reports' não foi carregado!")

if auth_bp:
    app.register_blueprint(auth_bp)      # /api/auth/...
    print("[app] Blueprint 'auth' registrado com sucesso")

if users_bp:
    app.register_blueprint(users_bp)
    print("[app] Blueprint 'users' registrado com sucesso")

if mural_bp:
    app.register_blueprint(mural_bp, url_prefix="/api/mural")
    print("[app] Blueprint 'mural' registrado com sucesso")

# ==== Execução direta (desenvolvimento) ====
if __name__ == "__main__":
    # 0.0.0.0 para aceitar chamadas da rede local
    print("Iniciando servidor Flask...")
    print("URLs registradas:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.endpoint}")
    
    print(f"\nServidor rodando em:")
    print(f"  - Local: http://localhost:5055")
    print(f"  - Rede:  http://192.168.0.64:5055")
    print(f"  - API Health: http://192.168.0.64:5055/api/health")
    print(f"  - Reports Test: http://192.168.0.64:5055/api/reports/test")
    
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5055)), debug=True)