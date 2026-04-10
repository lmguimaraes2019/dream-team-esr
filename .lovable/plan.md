

# Gestão de Férias e Licenças — Implementação Completa

## Resumo
Expandir a tabela `ausencias` com campos da planilha (período aquisitivo, dias, abono pecuniário, 13º antecipado). Criar página `/ferias-licencas` com CRUD e importação XLSX. Adicionar tag vermelha "Sem férias previstas" para CLT sem férias no ano corrente.

## 1. Migração — novas colunas em `ausencias`

```sql
ALTER TABLE ausencias
  ADD COLUMN periodo_aquisitivo_inicio date,
  ADD COLUMN periodo_aquisitivo_fim date,
  ADD COLUMN dias integer,
  ADD COLUMN abono_pecuniario boolean NOT NULL DEFAULT false,
  ADD COLUMN dias_abono integer,
  ADD COLUMN decimo_terceiro_antecipado boolean NOT NULL DEFAULT false;
```

## 2. Nova página: `src/pages/FeriasLicencas.tsx`

- Tabela global com todas ausências: Colaborador, Tipo (badge colorido), Período Aquisitivo, Início, Fim, Dias, Abono, 13º Antecipado, Observação, Ações (editar/excluir)
- Filtros por tipo de ausência e por colaborador (dropdown)
- Botão **Registrar** — dialog com todos os campos (incluindo seleção de colaborador via dropdown)
- Botão **Editar** — dialog pré-preenchido, UPDATE no banco
- Botão **Excluir** — AlertDialog com confirmação
- **Importação de planilha** (XLSX/CSV via SheetJS):
  - Lê headers flexíveis (Nome, Matrícula, Período Aquisitivo, 1º/2º/3º Período Início/Fim, Abono, 13º)
  - Para cada período preenchido, gera uma linha de ausência
  - Match automático por nome ou matrícula (case-insensitive)
  - Preview com status de match antes de confirmar inserção

## 3. Tag "Sem férias previstas" (vermelho)

- **`Colaboradores.tsx`**: após carregar colaboradores, buscar IDs que possuem registro tipo `ferias` com `data_inicio` no ano corrente. CLTs sem registro recebem tag vermelha "Sem férias previstas" ao lado do nome.
- **`ColaboradorDetalhe.tsx`**: mesma lógica — se CLT e sem férias no ano corrente, exibir tag vermelha no header.

## 4. Atualizar componentes existentes

- **`AusenciasManager.tsx`**: exportar `TIPO_LABELS` e `TIPO_COLORS`. Exibir campos extras (período aquisitivo, dias, abono, 13º) na listagem e no formulário de registro.
- **`AppSidebar.tsx`**: adicionar item "Férias e Licenças" com ícone `Calendar`.
- **`App.tsx`**: adicionar rota `/ferias-licencas` protegida.

## Arquivos alterados

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/migrations/xxx_add_ferias_fields.sql` |
| Criar | `src/pages/FeriasLicencas.tsx` |
| Editar | `src/App.tsx` — rota |
| Editar | `src/components/AppSidebar.tsx` — menu item |
| Editar | `src/components/AusenciasManager.tsx` — campos extras, exports |
| Editar | `src/pages/Colaboradores.tsx` — tag vermelha |
| Editar | `src/pages/ColaboradorDetalhe.tsx` — tag vermelha |

