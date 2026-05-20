---
tags: [prevent, n8n, automacao]
criado: 2026-05-20
status: ativo
projeto: prevent-n8n-pack
---

# Configuração do Prevent Security Ops Automation Pack

## Pré-requisitos

| Componente | Para quê | Onde obter |
|---|---|---|
| n8n (self-hosted ou cloud) | Motor de automação | n8n.io |
| Evolution API | Envio de WhatsApp | github.com/EvolutionAPI/evolution-api |
| Google Sheets API | Logs e relatórios | console.cloud.google.com |
| Prevent API rodando | Dados operacionais | Projeto `prevent-api` |

---

## Passo 1 — Instalar n8n

### Opção mais rápida (Docker):
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  --env-file .env \
  n8nio/n8n
```

Acesse: `http://SEU_SERVIDOR:5678`

---

## Passo 2 — Configurar Credenciais no n8n

### Google Sheets
1. n8n → Credentials → New → Google Sheets OAuth2
2. Configure Client ID e Secret no Google Cloud Console
3. Autorize a conta Google da Prevent

### Evolution API (WhatsApp)
- Não precisa de credencial n8n separada — usa Header Auth embutido nos nodes
- Configure os valores em Settings → Variables (veja passo 3)

---

## Passo 3 — Configurar Variáveis de Ambiente

No n8n: **Settings → Variables** → adicione cada variável do `.env.example`:

| Variável | Valor |
|---|---|
| `PREVENT_API_URL` | URL do servidor Prevent |
| `EVOLUTION_API_URL` | URL do servidor Evolution |
| `EVOLUTION_INSTANCE` | Nome da instância criada no Evolution |
| `EVOLUTION_API_KEY` | Chave de autenticação do Evolution |
| `WA_GRUPO_EMERGENCIA` | ID do grupo WhatsApp de emergência |
| `SHEETS_LOG_ALARMES_ID` | ID da planilha de log de alarmes |
| *(ver .env.example para lista completa)* | |

---

## Passo 4 — Importar os Workflows

1. n8n → Workflows → Import from File
2. Importar nesta ordem:
   - `01-alarme-acionamento.json`
   - `02-ronda-verificacao.json`
   - `03-relatorio-diario.json`
   - `04-escalonamento-emergencia.json`
   - `05-entrada-saida-moradores.json`
3. Em cada workflow: revisar nodes de Google Sheets e atualizar a credencial
4. Ativar cada workflow (toggle no canto superior direito)

---

## Passo 5 — Configurar Webhooks no Segware

Nos eventos do Segware Cloud, adicionar como destino de webhook:
```
POST https://SEU_N8N/webhook/segware-alarme
```

Para eventos de alta prioridade (pânico, invasão confirmada):
```
POST https://SEU_N8N/webhook/emergencia-critica
```

---

## Passo 6 — Configurar Webhook no App Prevent

No módulo de portaria do App Prevent, definir o endpoint:
```
POST https://SEU_N8N/webhook/entrada-saida
```

Payload esperado:
```json
{
  "acao": "ENTRADA",
  "morador_nome": "João Silva",
  "unidade": "Ap. 42",
  "condominio": "Res. Boa Vista",
  "placa_veiculo": "ABC-1234",
  "visitante_nome": null
}
```

---

## Planilhas Google Sheets necessárias

Criar uma planilha para cada ID configurado, com as abas:

### Planilha: Log Alarmes
| timestamp | tipo | nivel | cliente | endereco | zona | status |

### Planilha: Log Rondas
| data | hora_deteccao | total_atrasados | detalhes |
| data | hora | status |  *(aba "Verificações OK")*

### Planilha: Log Acessos
| timestamp | acao | morador | unidade | condominio | visitante | placa |

### Planilha: Histórico
| data | total_alarmes | ocorrencias_abertas | relatorio_completo |

---

## Endpoint da Prevent API necessário para Workflow 04

O workflow de escalonamento verifica confirmação via:
```
GET /api/emergencias/:id/ack
```
Resposta esperada: `{ "confirmado": true | false }`

Precisa ser implementado no `prevent-api` caso não exista.

---

## Fluxo resumido dos 5 workflows

```
[Segware] ──POST──> 01 Alarme
                      ├─ Pânico   → WhatsApp Emergência + Sheets
                      ├─ Intrusão → WhatsApp Operacional + Sheets
                      └─ Incêndio → WhatsApp Emergência + Sheets

[Cron 30min] ──────> 02 Ronda
                      ├─ Atraso detectado → WhatsApp Supervisor + Sheets
                      └─ Tudo OK → Log Sheets

[Cron 22h] ────────> 03 Relatório
                      ├─ Consolida alarmes + rondas + ocorrências
                      └─ Envia para Diretoria + Grupo Supervisores

[Segware crítico] ─> 04 Escalonamento
                      ├─ Nível 1: Operador (5 min)
                      ├─ Nível 2: Supervisor (+ 5 min)
                      └─ Nível 3: Diretoria

[App Prevent] ─────> 05 Portaria
                      ├─ Entrada morador → WhatsApp Portaria + Sheets
                      ├─ Saída morador   → WhatsApp Portaria + Sheets
                      └─ Visitante       → WhatsApp Portaria + Sheets
```
