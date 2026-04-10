

# Módulo de Feedback e 1:1

## Resumo

Criar um módulo completo com 3 tabelas (one_on_one, feedback, desenvolvimento_acoes), uma nova página dedicada, uma aba na página do colaborador, e indicadores no dashboard.

## 1. Migrações de banco de dados

### Enums
```sql
CREATE TYPE tipo_feedback AS ENUM ('positivo', 'construtivo', 'reconhecimento', 'ajuste');
CREATE TYPE tipo_acao_dev AS ENUM ('curso', 'pratica', 'comportamento');
CREATE TYPE status_acao_dev AS ENUM ('pendente', 'em_andamento', 'concluido');
CREATE TYPE status_one_on_one AS ENUM ('planejado', 'realizado');
CREATE TYPE origem_acao AS ENUM ('one_on_one', 'feedback');
```

### Tabela `one_on_one`
- id, colaborador_id, gestor_id (uuid → auth.users), data, status, pauta, resumo (NOT NULL), pontos_positivos, pontos_atencao, riscos, proximos_passos, confidencial (default false), created_at, updated_at
- RLS: admin/gestor pode criar/editar; authenticated pode ver (exceto confidenciais — filtro no código)

### Tabela `feedback`
- id, colaborador_id, autor_id (uuid → auth.users), tipo, data, contexto, descricao, impacto, sugestao_melhoria, created_at
- RLS: admin/gestor pode criar; authenticated pode ver

### Tabela `desenvolvimento_acoes`
- id, colaborador_id, origem_tipo, origem_id, descricao, tipo, prazo, status, evidencia, created_at
- RLS: admin/gestor pode gerenciar; authenticated pode ver

## 2. Componentes (arquivos novos)

| Arquivo | Conteúdo |
|---|---|
| `src/components/feedback/ColaboradorFeedback1on1.tsx` | Aba "Feedback e 1:1" para a página do colaborador — exibe último 1:1, histórico, feedbacks, ações abertas |
| `src/components/feedback/OneOnOneForm.tsx` | Dialog/formulário estruturado para criar/editar 1:1 com validação de resumo obrigatório + botão "Criar ação de desenvolvimento" |
| `src/components/feedback/FeedbackForm.tsx` | Dialog simples e rápido para registrar feedback (poucos campos visíveis, resto colapsável) |
| `src/components/feedback/AcaoDesenvolvimentoForm.tsx` | Dialog para criar/editar ação de desenvolvimento vinculada a 1:1 ou feedback |
| `src/components/feedback/AcoesDesenvolvimentoList.tsx` | Lista de ações com status e filtros |

## 3. Página do colaborador

- **`src/pages/ColaboradorDetalhe.tsx`** — Adicionar aba/seção "Feedback e 1:1" usando o componente `ColaboradorFeedback1on1`
- Exibir: card do último 1:1, lista cronológica de 1:1 anteriores, lista de feedbacks, ações de desenvolvimento abertas

## 4. Página dedicada "Feedback e 1:1"

- **`src/pages/FeedbackOneOnOne.tsx`** — Visão gerencial com:
  - Lista de todos os 1:1 (filtro por colaborador/gerência)
  - Lista de feedbacks recentes
  - Ações de desenvolvimento pendentes
- Rota: `/feedback-1on1`
- Adicionar ao sidebar (`AppSidebar.tsx`) e ao router (`App.tsx`)

## 5. Dashboard — indicadores

- **`src/pages/Index.tsx`** — Adicionar card com 4 KPIs:
  - % colaboradores com 1:1 nos últimos 30 dias
  - Feedbacks registrados no mês
  - Ações de desenvolvimento abertas
  - Taxa de conclusão de ações

## 6. Arquivos alterados

| Ação | Arquivo |
|---|---|
| Migração | 3 tabelas + 5 enums + RLS |
| Novo | `src/components/feedback/ColaboradorFeedback1on1.tsx` |
| Novo | `src/components/feedback/OneOnOneForm.tsx` |
| Novo | `src/components/feedback/FeedbackForm.tsx` |
| Novo | `src/components/feedback/AcaoDesenvolvimentoForm.tsx` |
| Novo | `src/components/feedback/AcoesDesenvolvimentoList.tsx` |
| Novo | `src/pages/FeedbackOneOnOne.tsx` |
| Editar | `src/pages/ColaboradorDetalhe.tsx` — nova aba |
| Editar | `src/pages/Index.tsx` — KPIs |
| Editar | `src/App.tsx` — nova rota |
| Editar | `src/components/AppSidebar.tsx` — novo item menu |

## Regras de acesso

- Gestores e admins: criar/editar 1:1, feedback e ações
- Todos autenticados: visualizar (campos confidenciais filtrados no código para não-gestores)
- Resumo obrigatório no 1:1 (validação frontend + NOT NULL no banco)

