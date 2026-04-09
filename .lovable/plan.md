
# Sistema de Gestão Gerencial de Equipe — MVP

## Visão Geral
Sistema web em PT-BR para gestão de colaboradores com foco em custos, estrutura de carreira e dashboards executivos. Interface com toggle light/dark, sidebar de navegação, e controle de acesso por perfil.

## 1. Backend (Supabase/Lovable Cloud)

### Autenticação & Perfis
- Login com email/senha via Supabase Auth
- Tabela `user_roles` com enum (admin, gestor, leitura)
- RLS em todas as tabelas baseado no perfil do usuário

### Tabelas Principais
- **colaboradores**: nome, matrícula, gênero, liderança (bool), data_admissão, gerência, diretoria, cargo, trajetória, nível_complexidade (enum: junior/pleno/senior/especialista/master), grupo (1/2), tipo_vínculo (CLT/terceirizado), ativo (bool)
- **custos_mensais**: referência ao colaborador + mês de referência (YYYY-MM), salário_base, valores de cada encargo e benefício, provisões, totais calculados. Nunca sobrescreve — um registro por colaborador/mês
- **configuracoes_encargos**: taxas configuráveis (INSS %, FGTS %, PIS %, etc.) com versionamento por data
- **importacoes**: log de cada importação (arquivo, data, qtd registros, usuário)

### Cálculos
- Tempo de casa = calculado dinamicamente (hoje - data_admissão)
- Encargos = salário × taxa configurada
- Provisões: férias (salário/12), 1/3 férias, 13º (salário/12)
- Custo mensal = salário + encargos + benefícios + provisões
- Custo anual = mensal × 12

## 2. Interface & Páginas

### Layout
- Sidebar com navegação: Dashboard, Colaboradores, Importação, Configurações
- Header com toggle dark/light theme e info do usuário
- Design executivo limpo, responsivo

### Dashboard (página principal)
- **Cards resumo**: total colaboradores, custo total mensal, custo médio por colaborador
- **Gráficos** (Recharts):
  - Salário médio por gênero (barras)
  - Salário por gênero × liderança (barras agrupadas)
  - Custo por gerência (barras horizontais)
  - Distribuição por nível de complexidade (pizza/donut)
  - Distribuição por trajetória (pizza/donut)
- Filtro por mês de referência

### Lista de Colaboradores
- Tabela com busca e filtros (gerência, nível, vínculo)
- Colunas: nome, matrícula, gerência, cargo, nível, vínculo, custo mensal
- Link para página individual

### Página do Colaborador
- Dados gerais e estrutura (nível, trajetória, grupo)
- Breakdown detalhado de custos (salário, encargos, benefícios, provisões)
- Tempo de casa calculado
- Tipo de vínculo

### Importação de Planilha
- Upload de XLSX ou CSV
- Preview dos dados em tabela antes de confirmar
- Seleção do mês de referência
- Botão de confirmação para salvar
- Histórico de importações (nunca apaga dados anteriores)

### Configurações (admin only)
- Gerenciar taxas de encargos (INSS, FGTS, PIS)
- Gerenciar usuários e perfis de acesso

## 3. Controle de Acesso
- **Admin**: acesso total (CRUD colaboradores, importação, configurações, dashboards)
- **Gestor**: visualiza colaboradores da sua gerência + dashboards
- **Leitura**: apenas dashboards (somente visualização)

## 4. Escopo Excluído (V2+)
PDI, 1:1, workflows, automações avançadas
