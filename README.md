# Compartilhador de Imoveis 123 New House

Sistema web simples para imobiliaria com painel administrativo, cadastro de imoveis com varias fotos, link publico unico e download das fotos em arquivo ZIP.

## Tecnologias

- Backend: Node.js, Express, SQLite, Multer, Archiver
- Frontend: React, Vite
- Banco local: SQLite
- Uploads: pasta local `backend/uploads`

## Estrutura

```text
backend/
  src/
    db.js
    server.js
  data/
  uploads/
frontend/
  src/
    App.jsx
    main.jsx
    styles.css
```

## Instalacao

1. Instale o Node.js 20 ou superior.
2. Na pasta do projeto, instale tudo:

```bash
npm.cmd run install:all
```

No Windows PowerShell, use `npm.cmd` caso o comando `npm` esteja bloqueado pela politica de execucao.

## Executar em desenvolvimento

```bash
npm.cmd run dev
```

Enderecos padrao:

- Frontend: `http://localhost:5173`
- Backend/API: `http://localhost:3333`

O script do frontend compila e serve a versao local em modo preview, mantendo a execucao mais estavel no Windows. Se alterar arquivos do frontend, pare o comando e execute `npm.cmd run dev` novamente.

## Como usar

1. Acesse `http://localhost:5173/admin`.
2. Cadastre titulo, descricao, valor, bairro/cidade, contato e selecione varias fotos.
3. Depois de salvar, o painel mostra o link publico do imovel.
4. Compartilhe o link no formato:

```text
http://localhost:5173/imovel/casa-jardim-imperial-123
```

Na pagina publica, o cliente ve os detalhes, a galeria e o botao **Baixar fotos do imovel**.
No celular, cada foto da galeria tambem tem um botao **Baixar** para salvar as imagens uma a uma.

## Configuracoes do backend

Crie um arquivo `backend/.env` se quiser alterar portas e URLs:

```env
PORT=3333
PUBLIC_BASE_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

## Build para hospedagem

Para gerar o frontend:

```bash
npm.cmd run build
```

Para rodar o backend em producao:

```bash
npm.cmd run start --prefix backend
```

Em VPS, Render ou Railway:

- Configure `PORT` conforme a plataforma.
- Garanta armazenamento persistente para `backend/data` e `backend/uploads`.

## Publicar na internet pelo Render

O projeto ja inclui `render.yaml`, entao o Render consegue criar o servico com build e start command prontos.

1. Crie uma conta em `https://render.com`.
2. Envie esta pasta para um repositorio no GitHub.
3. No Render, clique em **New > Blueprint** ou **New > Web Service** e conecte o repositorio.
4. Use estes comandos se criar manualmente:

```bash
Build Command: npm install && npm run deploy:build
Start Command: npm start
```

5. Depois do deploy, o Render vai gerar uma URL parecida com:

```text
https://compartilhador-imoveis-123-new-house.onrender.com
```

6. Acesse:

```text
https://seu-app.onrender.com/admin
```

Ao cadastrar um imovel, o link copiado ja ficara publico:

```text
https://seu-app.onrender.com/imovel/casa-jardim-imperial-123
```

Importante: para fotos e banco SQLite nao sumirem em redeploy, mantenha um disco persistente apontando para `storage`, como ja esta no `render.yaml`.

## Publicar na Railway

Tambem funciona na Railway. Pela documentacao atual, o deploy mais simples pode ser feito conectando o GitHub ou usando o CLI com `railway up`.

Configure:

```bash
Build Command: npm install && npm run deploy:build
Start Command: npm start
```

Variaveis recomendadas:

```env
DATA_DIR=/app/storage/data
UPLOAD_DIR=/app/storage/uploads
```

Na Railway, confirme que existe volume persistente para a pasta `storage`.

## Endpoints principais

- `POST /api/properties` cria um imovel com fotos.
- `GET /api/properties` lista imoveis do painel.
- `GET /api/properties/:slug` retorna dados publicos do imovel.
- `GET /api/properties/:slug/download` baixa as fotos em ZIP.
- `GET /api/properties/:slug/photos/:photoId/download` baixa uma foto individual.
- `GET /uploads/:arquivo` serve imagens salvas.

## Observacoes

Este projeto nao inclui login administrativo para manter a instalacao simples. Antes de publicar em producao, recomenda-se adicionar autenticacao ao painel `/admin`.
