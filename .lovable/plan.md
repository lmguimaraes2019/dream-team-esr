

# Limpar períodos aquisitivos futuros do banco de dados

## Problema

A lógica em `feriasLogic.ts` já foi corrigida para não gerar períodos com `data_fim` após hoje. Porém, os períodos futuros (como 12/09/2026–11/09/2027 da Alessandra) já foram inseridos no banco antes da correção e continuam aparecendo.

## Solução

### 1. Migração SQL — remover períodos futuros existentes

```sql
DELETE FROM public.periodos_aquisitivos 
WHERE data_fim > CURRENT_DATE;
```

Isso remove todos os períodos aquisitivos cujo término é posterior a hoje, limpando os dados gerados incorretamente.

### 2. Proteção adicional no `handleGerarPeriodos`

Em `PeriodosAquisitivosTab.tsx`, adicionar um filtro extra no momento da geração para garantir que mesmo que a lógica mude, períodos com `data_fim > hoje` nunca sejam inseridos:

```ts
// Filtrar períodos cujo data_fim seja futuro antes de inserir
const novosValidos = novos.filter(p => p.data_fim <= formatDate(new Date()));
```

## Arquivos alterados

| Ação | Arquivo |
|---|---|
| Migração | DELETE de períodos com `data_fim > CURRENT_DATE` |
| Editar | `src/components/ferias/PeriodosAquisitivosTab.tsx` — filtro extra |

