

# Corrigir nome do campo para "Pl. Saúde e Odont."

## Problema
O campo está exibido como "Plano de Saúde" mas deveria ser "Pl. Saúde e Odont." conforme a planilha de importação (coluna "PL. SAUDE E ODONT (MÉDIA)").

## Alterações

1. **`src/lib/calcularCustos.ts`** — Atualizar o lookup em `buildParametros` para buscar `"Pl. Saúde e Odont."` (ou manter fallback para variações existentes como "Plano Saúde", "Plano de Saúde")

2. **`src/pages/ColaboradorDetalhe.tsx`** — Alterar o label de `"Plano de Saúde"` para `"Pl. Saúde e Odont."` na exibição de custos detalhados

3. **`src/pages/Configuracoes.tsx`** — Se o encargo estiver cadastrado com nome diferente, garantir consistência no nome exibido

