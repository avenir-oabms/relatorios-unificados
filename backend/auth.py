# backend/auth.py
from flask import Blueprint, request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy import text
from db import MySQLSession
import os, bcrypt
from functools import wraps

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# --- Token helpers -----------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "devkey")
serializer = URLSafeTimedSerializer(SECRET_KEY)

def make_token(payload: dict) -> str:
    return serializer.dumps(payload)

def verify_token(token: str, max_age=3600 * 8):
    try:
        return serializer.loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None

# --- Helpers / decorators ----------------------------------------------------
def json_error(msg, code=400):
    return jsonify({"error": msg}), code

def require_auth(f):
    @wraps(f)
    def _wrap(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        u = verify_token(token)
        if not u:
            return json_error("Não autorizado", 401)
        request.user = u  # armazena no request para uso nos handlers
        return f(*args, **kwargs)
    return _wrap

def require_admin(f):
    @wraps(f)
    def _wrap(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        u = verify_token(token)
        if not u:
            return json_error("Não autorizado", 401)
        if (u.get("role") or "").lower() != "admin":
            return json_error("Apenas administradores", 403)
        request.user = u
        return f(*args, **kwargs)
    return _wrap

# --- Rotas -------------------------------------------------------------------
@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").encode("utf-8")

    if not email or not password:
        return json_error("email e password são obrigatórios", 400)

    with MySQLSession() as s:
        # Busca usuário e (opcionalmente) o papel a partir de roles/user_roles
        u = s.execute(text("""
            SELECT 
                u.id, u.name, u.email, u.password_hash, u.active,
                u.created_at,
                COALESCE(r.name, 'user') AS role
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.email = :email
            LIMIT 1
        """), {"email": email}).mappings().first()

        if not u or not int(u["active"]):
            return json_error("Credenciais inválidas", 401)

        if not bcrypt.checkpw(password, u["password_hash"].encode("utf-8")):
            return json_error("Credenciais inválidas", 401)

        # Relatórios permitidos ao usuário
        rows = s.execute(text("""
            SELECT r.report_key AS `key`, r.module, r.label
            FROM reports r
            JOIN report_permissions rp ON rp.report_id = r.id
            WHERE rp.user_id = :uid
            ORDER BY r.module, r.label
        """), {"uid": u["id"]}).mappings().all()

        rows = [dict(r) for r in rows]

    token = make_token({"uid": u["id"], "email": u["email"], "role": u["role"]})
    return jsonify({
        "token": token,
        "user": {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "role": u["role"],
            "created_at": u["created_at"].isoformat() if u.get("created_at") else None
        },
        "reports": rows
    })

@bp.get("/me")
@require_auth
def me():
    """Retorna os dados básicos do usuário logado (decodificados do token)."""
    return jsonify({"user": request.user})

@bp.post("/register")
@require_admin  # ✅ somente administradores podem criar novos usuários
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")
    role_name = (data.get("role") or "user").strip().lower()  # opcional, default 'user'
    active = 1 if str(data.get("active", "1")) in ("1", "true", "True") else 0

    # Validações simples
    if not name or not email or not password:
        return json_error("name, email e password são obrigatórios", 400)
    if "@" not in email or "." not in email:
        return json_error("email inválido", 400)

    pw_hash = bcrypt.hashpw(password.encode("utf-8"),
                            bcrypt.gensalt(rounds=12)).decode("utf-8")

    with MySQLSession() as s:
        # Já existe?
        exists = s.execute(
            text("SELECT 1 FROM users WHERE email = :e LIMIT 1"),
            {"e": email}
        ).first()
        if exists:
            return json_error("email já cadastrado", 409)

        # Cria usuário
        s.execute(text("""
            INSERT INTO users (name, email, password_hash, active)
            VALUES (:n, :e, :h, :a)
        """), {"n": name, "e": email, "h": pw_hash, "a": active})
        s.commit()

        # Busca id do usuário recém-criado
        user_row = s.execute(text("""
            SELECT id, name, email, active, created_at
            FROM users WHERE email = :e
        """), {"e": email}).mappings().first()

        # Atribui role, se existir na tabela roles (senão, fica só como 'user' lógico)
        role = s.execute(text("""
            SELECT id FROM roles WHERE name = :r LIMIT 1
        """), {"r": role_name}).mappings().first()

        if role:
            s.execute(text("""
                INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)
            """), {"uid": user_row["id"], "rid": role["id"]})
            s.commit()

    # Formatar created_at se existir
    user_dict = dict(user_row)
    if user_dict.get("created_at"):
        user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    return jsonify({"user": user_dict, "assigned_role": role_name}), 201

@bp.get("/users")
@require_admin
def list_users():
    with MySQLSession() as s:
        rows = s.execute(text("""
            SELECT 
                u.id, u.name, u.email, u.password_hash, u.active,
                u.created_at,
                COALESCE(r.name, 'user') AS role
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            GROUP BY u.id, u.name, u.email, u.password_hash, u.active, u.created_at
            ORDER BY u.created_at DESC
        """)).mappings().all()
        
        # Converter para lista de dicts e formatar created_at
        users_list = []
        for row in rows:
            user_dict = dict(row)
            if user_dict.get("created_at"):
                user_dict["created_at"] = user_dict["created_at"].isoformat()
            users_list.append(user_dict)
    
    return jsonify({"users": users_list})

@bp.patch("/users/<int:user_id>")
@require_admin
def update_user(user_id: int):
    data = request.get_json(silent=True) or {}
    name   = data.get("name")
    active = data.get("active")  # 0 ou 1
    role   = (data.get("role") or "").strip().lower() if data.get("role") else None
    
    updates = []
    params = {"uid": user_id}

    with MySQLSession() as s:
        # valida e aplica campos simples (name, active)
        if name is not None:
            updates.append("name = :name")
            params["name"] = name
        if active is not None:
            updates.append("active = :active")
            params["active"] = int(active)

        if updates:
            s.execute(text(f"UPDATE users SET {', '.join(updates)} WHERE id = :uid"), params)
            s.commit()  # Commit após UPDATE users

        # atualiza role (tabela roles/user_roles)
        if role is not None:
            # garante que a role exista
            r = s.execute(text("SELECT id FROM roles WHERE name = :r"), {"r": role}).first()
            if not r:
                # Se a role não existe, cria ela
                s.execute(text("INSERT INTO roles (name) VALUES (:r)"), {"r": role})
                s.commit()
                r = s.execute(text("SELECT id FROM roles WHERE name = :r"), {"r": role}).first()

            # Remove role antiga se existir
            s.execute(text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": user_id})
            
            # Insere nova role
            s.execute(text("""
                INSERT INTO user_roles (user_id, role_id)
                VALUES (:uid, :rid)
            """), {"uid": user_id, "rid": r[0]})
            s.commit()  # Commit após atualizar role

        # retorna o registro atualizado
        row = s.execute(text("""
            SELECT u.id, u.name, u.email, u.active, u.created_at,
                   COALESCE(r.name, 'user') AS role
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.id = :uid
        """), {"uid": user_id}).mappings().first()

    if not row:
        return jsonify({"error": "Usuário não encontrado"}), 404

    # Formatar created_at se existir
    user_dict = dict(row)
    if user_dict.get("created_at"):
        user_dict["created_at"] = user_dict["created_at"].isoformat()

    return jsonify({"user": user_dict})

@bp.post("/users/<int:user_id>/reset_password")
@require_admin
def admin_reset_password(user_id: int):
    """Admin define uma nova senha para qualquer usuário."""
    data = request.get_json(silent=True) or {}
    new_password = (data.get("new_password") or "").strip()

    if len(new_password) < 8:
        return jsonify({"error": "A nova senha deve ter pelo menos 8 caracteres"}), 400

    pw_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    with MySQLSession() as s:
        # confere se o usuário existe
        row = s.execute(text("SELECT id FROM users WHERE id = :uid LIMIT 1"), {"uid": user_id}).first()
        if not row:
            return jsonify({"error": "Usuário não encontrado"}), 404

        # atualiza a senha
        s.execute(text("UPDATE users SET password_hash = :h WHERE id = :uid"),
                  {"h": pw_hash, "uid": user_id})
        s.commit()

    return jsonify({"ok": True, "user_id": user_id})

@bp.post("/change_password")
def change_password():
    """Usuário autenticado troca a própria senha."""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    u = verify_token(token)
    if not u:
        return jsonify({"error": "Não autorizado"}), 401

    data = request.get_json(silent=True) or {}
    current_password = (data.get("current_password") or "").encode("utf-8")
    new_password = (data.get("new_password") or "").strip()

    if len(new_password) < 8:
        return jsonify({"error": "A nova senha deve ter pelo menos 8 caracteres"}), 400

    with MySQLSession() as s:
        user = s.execute(text("""
            SELECT id, password_hash FROM users WHERE id = :uid LIMIT 1
        """), {"uid": u["uid"]}).mappings().first()

        if not user:
            return jsonify({"error": "Usuário não encontrado"}), 404

        # verifica senha atual
        if not bcrypt.checkpw(current_password, user["password_hash"].encode("utf-8")):
            return jsonify({"error": "Senha atual incorreta"}), 403

        # gera novo hash
        pw_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

        # atualiza
        s.execute(text("UPDATE users SET password_hash = :h WHERE id = :uid"),
                  {"h": pw_hash, "uid": user["id"]})
        s.commit()

    return jsonify({"ok": True, "user_id": u["uid"]})