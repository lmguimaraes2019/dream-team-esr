

# Refatoração: Sistema Completo de Férias e Licenças

## Resumo

Substituir o modelo atual (tabela única `ausencias`) por três entidades distintas: **períodos aquisitivos**, **férias** e **licenças**. Criar lógica de saldo, validações CLT, geração automática de períodos, data de corte configurável, e interface com 5 abas na página `/ferias-licencas`.

## Escopo da mudança

### 1. Banco de dados — 4 migrações

**a) Novas tabelas**

```text
periodos_aquisitivos
├── id, colaborador_id
├── data_inicio, data_fim, data_limite_concessao
├── dias_direito (default 30)
├── dias_agendados, dias_gozados, dias_abono
├── saldo_disponivel (computed: dias_direito - dias_agendados - dias_abono)
├── status (enum: aberto, parcial, concluido, vencido, desconsiderado)
├── desconsiderar_periodo, motivo_desconsideracao, desconsiderado_por, desconsiderado_em
└── timestamps

ferias_periodos
├── id, colaborador_id, periodo_aquisitivo_id
├── data_inicio, data_fim, dias_gozo
├── abono_pecuniario, dias_abono, decimo_terceiro_antecipado
├── status (enum: agendada, concluida, cancelada)
├── observacao
└── timestamps

licencas
├── id, colaborador_id
├── tipo (enum: medica, maternidade, outros)
├── data_inicio, data_fim
├── observacao
└── timestamps
```

**b) Configuração de data de corte**

Inserir na tabela `configuracoes_encargos` (ou criar tabela `configuracoes_sistema`) um registro `data_corte_periodos_aquisitivos`.

**c) RLS policies** — mesmo padrão atual: admin gerencia, authenticated visualiza.

**d) Tabela `ausencias`** — manter para não quebrar código legado, mas parar de usar para férias novas. Migrar dados existentes para as novas tabelas via script SQL.

### 2. Lógica de negócio (funções utilitárias)

Criar `src/lib/feriasLogic.ts`:

- **Geração de períodos aquisitivos**: com base em `data_admissao`, gerar períodos de 12 meses, respeitando a data de corte configurada
- **Cálculo de status**: aberto → parcial → concluído / vencido, baseado em `data_limite_concessao` (11 meses após fim do período)
- **Validações CLT**:
  - Não permitir saldo negativo
  - Não permitir sobreposição de férias
  - Menores de 18 / maiores de 50: apenas 30 dias corridos
  - Início não pode ser sáb/dom/feriado
  - Fracionamentos válidos: 30, 15+15, 20+10 abono
- **Débito/crédito de saldo**: ao criar/editar/excluir férias, recalcular `dias_agendados`, `dias_gozados`, `dias_abono` e `saldo_disponivel`

### 3. Interface — Página `/ferias-licencas` com 5 abas

**Aba 1 — Visão Gerencial**
- Cards: total CLT, períodos em aberto, vencidos, vencendo em 60 dias, saldo médio, ausentes hoje, licenças ativas
- Mini-gráfico de férias por mês (próximos 6 meses)

**Aba 2 — Períodos Aquisitivos**
- Tabela: colaborador, período, concessivo, saldo, status (badge colorido)
- Ação: "Desconsiderar período" (com motivo) / "Reativar"
- Botão: "Gerar períodos" (admin, processa todos os CLT)

**Aba 3 — Férias Agendadas**
- Tabela com CRUD: colaborador, período aquisitivo vinculado, datas, dias, abono, 13º, status
- Ao criar: selecionar período aquisitivo elegível, mostrar saldo, validar regras
- Edição recalcula saldo; cancelamento devolve saldo

**Aba 4 — Licenças**
- Tabela separada com CRUD simples (tipo, datas, observação)
- Badges por tipo (cores existentes)

**Aba 5 — Importação**
- Upload XLSX/CSV (lógica SheetJS existente adaptada)
- Preview com match automático
- Importa para `ferias_periodos` + gera período aquisitivo se necessário

### 4. Configurações

- Adicionar na página `/configuracoes`: campo "Data de corte dos períodos aquisitivos" (date picker, salva no banco)

### 5. Integração com páginas existentes

- **Dashboard** (`Index.tsx`): substituir query de `ausencias` por union de `ferias_periodos` (status agendada/concluida com datas ativas) + `licencas` (datas ativas). Adicionar cards de períodos vencidos e vencendo.
- **Colaboradores** (`Colaboradores.tsx`): tag vermelha "Sem férias previstas" usa `periodos_aquisitivos` (status aberto, sem férias agendadas). Badge de ausência ativa usa `ferias_periodos` + `licencas`.
- **ColaboradorDetalhe** (`ColaboradorDetalhe.tsx`): substituir `AusenciasManager` por componente novo que mostra períodos aquisitivos, férias e licenças do colaborador.
- **`AusenciasManager.tsx`**: refatorar para usar novas tabelas ou depreciar em favor de componente novo.

### 6. Componentes novos

| Componente | Função |
|---|---|
| `src/components/ferias/VisaoGerencial.tsx` | Cards + indicadores |
| `src/components/ferias/PeriodosAquisitivosTab.tsx` | Tabela + ações |
| `src/components/ferias/FeriasAgendadasTab.tsx` | CRUD férias |
| `src/components/ferias/LicencasTab.tsx` | CRUD licenças |
| `src/components/ferias/ImportacaoTab.tsx` | Upload + preview |
| `src/components/ferias/FeriasForm.tsx` | Dialog de criação/edição com validações |
| `src/components/ferias/ColaboradorFerias.tsx` | Visão por colaborador (detalhe) |
| `src/lib/feriasLogic.ts` | Regras de negócio |

### 7. Arquivos alterados

| Ação | Arquivo |
|---|---|
| Migração | `supabase/migrations/xxx_create_periodos_aquisitivos.sql` |
| Migração | `supabase/migrations/xxx_create_ferias_periodos.sql` |
| Migração | `supabase/migrations/xxx_create_licencas.sql` |
| Migração | `supabase/migrations/xxx_add_data_corte_config.sql` |
| Criar | `src/lib/feriasLogic.ts` |
| Criar | `src/components/ferias/*.tsx` (6 componentes) |
| Reescrever | `src/pages/FeriasLicencas.tsx` |
| Editar | `src/pages/Index.tsx` — novos cards + queries |
| Editar | `src/pages/Colaboradores.tsx` — usar novas tabelas |
| Editar | `src/pages/ColaboradorDetalhe.tsx` — componente novo |
| Editar | `src/pages/Configuracoes.tsx` — data de corte |
| Depreciar | `src/components/AusenciasManager.tsx` — manter exports para compatibilidade |

### Ordem de execução

1. Migrações (tabelas + enums + RLS + config)
2. `feriasLogic.ts` (regras de negócio)
3. Componentes de cada aba
4. Página `FeriasLicencas.tsx` com abas
5. Configurações (data de corte)
6. Integração: Dashboard, Colaboradores, ColaboradorDetalhe
7. Migração de dados de `ausencias` para novas tabelas

