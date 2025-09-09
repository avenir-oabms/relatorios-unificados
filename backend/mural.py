# backend/mural.py
from flask import Blueprint, jsonify, request
from datetime import datetime
from functools import wraps

bp = Blueprint("mural", __name__)

# Lista de avisos (mock por enquanto - futuramente será banco de dados)
MOCK_AVISOS = [
    {
        "id": 1, 
        "titulo": "Manutenção programada", 
        "mensagem": "Sistema fora do ar em 10/09/2025 das 19h às 22h.",
        "criado_em": "2025-09-08T14:30:00",
        "autor": "Departamento de TI"
    },
    {
        "id": 2, 
        "titulo": "Novo módulo", 
        "mensagem": "Relatórios de desempenho disponíveis para testes.",
        "criado_em": "2025-09-07T10:15:00",
        "autor": "Administrador"
    },
    {
        "id": 3, 
        "titulo": "Segurança", 
        "mensagem": "Atualização de credenciais obrigatória até 15/09/2025.",
        "criado_em": "2025-09-06T16:45:00",
        "autor": "Administrador"
    },
]

def require_auth(f):
    """Decorator para verificar autenticação (placeholder - usar do auth.py em produção)"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Para desenvolvimento, aceita qualquer token não vazio
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token necessário"}), 401
        return f(*args, **kwargs)
    return decorated

def get_next_id():
    """Gera próximo ID disponível"""
    if not MOCK_AVISOS:
        return 1
    return max(aviso["id"] for aviso in MOCK_AVISOS) + 1

def validate_aviso_data(data):
    """Valida dados de entrada para avisos"""
    errors = []
    
    if not data:
        errors.append("Dados não fornecidos")
        return errors
    
    titulo = data.get("titulo", "").strip()
    mensagem = data.get("mensagem", "").strip()
    
    if not titulo:
        errors.append("Título é obrigatório")
    elif len(titulo) > 100:
        errors.append("Título deve ter no máximo 100 caracteres")
    
    if not mensagem:
        errors.append("Mensagem é obrigatória")
    elif len(mensagem) > 500:
        errors.append("Mensagem deve ter no máximo 500 caracteres")
    
    return errors

# ===== ROTAS PÚBLICAS (listar avisos) =====

@bp.route("", methods=["GET"])
@bp.route("/", methods=["GET"])
def listar_avisos():
    """
    Retorna todos os avisos do mural ordenados por data de criação (mais recentes primeiro).
    Não requer autenticação - avisos são públicos.
    """
    try:
        # Ordena por criado_em decrescente (mais recentes primeiro)
        avisos_ordenados = sorted(
            MOCK_AVISOS, 
            key=lambda x: x.get("criado_em", ""), 
            reverse=True
        )
        return jsonify(avisos_ordenados), 200
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@bp.route("/<int:aviso_id>", methods=["GET"])
def obter_aviso(aviso_id):
    """
    Retorna um aviso específico pelo ID.
    Não requer autenticação - avisos são públicos.
    """
    try:
        aviso = next((a for a in MOCK_AVISOS if a["id"] == aviso_id), None)
        if not aviso:
            return jsonify({"error": "Aviso não encontrado"}), 404
        return jsonify(aviso), 200
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

# ===== ROTAS PROTEGIDAS (requerem autenticação) =====

@bp.route("", methods=["POST"])
@bp.route("/", methods=["POST"])
@require_auth
def criar_aviso():
    """
    Cria um novo aviso no mural.
    Requer autenticação - apenas usuários logados podem criar avisos.
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validação
        errors = validate_aviso_data(data)
        if errors:
            return jsonify({"error": "Dados inválidos", "details": errors}), 400
        
        # Criar novo aviso
        novo_aviso = {
            "id": get_next_id(),
            "titulo": data["titulo"].strip(),
            "mensagem": data["mensagem"].strip(),
            "criado_em": datetime.now().isoformat(),
            "autor": data.get("autor", "Usuário").strip()
        }
        
        # Adicionar à lista (em produção: salvar no banco)
        MOCK_AVISOS.append(novo_aviso)
        
        return jsonify(novo_aviso), 201
        
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@bp.route("/<int:aviso_id>", methods=["PUT"])
@require_auth
def atualizar_aviso(aviso_id):
    """
    Atualiza um aviso existente.
    Requer autenticação - apenas usuários logados podem editar avisos.
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Encontrar aviso
        aviso = next((a for a in MOCK_AVISOS if a["id"] == aviso_id), None)
        if not aviso:
            return jsonify({"error": "Aviso não encontrado"}), 404
        
        # Validação
        errors = validate_aviso_data(data)
        if errors:
            return jsonify({"error": "Dados inválidos", "details": errors}), 400
        
        # Atualizar campos
        aviso["titulo"] = data["titulo"].strip()
        aviso["mensagem"] = data["mensagem"].strip()
        aviso["editado_em"] = datetime.now().isoformat()
        
        if data.get("autor"):
            aviso["autor"] = data["autor"].strip()
        
        return jsonify(aviso), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@bp.route("/<int:aviso_id>", methods=["DELETE"])
@require_auth
def remover_aviso(aviso_id):
    """
    Remove um aviso pelo ID.
    Requer autenticação - apenas usuários logados podem remover avisos.
    """
    try:
        global MOCK_AVISOS
        
        # Verificar se aviso existe
        aviso = next((a for a in MOCK_AVISOS if a["id"] == aviso_id), None)
        if not aviso:
            return jsonify({"error": "Aviso não encontrado"}), 404
        
        # Remover da lista (em produção: deletar do banco)
        MOCK_AVISOS = [a for a in MOCK_AVISOS if a["id"] != aviso_id]
        
        return jsonify({
            "status": "deleted", 
            "id": aviso_id,
            "message": f"Aviso '{aviso['titulo']}' removido com sucesso"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

# ===== ROTAS ADMINISTRATIVAS =====

@bp.route("/stats", methods=["GET"])
@require_auth
def estatisticas_mural():
    """
    Retorna estatísticas do mural de avisos.
    Requer autenticação.
    """
    try:
        stats = {
            "total_avisos": len(MOCK_AVISOS),
            "avisos_hoje": 0,  # Implementar lógica de data
            "ultimo_aviso": None
        }
        
        if MOCK_AVISOS:
            # Ordenar por data e pegar o mais recente
            avisos_ordenados = sorted(
                MOCK_AVISOS, 
                key=lambda x: x.get("criado_em", ""), 
                reverse=True
            )
            stats["ultimo_aviso"] = avisos_ordenados[0]
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

# ===== HANDLERS DE ERRO =====

@bp.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Endpoint não encontrado"}), 404

@bp.errorhandler(405)
def method_not_allowed_error(error):
    return jsonify({"error": "Método não permitido"}), 405

@bp.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Erro interno do servidor"}), 500