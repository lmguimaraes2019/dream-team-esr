## Objetivo

Permitir cadastrar a **Descrição de Cargo** de cada colaborador (no modelo da planilha anexa "Analista Acadêmico - Conteúdo Pl"), exibida e editada em uma nova aba dentro da página de detalhes do colaborador.

## Estrutura da Descrição de Cargo

Baseada na planilha:
- **Missão do Cargo** (texto longo)
- **Processos + Principais Responsabilidades** (lista de pares: nome do processo + responsabilidade. Um processo pode ter várias responsabilidades, ex.: "Produção de Conteúdo" tem 6 itens)
- **Características do Cargo**
  - Formação acadêmica mínima (texto)
  - Formação acadêmica desejável (texto)
- **Competências Desejáveis** (lista ordenada de até ~10 itens)

Os campos cabeçalho (Cargo, Trajetória, Família, Diretoria, Nível) já existem na tabela `colaboradores` e serão apenas exibidos no topo da aba — não duplicados.

## Mudanças no banco

Criar duas tabelas no Supabase (com RLS):

1. **`descricao_cargo`** (1 registro por colaborador)
   - `id` uuid PK
   - `colaborador_id` uuid (unique)
   - `missao` text
   - `formacao_minima` text
   - `formacao_desejavel` text
   - `competencias` text[] (array ordenado)
   - `created_at`, `updated_at`

2. **`descricao_cargo_responsabilidades`** (N por descrição)
   - `id` uuid PK
   - `descricao_cargo_id` uuid
   - `processo` text
   - `responsabilidade` text
   - `ordem` int
   - `created_at`

RLS:
- SELECT: authenticated (igual às demais tabelas de leitura)
- ALL: admins e gestores (mesmo padrão de `feedback` / `one_on_one`)

Trigger `update_updated_at_column` em `descricao_cargo`.

## Mudanças no frontend

### Nova aba "Descrição de Cargo" em `src/pages/ColaboradorDetalhe.tsx`
Hoje a página usa Cards empilhados sem Tabs. Vou converter as seções já existentes (Dados Gerais / Contrato / Estrutura / Movimentações / Custos) para um layout com `Tabs`, adicionando a nova aba **"Descrição de Cargo"**. Conteúdo atual permanece intacto, só agrupado.

### Novo componente `src/components/DescricaoCargoCard.tsx`
- Modo visualização: mostra missão, agrupa responsabilidades por processo, características e lista numerada de competências (igual layout da planilha).
- Botão **Editar** (visível para admin/gestor) abre formulário inline:
  - Textarea para missão, formação mínima e desejável
  - Editor dinâmico de processos: adicionar/remover processo, e dentro dele adicionar/remover responsabilidades (com reordenação simples)
  - Editor de competências: lista ordenada com adicionar/remover/mover
- Salva via upsert em `descricao_cargo` + replace nas linhas de `descricao_cargo_responsabilidades`.

### (Opcional, sugerido) Importação a partir do template Excel
Adicionar botão **"Importar do Excel"** no card que aceita o mesmo layout da planilha anexa e popula automaticamente os campos. Útil para carregar várias descrições já existentes. Posso incluir agora ou deixar para uma segunda etapa — me avise.

## Arquivos a editar/criar

- (migração SQL) criar `descricao_cargo` e `descricao_cargo_responsabilidades` + RLS + trigger
- novo: `src/components/DescricaoCargoCard.tsx`
- novo: `src/components/DescricaoCargoEditDialog.tsx` (formulário de edição)
- editar: `src/pages/ColaboradorDetalhe.tsx` — envolver seções em `Tabs` e incluir a nova aba

## Permissões

- Visualização: qualquer usuário autenticado.
- Edição: admin e gestor (mesmo padrão usado em feedback/1on1).
