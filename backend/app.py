# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS

# Blueprints existentes
from auth import bp as auth_bp
from reports import bp as reports_bp
from mural import bp as mural_bp  # novo blueprint do mural

# Conexões
from db import ping_mysql, ping_mssql


def create_app():
    """
    Factory principal do Flask.
    Responsável por inicializar a aplicação,
    habilitar CORS e registrar blueprints.
    """
    app = Flask(__name__)

    # CORS liberado para todas as origens (ajustar se necessário em produção)
    CORS(app)

    # ==== Rotas de Saúde / Teste ====
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.get("/api/test-mysql")
    def test_mysql():
        try:
            v = ping_mysql()
            return jsonify({"mysql": "ok", "result": int(v)})
        except Exception as e:
            return jsonify({"mysql": "error", "message": str(e)}), 500

    @app.get("/api/test-mssql")
    def test_mssql():
        try:
            v = ping_mssql()
            return jsonify({"mssql": "ok", "result": int(v)})
        except Exception as e:
            return jsonify({"mssql": "error", "message": str(e)}), 500

    # ==== Blueprints principais ====
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(mural_bp, url_prefix="/api/mural")  # já integrado

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5055, debug=True)
