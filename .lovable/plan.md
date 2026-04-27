## Objetivo

Adicionar importação de **Processos e Principais Responsabilidades** via planilha Excel, simplificar a visualização na página do colaborador deixando blocos colapsáveis, e mostrar no dashboard quantos processos/responsabilidades cada colaborador tem mapeados.

## Escopo

### 1. Importar Processos e Responsabilidades de planilha (no editor)

No `DescricaoCargoEditDialog.tsx`, na **etapa 2 (Processos)**, adicionar botão **"Importar de planilha"** ao lado de "+ Novo".

Comportamento:
- Abre seletor de arquivo (`.xlsx`/`.xls`).
- Lê a planilha com a lib `xlsx` (já usada no projeto em `MovimentacoesCarreiraImport`/`TabelaSalarialImport`).
- Procura automaticamente as colunas **"Processos"** e **"Principais Responsabilidades do Cargo"** pelos nomes do cabeçalho (com normalização de acentos/case, semelhante a `mapHeader` em `importNormalization.ts`). Demais colunas são ignoradas.
- Detecção do header: varre as primeiras ~15 linhas procurando uma linha que contenha as duas colunas.
- Cada linha vira uma responsabilidade. Linhas com **Processo vazio** herdam o último processo preenchido (planilhas costumam mesclar células do processo). Linhas totalmente vazias são ignoradas.
- O resultado é **mesclado** com os processos já existentes na tela (mesma lógica de agrupar consecutivos por nome de processo) — o usuário pode revisar/editar antes de salvar.
- Toast de sucesso com `X processos / Y responsabilidades importados`. Em caso de erro (colunas não encontradas, planilha inválida), toast destrutivo explicando o problema.
- Pequeno texto-dica abaixo do botão: "A planilha deve conter as colunas *Processos* e *Principais Responsabilidades do Cargo*."

### 2. Página do colaborador — colapsar conteúdos

**`DescricaoCargoCard.tsx`** — seção "Processos e Principais Responsabilidades":
- Cada processo vira um item de **Accordion** (`@/components/ui/accordion`, já presente no projeto).
- Por padrão **todos colapsados**, mostrando só o nome do processo + contador `(N responsabilidades)`.
- Ao clicar na seta, expande e mostra a lista de responsabilidades (mantendo o estilo atual de `<ul>` com bullets).
- Adicionar pequenos botões "Expandir todos / Recolher todos" no topo da seção.

**`MovimentacoesCarreiraCard.tsx`** — histórico:
- Mostrar apenas as **2 últimas movimentações** (já vêm ordenadas por `data desc`).
- Se houver mais, abaixo da tabela aparece um botão `Ver mais N movimentações ▼` que expande as demais. Ao expandir, troca para `Recolher ▲`.

### 3. Dashboard — KPI de descrições de cargo mapeadas

Em `src/pages/Index.tsx`, dentro do bloco existente de KPIs (grid `md:grid-cols-4`), adicionar **um novo card** ou uma **lista compacta** mostrando:

- **Card resumo** com o total agregado: `X / Y colaboradores com processos mapeados` e abaixo `Z processos · W responsabilidades`.
- Logo abaixo (em uma nova `Card` colapsável), uma tabela com **uma linha por colaborador ativo** mostrando: Nome · Cargo · Nº de Processos · Nº de Responsabilidades. A tabela é ordenada por nome e tem busca simples (Input). Usar Accordion para manter o dashboard limpo (default colapsado).

Consulta: `descricao_cargo_responsabilidades` agrupando por `descricao_cargo_id`, juntando com `descricao_cargo` → `colaborador_id` → `colaboradores` (nome, cargo, ativo). Contagem distinta de `processo` por colaborador para o número de processos.

## Arquivos afetados

- `src/components/DescricaoCargoEditDialog.tsx` — botão de importar + parser xlsx + merge no estado.
- `src/components/DescricaoCargoCard.tsx` — accordion para processos.
- `src/components/MovimentacoesCarreiraCard.tsx` — limitar a 2 + "ver mais".
- `src/pages/Index.tsx` — novo card KPI + tabela colapsada de mapeamento por colaborador.

Sem mudanças no banco de dados, RLS, edge functions ou tipos.

## Detalhes técnicos

- `xlsx` já está instalado (vide `MovimentacoesCarreiraImport.tsx`/`TabelaSalarialImport.tsx`); reutilizar `XLSX.read` + `sheet_to_json({ header: 1 })` para conseguir varrer linhas brutas e localizar o header.
- Normalização do header: `lower + NFD + sem acento + trim`. Aceitar variações: `processos`, `processo`, `principais responsabilidades do cargo`, `principais responsabilidades`, `responsabilidades`.
- Após importar, atualizar `groups` com `setGroups(prev => mergeGroups(prev, imported))`. `mergeGroups` mantém os processos existentes e acrescenta os novos ao final; se um processo importado tiver o mesmo nome (case-insensitive) de um já existente, suas responsabilidades são acrescentadas ao grupo correspondente.
- Accordion: usar `Accordion type="multiple"` para permitir múltiplos abertos ao mesmo tempo; estado controlado para suportar Expandir/Recolher todos.
- Movimentações: estado local `expanded: boolean`; `visiveis = expanded ? movs : movs.slice(0, 2)`.
- KPI dashboard: uma única chamada Supabase carrega todas as linhas de `descricao_cargo_responsabilidades` com `descricao_cargo!inner(colaborador_id, colaboradores!inner(nome, cargo, ativo))`. Agregação feita em memória.

## Fora do escopo

- Importar Missão, Formação ou Competências da planilha (apenas Processos/Responsabilidades, conforme pedido).
- Edição inline da tabela de mapeamento no dashboard.
