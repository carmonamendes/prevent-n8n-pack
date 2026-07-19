---
tags: [festas, n8n, locacao, pix, mercadopago]
criado: 2026-07-19
status: ativo
projeto: prevent-n8n-pack
modulo: kit-festas
---

# Módulo Festas — Locação de Kits de Festa + Arcos de Balão

Backend em n8n para o site de locação (`deliveryland-site`, pasta `/festas`).
Cobre catálogo, agenda/disponibilidade, cálculo de taxas, reserva e pagamento
(**Pix Copia-e-Cola** e **Mercado Pago**), com notificações no WhatsApp.

> Este módulo é independente dos 5 workflows da Prevent Security. Os arquivos
> ficam em `workflows/kit-festas/` e usam suas próprias variáveis (`FESTAS_*`).

---

## Arquitetura

```
[Frontend /festas]  ──GET──>  festas-catalogo          → kits + datas ocupadas + taxas
        │           ──POST─>  festas-reserva           → valida, grava, gera pagamento
        │                                                 ├─ pix         → Pix Copia-e-Cola
        │                                                 └─ mercadopago → init_point (checkout)
        │
[Mercado Pago]      ──POST─>  festas-mp-webhook         → confirma pagamento → status PAGO
[Painel admin]      ──POST─>  festas-admin-reserva      → listar / confirmar Pix / cancelar
[Cron 8h]           ────────> (lembrete)                → agenda do dia seguinte no WhatsApp
```

| # | Arquivo | Função | Gatilho |
|---|---|---|---|
| 01 | `festas-01-catalogo-disponibilidade.json` | Devolve kits ativos, datas indisponíveis e taxas | `GET /webhook/festas-catalogo` |
| 02 | `festas-02-reserva-pagamento.json` | Valida data, calcula total, grava reserva e gera Pix ou preferência Mercado Pago | `POST /webhook/festas-reserva` |
| 03 | `festas-03-mercadopago-webhook.json` | Recebe notificação do MP, confirma pagamento e bloqueia a data | `POST /webhook/festas-mp-webhook` |
| 04 | `festas-04-admin-reserva.json` | Painel: listar reservas, confirmar Pix manual, cancelar | `POST /webhook/festas-admin-reserva` |
| 05 | `festas-05-lembrete-evento.json` | Envia a agenda de amanhã ao dono | Cron diário 8h |

---

## Passo 1 — Planilha Google Sheets

Crie **uma** planilha e copie o ID para `SHEETS_FESTAS_ID`. Ela precisa de 3 abas
com estes cabeçalhos **exatos** na primeira linha:

### Aba `Kits`
| id | nome | tema | descricao | preco_locacao | imagem_url | itens | ativo |
|----|------|------|-----------|---------------|------------|-------|-------|
| 1 | Kit Circo | Circo | Mesa + painel + torre | 350 | https://.../circo.jpg | Mesa\|Painel\|Torre de doces | SIM |

- `itens` — separe cada item por `\|` (barra vertical).
- `ativo` — `SIM` para aparecer no catálogo; qualquer outro valor esconde.
- `preco_locacao` — só número (ex: `350` ou `350.00`).

### Aba `Reservas`
| id | criado_em | kit_id | kit_nome | data_evento | periodo | cliente_nome | cliente_whatsapp | endereco | taxa_entrega | taxa_montagem | valor_kit | valor_total | metodo_pagamento | status | pagamento_id | obs |

Preenchida automaticamente. `status` segue o ciclo:
`AGUARDANDO_PAGAMENTO` → `PAGO` → `CONCLUIDO`, ou `CANCELADO` (libera a data).

### Aba `Bloqueios` (opcional)
| data | motivo |
|------|--------|
| 2026-08-15 | Feriado / indisponível |

Datas aqui (formato `AAAA-MM-DD`) somem do calendário mesmo sem reserva.

---

## Passo 2 — Variáveis de ambiente

No n8n (**Settings → Variables**) ou no `.env` do container, preencha a seção
`MÓDULO FESTAS` do [`.env.example`](../.env.example):

| Variável | Para quê |
|---|---|
| `SHEETS_FESTAS_ID` | ID da planilha de Festas |
| `WA_FESTAS_DONO` | Número do dono (recebe as notificações) |
| `FESTAS_NOME_NEGOCIO` | Nome exibido nas mensagens |
| `FESTAS_TAXA_MONTAGEM` | Valor fixo da montagem |
| `FESTAS_TAXA_ENTREGA_BASE` / `_KM` | Entrega = base + km × distância |
| `FESTAS_ANTECEDENCIA_MIN_DIAS` | Mínimo de dias para reservar |
| `FESTAS_PIX_CHAVE` / `_NOME` / `_CIDADE` | Dados do recebedor Pix |
| `FESTAS_MP_ACCESS_TOKEN` | Access Token do Mercado Pago |
| `FESTAS_MP_URL_*` | Páginas de retorno do checkout |
| `FESTAS_N8N_BASE_URL` | URL pública do n8n (callback do MP) |
| `FESTAS_ADMIN_TOKEN` | Senha simples do painel admin |
| `FESTAS_CORS_ORIGIN` | Domínio do site (CORS) |

> **Reutiliza** o Evolution API já configurado para a Prevent
> (`EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY`).

---

## Passo 3 — Importar e ativar

1. n8n → **Import from File** → importe os 5 arquivos de `workflows/kit-festas/`.
2. Em cada workflow, abra os nodes **Google Sheets** e selecione a credencial
   OAuth2 (a mesma da Prevent serve, se a conta tiver acesso à planilha).
3. **Ative** os 5 workflows (toggle superior direito).

---

## Passo 4 — Configurar o Mercado Pago

1. Crie uma aplicação em <https://www.mercadopago.com.br/developers>.
2. Copie o **Access Token de produção** → `FESTAS_MP_ACCESS_TOKEN`.
3. A `notification_url` é enviada automaticamente em cada preferência
   (`FESTAS_N8N_BASE_URL` + `/webhook/festas-mp-webhook`). Confirme que o n8n
   está acessível publicamente por HTTPS.

## Passo 5 — Apontar o frontend

No app `/festas` (repo `deliveryland-site`, arquivo `festas/config.js`), defina
`N8N_BASE` para a URL pública do n8n. Os endpoints usados são:

```
GET  {N8N_BASE}/webhook/festas-catalogo
POST {N8N_BASE}/webhook/festas-reserva
POST {N8N_BASE}/webhook/festas-admin-reserva   (painel admin)
```

---

## Contrato dos endpoints

### `POST /webhook/festas-reserva`
```json
{
  "kit_id": "1",
  "data_evento": "2026-08-20",
  "periodo": "tarde",
  "cliente_nome": "Ana",
  "cliente_whatsapp": "5511999998888",
  "endereco": "Rua X, 123 - Bairro",
  "distancia_km": 6,
  "quer_montagem": true,
  "metodo_pagamento": "pix"
}
```
Resposta (Pix):
```json
{
  "ok": true,
  "reserva_id": "R260719-0-04213",
  "status": "AGUARDANDO_PAGAMENTO",
  "metodo_pagamento": "pix",
  "valor_total": 491.0,
  "resumo": { "kit_nome": "Kit Circo", "data_evento": "2026-08-20", "valor_kit": 350, "taxa_entrega": 51, "taxa_montagem": 120, "periodo": "tarde" },
  "pagamento": { "tipo": "pix", "pix_copia_cola": "000201...6304ABCD", "chave": "...", "instrucoes": "..." }
}
```
Com `metodo_pagamento: "mercadopago"`, `pagamento` traz `init_point` (URL do checkout).

Erros de validação retornam `422 { "ok": false, "erro": "..." }`
(data ocupada, antecedência mínima, kit inativo, etc.).

### `POST /webhook/festas-admin-reserva`
```json
{ "token": "SEU_ADMIN_TOKEN", "acao": "listar" }
{ "token": "SEU_ADMIN_TOKEN", "acao": "confirmar", "reserva_id": "R260719-0-04213" }
{ "token": "SEU_ADMIN_TOKEN", "acao": "cancelar",  "reserva_id": "R260719-0-04213" }
```

---

## Observações de segurança

- O **total é sempre recalculado no servidor** a partir do preço do kit e das
  taxas configuradas — o valor enviado pelo frontend nunca é confiado.
- A **data é validada contra reservas ativas** no momento da reserva, evitando
  reserva dupla. Reservas `AGUARDANDO_PAGAMENTO` já seguram a data.
- O painel admin exige `FESTAS_ADMIN_TOKEN`. Troque o valor padrão.
- O Pix Copia-e-Cola é gerado no padrão EMV/BR Code (com CRC16). Confira a
  chave e o nome do recebedor antes de divulgar.
