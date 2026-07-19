# Prevent Security — Ops Automation Pack (n8n)

5 workflows prontos para importar no n8n. Cobrem as principais operações diárias da Prevent Security.

## Workflows incluídos

| # | Arquivo | Função | Gatilho |
|---|---|---|---|
| 01 | `01-alarme-acionamento.json` | Recebe alarme do Segware, classifica por tipo (pânico/intrusão/incêndio) e notifica o grupo WhatsApp correto + loga no Sheets | Webhook POST do Segware |
| 02 | `02-ronda-verificacao.json` | A cada 30 min verifica checkpoints de ronda via Prevent API; alerta supervisor no WhatsApp se houver atraso | Cron a cada 30 min |
| 03 | `03-relatorio-diario.json` | Às 22h consolida alarmes, rondas e ocorrências do dia e envia resumo para diretoria e grupo de supervisores | Cron às 22h |
| 04 | `04-escalonamento-emergencia.json` | Escalonamento em 3 níveis (Operador → Supervisor → Diretoria) com timeout de 5 min em cada nível | Webhook POST evento crítico |
| 05 | `05-entrada-saida-moradores.json` | Registra entrada/saída de moradores e visitantes via App Prevent, notifica portaria e loga no Sheets | Webhook POST do App |

## Dependências

- **n8n** — motor de automação (self-hosted recomendado)
- **Evolution API** — integração WhatsApp
- **Google Sheets** — logs e relatórios
- **Prevent API** — dados operacionais (projeto `prevent-api`)

## Como usar

Ver guia completo em [docs/configuracao.md](docs/configuracao.md).

Resumo rápido:
1. Copiar `.env.example` → preencher com seus dados
2. Configurar variáveis no n8n (Settings → Variables)
3. Importar os 5 arquivos JSON no n8n
4. Apontar webhooks do Segware e do App Prevent para as URLs geradas
5. Ativar os workflows

## Estrutura de pastas

```
prevent-n8n-pack/
├── workflows/
│   ├── 01-alarme-acionamento.json
│   ├── 02-ronda-verificacao.json
│   ├── 03-relatorio-diario.json
│   ├── 04-escalonamento-emergencia.json
│   └── 05-entrada-saida-moradores.json
├── docs/
│   └── configuracao.md
├── festas-api/                          # API de locação de kits (Node + MariaDB)
├── .env.example
└── README.md
```

---

## Festas — Locação de Kits de Festa + Arcos de Balão

O sistema de locação de kits (catálogo, reservas com agenda, taxas de entrega e
montagem, pagamento **Pix + Mercado Pago** e painel administrativo) é uma **API
dedicada em Node + TypeScript com banco MariaDB**, na pasta
**[`festas-api/`](festas-api/)**. O frontend (SPA React/Vite) fica no repositório
`deliveryland-site` (`/festas`).

Guia completo em **[festas-api/README.md](festas-api/README.md)**.
