

# Adicionar "Número Prog. de Férias" e "Data Limite" às Férias

## Resumo

Adicionar o campo `numero_programacao` (1, 2 ou 3) à tabela `ferias_periodos` para identificar cada parcela do fracionamento de férias (máximo 3). Exibir também a "Data Limite Máxima" do período aquisitivo nas tabelas. Atualizar importação para reconhecer essas colunas.

## Mudanças

### 1. Migração — nova coluna

```sql
ALTER TABLE public.ferias_periodos 
  ADD COLUMN numero_programacao smallint NOT NULL DEFAULT 1;

-- Constraint: 1, 2 ou 3
ALTER TABLE public.ferias_periodos 
  ADD CONSTRAINT ferias_numero_prog_check 
  CHECK (numero_programacao BETWEEN 1 AND 3);
```

### 2. `FeriasAgendadasTab.tsx`

- Adicionar `numero_programacao` ao form (select com opções 1ª, 2ª, 3ª)
- Adicionar coluna "Nº Prog." na tabela
- Adicionar coluna "Data Limite" buscando `data_limite_concessao` do período aquisitivo vinculado (já vem no join)
- Atualizar query select para incluir `data_limite_concessao` no join de `periodos_aquisitivos`
- Adicionar ordenação por `numero_programacao`

### 3. `PeriodosAquisitivosTab.tsx`

- Adicionar coluna "Data Limite" exibindo `data_limite_concessao` formatada

### 4. `ImportacaoTab.tsx`

- Adicionar `numero_programacao` e `data_limite_concessao` ao `ImportRow`
- Reconhecer colunas "Número Prog. de Férias" / "Programação" da planilha RNP
- Parsear valores como "1a", "2a", "3a" → 1, 2, 3
- Atualizar template XLSX com a nova coluna
- Incluir no preview e no `confirmImport`

### 5. Validação em `feriasLogic.ts`

- Adicionar validação: máximo 3 programações por período aquisitivo
- Não permitir dois registros com mesmo `numero_programacao` no mesmo período aquisitivo

## Arquivos alterados

| Ação | Arquivo |
|---|---|
| Migração | Nova migração — coluna `numero_programacao` |
| Editar | `src/components/ferias/FeriasAgendadasTab.tsx` |
| Editar | `src/components/ferias/PeriodosAquisitivosTab.tsx` |
| Editar | `src/components/ferias/ImportacaoTab.tsx` |
| Editar | `src/lib/feriasLogic.ts` |

