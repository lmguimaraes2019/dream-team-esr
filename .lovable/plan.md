

# Corrigir limite de geração de períodos aquisitivos

## Problema
A função `gerarPeriodosAquisitivos` gera períodos até `hoje + 12 meses`, o que cria períodos futuros como 2027/2028. O correto é gerar apenas períodos cujo **início** caia até o final do ano corrente (31/12 do ano atual).

## Mudança

**Arquivo:** `src/lib/feriasLogic.ts`, função `gerarPeriodosAquisitivos`

Substituir:
```ts
const limite = addMonths(hoje, 12);
```

Por:
```ts
// Gerar apenas períodos que iniciam até 31/12 do ano corrente
const limite = new Date(hoje.getFullYear(), 11, 31);
```

Isso garante que um colaborador admitido em 15/03/2020 terá períodos gerados até no máximo o que inicia em 15/03/2025 (englobando o ano corrente 2026), mas não gerará 2027/2028.

Nenhuma outra alteração necessária — a lógica de cutoff e status permanece igual.

