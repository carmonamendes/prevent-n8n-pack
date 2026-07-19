# Festas API — Locação de Kits de Festa

API REST do sistema de locação de kits de festa e arcos de balão.
**Node + TypeScript + Fastify + Prisma + MariaDB.** Faz catálogo, reservas com
agenda, cálculo de taxas, pagamento **Pix** (Copia-e-Cola) e **Mercado Pago**,
painel administrativo com login e notificações no WhatsApp (Evolution API).

O frontend (SPA React/Vite) fica no repositório `deliveryland-site` (`/festas`).

## Stack

- **Fastify** — servidor HTTP
- **Prisma** — ORM sobre **MariaDB**
- **@fastify/jwt** + **bcryptjs** — autenticação do admin
- **zod** — validação de entrada
- Pix EMV/BR Code gerado internamente (com CRC16); Mercado Pago via API oficial

## Subir com Docker (recomendado)

```bash
cp .env.example .env      # preencha os valores (ver abaixo)
docker compose up -d --build
docker compose exec api npm run seed   # cria admin, config e kits de exemplo
```

A API sobe em `http://SEU_SERVIDOR:3333` (aplica as migrations automaticamente).
Coloque um proxy reverso (nginx/Traefik) com HTTPS na frente e aponte
`PUBLIC_API_URL` para o domínio público (necessário para o webhook do Mercado Pago).

## Rodar local (sem Docker)

```bash
npm install
cp .env.example .env       # DATABASE_URL apontando para seu MariaDB
npx prisma migrate deploy  # ou: npx prisma migrate dev
npm run seed
npm run dev                # http://localhost:3333
```

## Variáveis de ambiente

Veja `.env.example`. As principais:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão MariaDB (Prisma) |
| `JWT_SECRET` | Assinatura do token de admin |
| `ADMIN_EMAIL` / `ADMIN_SENHA` | Admin criado no `seed` |
| `PUBLIC_API_URL` | URL pública da API (webhook do MP) |
| `CORS_ORIGIN` | Domínio do frontend (ex.: `https://deliveryland.com.br`) |
| `PIX_CHAVE` / `PIX_NOME` / `PIX_CIDADE` | Recebedor do Pix |
| `MP_ACCESS_TOKEN` | Token do Mercado Pago |
| `EVOLUTION_*` / `WA_DONO` | WhatsApp (opcional; vazio desliga) |

Taxas e antecedência têm valores iniciais no `.env`, mas depois são **editáveis
no painel admin** (ficam na tabela `config`).

## Endpoints

### Público
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status |
| GET | `/catalogo` | Kits ativos + datas indisponíveis + taxas |
| POST | `/reservas` | Cria reserva e gera pagamento (Pix ou Mercado Pago) |
| POST | `/webhooks/mercadopago` | Confirmação automática do Mercado Pago |

### Admin (Bearer JWT — obtido em `/auth/login`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | `{ email, senha }` → token |
| GET | `/admin/dashboard` | Métricas + próximos eventos |
| GET/PUT | `/admin/config` | Ver/editar nome e taxas |
| GET/POST | `/admin/kits` | Listar / criar kit |
| PATCH/DELETE | `/admin/kits/:id` | Editar / excluir kit |
| GET | `/admin/reservas?status=` | Listar reservas |
| POST | `/admin/reservas/:id/confirmar` | Confirmar Pix manual |
| POST | `/admin/reservas/:id/cancelar` | Cancelar (libera a data) |
| GET/POST | `/admin/bloqueios` | Datas bloqueadas |
| DELETE | `/admin/bloqueios/:data` | Desbloquear data |

### Exemplo — criar reserva
```http
POST /reservas
Content-Type: application/json

{
  "kit_id": 1,
  "data_evento": "2026-08-20",
  "periodo": "tarde",
  "cliente_nome": "Ana",
  "cliente_whatsapp": "11999998888",
  "endereco": "Rua X, 123",
  "distancia_km": 6,
  "quer_montagem": true,
  "metodo_pagamento": "pix"
}
```
Resposta (Pix): `pagamento.pix_copia_cola` traz o BR Code. Para `mercadopago`,
`pagamento.init_point` traz o link do checkout.

## Segurança

- O **total é sempre recalculado no servidor** — o valor do frontend é ignorado.
- A data é validada **dentro de uma transação** contra reservas ativas e
  bloqueios, evitando reserva dupla.
- Rotas de admin protegidas por JWT; senha com bcrypt. Rate limit de 120 req/min.

## Modelo de dados

`kits`, `reservas`, `bloqueios`, `config` (linha única) e `admins`.
Ciclo de status da reserva: `AGUARDANDO_PAGAMENTO → PAGO → CONCLUIDO`
(ou `CANCELADO`, que libera a data).
