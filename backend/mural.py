# backend/mural.py
from flask import Blueprint, jsonify, request

bp = Blueprint("mural", __name__)

# Lista de avisos (mock por enquanto)
MOCK_AVISOS = [
    {"id": 1, "titulo": "Manutenção programada", "mensagem": "Sistema fora do ar em 10/09/2025 das 19h às 22h."},
    {"id": 2, "titulo": "Novo módulo", "mensagem": "Relatórios de desempenho disponíveis para testes."},
    {"id": 3, "titulo": "Segurança", "mensagem": "Atualização de credenciais obrigatória até 15/09/2025."},
]

@bp.get("/")
def listar_avisos():
    """Retorna todos os avisos do mural."""
    return jsonify(MOCK_AVISOS)

@bp.post("/")
def criar_aviso():
    """Cria um novo aviso (mock). Futuro: persistir no banco."""
    data = request.json
    novo = {
        "id": len(MOCK_AVISOS) + 1,
        "titulo": data.get("titulo", "Sem título"),
        "mensagem": data.get("mensagem", "Sem mensagem"),
    }
    MOCK_AVISOS.append(novo)
    return jsonify(novo), 201

@bp.delete("/<int:aviso_id>")
def remover_aviso(aviso_id):
    """Remove aviso pelo ID (mock)."""
    global MOCK_AVISOS
    MOCK_AVISOS = [a for a in MOCK_AVISOS if a["id"] != aviso_id]
    return jsonify({"status": "deleted", "id": aviso_id})
