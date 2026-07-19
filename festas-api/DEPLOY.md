# Deploy na VPS — atelieabelhinha.com.br

Guia para colocar o sistema no ar numa VPS, com:

- **SPA** (site do cliente + painel) na raiz: `https://atelieabelhinha.com.br`
- **API** no subdomínio: `https://api.atelieabelhinha.com.br`
- **MariaDB** + **API** em Docker; **nginx** como proxy/HTTPS na frente.

## 1. DNS

Aponte para o IP da VPS:

| Registro | Nome | Valor |
|---|---|---|
| A | `atelieabelhinha.com.br` | IP da VPS |
| A | `api.atelieabelhinha.com.br` | IP da VPS |

## 2. Subir a API + banco (Docker)

```bash
git clone <este-repo> && cd prevent-n8n-pack/festas-api
cp .env.example .env      # preencha: JWT_SECRET, ADMIN_*, PIX_*, MP_ACCESS_TOKEN, senhas do banco
docker compose up -d --build
docker compose exec api npm run seed
```

A API fica em `127.0.0.1:3333` (exposta pelo compose). O nginx publica via HTTPS.

## 3. Publicar a SPA

No repositório do frontend (`deliveryland-site/festas-app`):

```bash
npm install && npm run build      # gera ../festas
```

Copie o conteúdo de `festas/` para o docroot da VPS, ex.:

```bash
rsync -av festas/ usuario@vps:/var/www/atelieabelhinha/
```

Confira que `/var/www/atelieabelhinha/festas-config.js` tem a URL certa:

```js
window.__FESTAS_API__ = "https://api.atelieabelhinha.com.br";
```

## 4. nginx

```nginx
# ── Site (SPA) ────────────────────────────────────────────────
server {
  server_name atelieabelhinha.com.br www.atelieabelhinha.com.br;
  root /var/www/atelieabelhinha;
  index index.html;

  # SPA (HashRouter): tudo cai no index.html
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /assets/ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
  # HTTPS via certbot (listen 443 ssl; ...)
}

# ── API ───────────────────────────────────────────────────────
server {
  server_name api.atelieabelhinha.com.br;
  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Emita os certificados:

```bash
sudo certbot --nginx -d atelieabelhinha.com.br -d www.atelieabelhinha.com.br -d api.atelieabelhinha.com.br
```

## 5. Mercado Pago

No painel do Mercado Pago, o webhook usado é
`https://api.atelieabelhinha.com.br/webhooks/mercadopago` (já enviado
automaticamente em cada preferência via `PUBLIC_API_URL`). Confirme que a API
está acessível por HTTPS antes de ativar pagamentos em produção.

## 6. Conferência rápida

```bash
curl https://api.atelieabelhinha.com.br/health          # {"ok":true,...}
curl https://api.atelieabelhinha.com.br/catalogo        # kits + disponibilidade
# abra https://atelieabelhinha.com.br  → catálogo
# abra https://atelieabelhinha.com.br/#/admin → login do painel
```

> **Atualizações:** API → `git pull && docker compose up -d --build`.
> SPA → `npm run build` e re-publicar a pasta `festas/`.
