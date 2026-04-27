## Objetivo

Transformar o atual diálogo único de edição de **Descrição de Cargo** em uma **jornada por etapas (wizard)**, dando destaque e ergonomia à entrada de **Processos** e **Principais Responsabilidades**, que hoje é a parte mais trabalhosa do cadastro.

## Como ficará a jornada

O diálogo `DescricaoCargoEditDialog` passará a ter um cabeçalho com indicador de etapas (stepper) e botões "Voltar / Próximo / Salvar" no rodapé.

Etapas:

1. **Missão do Cargo** — apenas o textarea da missão, com texto de apoio.
2. **Processos e Responsabilidades** *(etapa principal, redesenhada)*
3. **Formação Acadêmica** — mínima e desejável, lado a lado.
4. **Competências Desejáveis** — lista numerada.
5. **Revisão** — resumo somente leitura de tudo que foi preenchido + botão "Salvar".

O usuário pode navegar livremente entre etapas (clicar no stepper) sem perder dados; o salvamento só acontece na etapa final (mesma lógica atual de upsert).

## Foco: etapa de Processos e Responsabilidades

Hoje cada processo é um bloco com lista de itens dentro. A etapa será reorganizada para ficar mais fluida:

- **Painel esquerdo (lista de processos)**: lista vertical compacta com o nome de cada processo, contador de responsabilidades (`3 itens`), botão "+ Adicionar processo" no topo, e setas para reordenar / ícone de excluir ao passar o mouse. O processo selecionado fica destacado.
- **Painel direito (detalhe do processo selecionado)**:
  - Campo "Nome do processo" no topo.
  - Lista numerada de **Principais Responsabilidades** com:
    - Textarea por item (auto-resize, 2 linhas iniciais).
    - Atalho **Enter no fim do último item cria um novo item automaticamente**, e Backspace em item vazio remove.
    - Setas ↑ ↓ e ✕ por linha.
    - Botão "+ Adicionar responsabilidade" ao final.
  - Em telas estreitas (< 768px) os dois painéis empilham (lista colapsa em accordion).

Comportamentos que reduzem cliques:
- Ao adicionar um novo processo, ele já vem selecionado e com **uma responsabilidade vazia em foco**.
- Itens 100% vazios são descartados automaticamente ao salvar (já é o comportamento atual).
- Indicador no stepper mostra `Processos (3)` para dar visibilidade do quanto já foi preenchido.

## Arquivos afetados

- `src/components/DescricaoCargoEditDialog.tsx` — refatoração principal: introdução do stepper, separação do conteúdo em sub-componentes internos por etapa, novo layout dois-painéis para Processos/Responsabilidades, atalhos de teclado.
- Sem mudanças em banco de dados, RLS, tipos ou no `DescricaoCargoCard.tsx` (a estrutura de dados salva continua idêntica: linhas em `descricao_cargo_responsabilidades` com `processo`, `responsabilidade`, `ordem`).

## Detalhes técnicos

- Estado novo: `step: 1..5` e `selectedProcessoIdx: number | null`. Demais estados (`missao`, `groups`, `competencias`, `formacaoMinima`, `formacaoDesejavel`) permanecem.
- Stepper: implementado com componentes existentes (`Button` ghost + separadores) — sem nova dependência.
- Atalho Enter: `onKeyDown` no textarea da última responsabilidade chama `addItem(gi)` e foca o novo via `ref` + `useEffect`.
- Validação leve antes de avançar da etapa 2: avisar (toast) se algum processo estiver sem nome ou sem nenhuma responsabilidade preenchida — sem bloquear, apenas alertando.
- `handleSave` permanece o mesmo (chamado no botão "Salvar" da etapa 5).

## Fora do escopo

- Importação por Excel (continua pendente como possível próxima etapa).
- Mudanças no card de visualização.
