## Exportar banco completo em SQL

Gerar um arquivo `.sql` executável em PostgreSQL 15 limpo, contendo toda a estrutura e dados do schema `public` do Lovable Cloud.

### O que será incluído

1. **Extensões necessárias** (`pgcrypto` para `gen_random_uuid()`).
2. **Tipos ENUM** (`app_role`, `tipo_acao_dev`, `status_acao_dev`, `status_ferias`, `status_periodo_aquisitivo`, `status_one_on_one`, gêneros, tipos de vínculo, níveis de complexidade, tipos de ausência/licença/feedback etc.).
3. **CREATE TABLE** de todas as 18 tabelas do schema `public`:
   - colaboradores, custos_mensais, configuracoes_encargos, importacoes
   - user_roles, profiles
   - descricao_cargo, descricao_cargo_responsabilidades
   - movimentacoes_carreira, tabela_salarial, origens_recurso
   - feedback, one_on_one, desenvolvimento_acoes
   - ferias_periodos, periodos_aquisitivos, ausencias, licencas
4. **Constraints, defaults, PK/índices**.
5. **Funções**: `handle_new_user`, `has_role`, `update_updated_at_column`.
6. **Triggers** (se houver — atualmente nenhum no banco).
7. **Políticas RLS** de cada tabela + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `GRANT`s.
8. **INSERT INTO** com todos os registros atuais de cada tabela (dump de dados via `pg_dump --data-only --inserts`).

### Como será gerado

Usarei `pg_dump` direto contra o banco gerenciado (via `PG*` env vars) com as flags:

```
pg_dump --schema=public --no-owner --no-privileges=false \
        --inserts --column-inserts \
        --quote-all-identifiers
```

Isso produz um único arquivo `schema_public_dump.sql` com `CREATE TYPE`, `CREATE FUNCTION`, `CREATE TABLE`, políticas e `INSERT INTO` de cada linha. Em seguida farei uma verificação rápida (contagem de tabelas e linhas) para confirmar integridade.

### Observações importantes

- **auth.users não será exportado** (schema reservado do Supabase). Em um PostgreSQL 15 limpo, as FKs lógicas para `auth.users` (ex.: `user_id` em `profiles`, `user_roles`) ficarão sem a tabela de origem — você precisará criar uma tabela `auth.users` mínima ou remover as referências antes de rodar, dependendo do destino.
- O trigger `on_auth_user_created` que chama `handle_new_user()` depende do schema `auth` e não funcionará em PG limpo sem adaptação.
- Storage buckets (`avatars`) e arquivos físicos **não** entram no dump SQL — precisam ser migrados separadamente.
- O arquivo será salvo em `/mnt/documents/schema_public_dump.sql` para download.

Confirma que posso prosseguir com a geração do dump?