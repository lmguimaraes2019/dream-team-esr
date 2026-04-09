

# Custos calculados a partir do salário + parametrização em Configurações

## Resumo
Mudar a lógica para que a importação traga apenas o salário mensal. Todos os encargos, benefícios e provisões serão calculados usando fórmulas fixas e parâmetros configuráveis na página de Configurações (renomeada de "Taxas de Encargos" para "Custos mensais, encargos e benefícios").

## Fórmulas (baseadas no salário mensal S)

**Encargos:**
- INSS (20% + 4,5% + 1%) = S × 0,255
- FGTS (8%) = S × 0,08
- PIS (1%) = S × 0,01
- Subtotal Encargos = S + INSS + FGTS + PIS

**Benefícios:**
- VR/VA = (22 × 35) + 299,77 = 1.069,77 (valor fixo parametrizável)
- VT = parametrizável (default 0)
- Plano Saúde = parametrizável (default 0)
- Seguro Vida = S × 0,005811
- Internet = 100,00 (valor fixo parametrizável)
- Subtotal Benefícios = soma dos 5 itens

**Provisões:**
- Férias (abono pecuniário) = (S / 30 × 10) / 12
- 1/3 Férias = ((S / 12) + Férias) / 3
- 13º = S / 12
- Subtotal Provisões = soma dos 3 itens

**Totais:**
- Custo Mensal = Subtotal Encargos + Subtotal Benefícios + Subtotal Provisões
- Custo Anual = Custo Mensal × 12

## 1. Página Configurações — redesign da seção de encargos

Renomear "Taxas de Encargos" para **"Custos mensais, encargos e benefícios"**. Reorganizar a tabela `configuracoes_encargos` para armazenar tanto taxas percentuais quanto valores fixos. Pré-popular com os parâmetros padrão:

| Parâmetro | Tipo | Valor Padrão |
|---|---|---|
| INSS | taxa | 25,5% |
| FGTS | taxa | 8% |
| PIS | taxa | 1% |
| VR/VA (fixo mensal) | valor | 1.069,77 |
| Seguro Vida | taxa | 0,5811% |
| Internet | valor | 100,00 |
| VT | valor | 0 |
| Plano Saúde | valor | 0 |

Adicionar coluna `tipo` (taxa/valor) à tabela `configuracoes_encargos` via migração.

## 2. Importação — simplificar para apenas salário

Alterar `Importacao.tsx`:
- Da planilha, importar apenas: dados cadastrais do colaborador + `salario_base`
- Após obter o salário, carregar os parâmetros de `configuracoes_encargos` e calcular todos os custos usando as fórmulas acima
- O preview já mostrará os valores calculados
- Remover referências a colunas de custo da planilha (INSS, FGTS, etc.)

## 3. Página ColaboradorDetalhe — custos calculados

Os custos mostrados no detalhe do colaborador continuam vindo da tabela `custos_mensais` (que agora armazena valores calculados). Nenhuma mudança estrutural necessária.

## 4. Função de cálculo reutilizável

Criar `src/lib/calcularCustos.ts` com uma função pura que recebe salário + parâmetros e retorna todos os campos de custo. Será usada tanto na importação quanto em eventual recálculo.

## Arquivos alterados
- `supabase/migrations/` — adicionar coluna `tipo` em `configuracoes_encargos`, inserir dados padrão
- `src/lib/calcularCustos.ts` — nova função de cálculo
- `src/pages/Configuracoes.tsx` — renomear seção, adicionar campo tipo
- `src/pages/Importacao.tsx` — simplificar para importar apenas salário e calcular custos
- `src/lib/importNormalization.ts` — limpar mapeamentos de colunas de custo (manter apenas cadastrais)

