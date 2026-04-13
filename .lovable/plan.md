

# Movimentações de Carreira — Importação, CRUD e Exibição

## Resumo
Criar tabela `movimentacoes_carreira`, componente de importação na página de Configurações, CRUD manual (adicionar/editar/excluir movimentações) na página de detalhe do colaborador, e exibir "tempo desde última movimentação" e "tipo da última movimentação" nos Dados Gerais.

## 1. Migração SQL — Nova tabela

```sql
CREATE TABLE public.movimentacoes_carreira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  data date NOT NULL,
  tipo_movimentacao text NOT NULL,
  cargo text,
  salario numeric,
  trajetoria text,
  nivel text,
  grupo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes_carreira ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage movimentacoes" ON public.movimentacoes_carreira
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth can view movimentacoes" ON public.movimentacoes_carreira
  FOR SELECT TO authenticated USING (true);
CREATE UNIQUE INDEX idx_movimentacoes_unique 
  ON public.movimentacoes_carreira (colaborador_id, data, tipo_movimentacao);
```

## 2. Componente de importação — `MovimentacoesCarreiraImport.tsx`

Novo componente em `src/components/MovimentacoesCarreiraImport.tsx`:
- Upload XLSX, parse com `xlsx`
- Detectar linhas-cabeçalho (matrícula curta em col A, nome em col B) vs linhas de movimentação (data em col A, tipo em col B)
- Match colaborador por matrícula no banco
- Preview com badge match/não encontrado
- Upsert em `movimentacoes_carreira` (usando `colaborador_id + data + tipo_movimentacao` para evitar duplicatas)
- Botão limpar importação anterior

## 3. Card na página de Configurações

Adicionar card "Movimentações de Carreira" em `src/pages/Configuracoes.tsx` com o componente de importação.

## 4. Exibir na página de detalhe do colaborador

Em `src/pages/ColaboradorDetalhe.tsx`, no card "Dados Gerais":
- Buscar movimentação mais recente de `movimentacoes_carreira` para o colaborador
- Após "Tempo de Casa", exibir:
  - **Última Movimentação**: tipo (ex: "DISSÍDIO") + tempo desde ela (ex: "1 ano e 3 meses")

## 5. CRUD de movimentações na página do colaborador

Novo card "Histórico de Movimentações" em `ColaboradorDetalhe.tsx`:
- Tabela com colunas: Data, Tipo, Cargo, Salário, Nível, Grupo
- Botão "Adicionar Movimentação" (admin) abre dialog com form
- Botão editar em cada linha (admin) abre dialog preenchido
- Botão excluir com confirmação (admin)
- Dialog com campos: data, tipo_movimentacao (input text), cargo, salário, trajetória, nível, grupo

## Detalhes técnicos

- Parsing da planilha: col A numérica curta (< 999999 e não é data) = cabeçalho do colaborador; col A com formato data = movimentação
- Salários no formato americano com vírgula como separador de milhar
- O componente de CRUD será extraído em `src/components/MovimentacoesCarreiraCard.tsx` para manter o arquivo de detalhe organizado

