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
│   ├── 05-entrada-saida-moradores.json
│   └── kit-festas/                      # Módulo Festas (locação de kits)
│       ├── festas-01-catalogo-disponibilidade.json
│       ├── festas-02-reserva-pagamento.json
│       ├── festas-03-mercadopago-webhook.json
│       ├── festas-04-admin-reserva.json
│       └── festas-05-lembrete-evento.json
├── docs/
│   ├── configuracao.md
│   └── kit-festas.md
├── .env.example
└── README.md
```

---

## Módulo Festas — Locação de Kits de Festa + Arcos de Balão

Além dos workflows da Prevent Security, este repositório inclui o **backend de
locação de kits de festa** que alimenta o site em `deliveryland-site/festas`.
São 5 workflows n8n (catálogo, reserva, pagamento **Pix + Mercado Pago**,
confirmação e agenda) usando Google Sheets como banco e Evolution API para
WhatsApp.

Guia completo em **[docs/kit-festas.md](docs/kit-festas.md)**.
