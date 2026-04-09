

# Correção: Dados não aparecem após importação

## Diagnóstico
A importação registrou 38 linhas como "concluído", mas as tabelas `colaboradores` e `custos_mensais` estão vazias (0 registros). Os upserts falharam silenciosamente porque o código faz `continue` sem logar erros.

**Causa raiz**: os valores da planilha não correspondem aos enums do banco:
- `genero`: aceita apenas `masculino`, `feminino`, `outro`
- `nivel_complexidade`: apenas `junior`, `pleno`, `senior`, `especialista`, `master`
- `tipo_vinculo`: apenas `clt`, `terceirizado`

Se a planilha tiver "Sênior", "CLT", "Masculino" (com maiúscula ou acentos), o insert falha.

## Plano de Correção

### 1. Melhorar normalização de enums no `Importacao.tsx`
- Criar mapeamentos robustos que convertam variações comuns para os valores aceitos:
  - Gênero: "M"/"Masculino"/"masc" → "masculino", "F"/"Feminino"/"fem" → "feminino"
  - Nível: "Sênior"/"Sr"/"senior"/"sênior" → "senior", "Júnior"/"Jr" → "junior", "Pleno"/"Pl" → "pleno"
  - Vínculo: "CLT"/"Clt" → "clt", "Terceirizado"/"terceiro"/"PJ" → "terceirizado"

### 2. Tratar datas do Excel
- Detectar quando `data_admissao` é um número serial do Excel e converter para formato ISO (YYYY-MM-DD)

### 3. Adicionar tratamento de erros visível
- Em vez de `continue` silencioso, coletar os erros de cada linha e exibir um resumo ao final (ex: "35 de 38 importados, 3 com erro")
- Logar qual linha e qual erro ocorreu

### 4. Deletar a importação fantasma
- Remover o registro de importação que mostra "38 registros concluído" mas não salvou nada, para manter o histórico correto

### Arquivos alterados
- `src/pages/Importacao.tsx` — normalização de enums, tratamento de datas Excel, feedback de erros

