# Relatórios Unificados — Auth + Admin

Sistema web para autenticação, gestão de usuários/perfis e (futuramente) execução de relatórios.  
**Stack:** Python/Flask (API), MySQL (auth/permissions), SQL Server (dados), React + Vite + TS (frontend).

---

## 1) Visão Geral

- **Login com e-mail/senha** (bcrypt) e emissão de **token** (itsdangerous).
- **RBAC simples**: `admin`, `técnico`, `usuário` (campo `role`).
- **Admin**: listagem, criação, edição, ativação/desativação, reset de senha.
- **Frontend** com **proteção de rotas** e persistência (LocalStorage).
- Serviços configuráveis para **subir automaticamente** e **aceitar conexões da rede**.

> Telas seguem o padrão visual da página **Admin** (cards de métricas, tabela com avatares, badges de status/perfil e ações à direita).

---

## 2) Estrutura de Pastas

```
RELATORIOS-UNIFICADOS/
├─ backend/
│  ├─ app.py          # factory do Flask + blueprints + CORS
│  ├─ auth.py         # endpoints de auth e gestão de usuários
│  ├─ db.py           # conexão MySQL (auth) e MSSQL (relatórios)
│  ├─ requirements.txt # dependências do backend
│  └─ .env             # variáveis (SECRET_KEY, MYSQL_*, MSSQL_DSN)
└─ frontend/
   ├─ public/logos/   # assets
   ├─ src/
   │  ├─ App.tsx
   │  ├─ pages/LoginPage.tsx
   │  ├─ pages/AdminPage.tsx
   │  ├─ components/RequireAuth.tsx
   │  └─ lib/api.ts   # API_BASE
   ├─ package.json
   ├─ tsconfig.json
   └─ .env               # VITE_API_BASE=http://192.168.0.64:5055
```

---

## 3) Pré-requisitos

- **Python 3.11+** e **pip**
- **Node 18+** e **npm**
- **MySQL** (base de auth) e **ODBC Driver 17/18** para SQL Server
- Acesso para abrir portas no firewall (5055 API, 5173 front dev, 4173 preview)

---

## 4) Configuração

### 4.1 Backend

Crie `backend/.env`:

```env
# APP
FLASK_ENV=development
SECRET_KEY=troque_esta_chave

# MYSQL (auth/permissões)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=relatorios_auth
MYSQL_USER=relatorios_user
MYSQL_PASSWORD=R3l@t0r!os#2025

# SQL SERVER (dados dos relatórios)
# Requer ODBC Driver 17/18
MSSQL_DSN=Driver={ODBC Driver 17 for SQL Server};Server=172.29.7.20;Database=HBConselhos;UID=consultas_python;PWD=oab7onysht$$cPBms;TrustServerCertificate=yes
```

### Instalação e execução:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask --app app.py run --host=0.0.0.0 --port=5055
```

### 4.2 Frontend

Crie `frontend/.env` com o IP do backend:

```env
VITE_API_BASE=http://192.168.0.64:5055
```

Instalação e execução (dev):

```bash
cd frontend
npm install
npm run dev        # Vite em http://192.168.0.64:5173
```

Build e preview estático (útil para publicar):

```bash
npm run build
npm run preview -- --host --port 4173   # http://192.168.0.64:4173
```

---

## 5) Endpoints Principais (Auth)

Base: http://192.168.0.64:5055/api/auth

- `POST /login`
  - body: `{ "email": "...", "password": "..." }`
  - retorno: `{ token, user, reports }`

- `POST /register` (admin)
  - `{ "name": "...", "email": "...", "password": "...", "role": "user|tecnico|admin" }`

- `GET /users` (admin) — lista usuários

- `PATCH /users/<id>` (admin) — atualiza name, role, active

- `POST /users/<id>/reset_password` (admin)
  - body: `{ "new_password": "..." }`

- `POST /change_password` — usuário autenticado
  - body: `{ "current_password": "...", "new_password": "..." }`

> Observação: abrir `/api/auth/login` no navegador com GET retorna 405 Method Not Allowed (é esperado). Use POST ou a tela de login do frontend.

---

## 6) Produção / Serviços automáticos (Windows)

Recomendado usar NSSM para manter os serviços ativos após reboot.

### Backend (Flask)

```
nssm install RelatoriosBackend
  Application:  E:\xampp\htdocs\relatorios-unificados\backend\.venv\Scripts\python.exe
  Arguments:    -m flask --app app.py run --host=0.0.0.0 --port=5055
  Startup dir:  E:\xampp\htdocs\relatorios-unificados\backend
```

### Frontend (Vite preview)

```
nssm install RelatoriosFrontend
  Application:  C:\Program Files\nodejs\npx.cmd
  Arguments:    vite preview --host --port 4173
  Startup dir:  E:\xampp\htdocs\relatorios-unificados\frontend
```

Abrir portas no firewall (uma vez, como admin):

```cmd
netsh advfirewall firewall add rule name="Relatorios API 5055" dir=in action=allow protocol=TCP localport=5055
netsh advfirewall firewall add rule name="Relatorios Front 4173" dir=in action=allow protocol=TCP localport=4173
```

---

## 7) Padrão Visual (UI)

Usar a AdminPage como guia para o restante do sistema:

- Cards com métricas (Total, Ativos, Admins, Inativos)
- Tabela com avatar inicial, nome + e-mail, badges de perfil e status
- Ações à direita (Editar, Resetar Senha, Desativar)
- Paleta clara, sombras suaves, cantos arredondados, feedbacks de sucesso/erro
- Consistência nos botões (azul ação principal, amarelo secundária, vermelho destrutiva)

---

## 8) Acessos e Testes Rápidos

- Login: http://192.168.0.64:5173/login (ou http://192.168.0.64:4173/login no preview)
- Admin: http://192.168.0.64:5173/admin
- API: http://192.168.0.64:5055/api/auth/...
  → Testar com Postman/Insomnia

---

## 9) Troubleshooting

- **405 Method Not Allowed** em `/api/auth/login`: fez GET via navegador; use POST.
- **401 Credenciais inválidas**: conferir senha/usuário e hash bcrypt no banco.
- **CORS**: o app já tem flask-cors habilitado; valide VITE_API_BASE.
- **Sem acesso pela rede**: abra as portas no firewall e confirme `--host 0.0.0.0`.
- **NSSM não inicia**: verifique Startup directory e o caminho do Python/Node.

---

## 10) Roadmap

- Listagem e execução de relatórios (módulos por permissão).
- Filtros e paginação na AdminPage.
- Logs/auditoria de ações administrativas.
- Empacotamento (gunicorn/uvicorn + reverse proxy) para ambientes Linux.

---

## Créditos

Desenvolvido internamente pela OAB/MS.  
Este repositório consolida autenticação, RBAC e base visual para os módulos de relatórios.

---

### Onde salvar e como usar

1) Crie o arquivo `README.md` **na raiz** de `RELATORIOS-UNIFICADOS`.  
2) Cole o conteúdo acima.  
3) Commits futuros podem citar este README para padronizar novos módulos/telas.

Se quiser, eu também preparo um **README-backup.md** só com comandos “copiar-e-colar” (setup rápido) para quem for instalar em outra máquina.

---
### ESTÃO SALVOS NO GITHUB

relatorios-unificados
Comandos para atualização

Local de acesso casa ( aveni@DESKTOP-FC65AN1 MINGW64 /x/xampp/htdocs/relatorios-unificados (master) )

1) git add .
2) git commit -m "Descrição da mudança"
3) git push

---
### Voltando versões estáveis no Github

  1. Ver o histórico de versões: bashgit log --oneline
  Isso mostra todas as versões (commits) com códigos únicos.

  2. Voltar para uma versão específica:
    - Opção A - Voltar temporariamente (para testar): bashgit checkout 54d2b9e
      (Use o código do commit que você quer - no seu caso pode ser esse 54d2b9e do primeiro commit)

    - Opção B - Voltar definitivamente: bashgit reset --hard 54d2b9e
    ⚠️CUIDADO: Isso apaga TODAS as mudanças posteriores!

  3. Voltar apenas alguns arquivos: bashgit checkout 54d2b9e -- arquivo.php

  4. Criar uma versão "de segurança" antes de mexer: bashgit tag v1.0-estavel

  5. Desfazer apenas o último commit (mais comum): bash# Mantém as mudanças nos arquivos: git reset --soft HEAD~1

---
### Remove as mudanças também:

- git reset --hard HEAD~1
Exemplo prático:

Você fez mudanças e deu problema

- git log --oneline - vê as versões
- git reset --hard abc123 - volta para a versão boa
- git push -f origin master - atualiza o GitHub

Dica: Sempre faça commits pequenos e frequentes com mensagens claras. Assim fica fácil identificar qual versão voltar!
Quer que eu te mostre como fazer um teste prático disso?
