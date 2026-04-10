

# Criar usuário admin

## Passos

1. **Ativar confirmação automática de email** temporariamente para que o usuário possa logar imediatamente após criação
2. **Criar o usuário** via signup com email `leandro.guimaraes@rnp.br` e senha `Ja120706*`
3. **Promover para admin** — atualizar o role na tabela `user_roles` de `leitura` para `admin` (o trigger `handle_new_user` já cria o perfil e role `leitura` automaticamente)
4. **Desativar confirmação automática** para voltar ao comportamento padrão de verificação por email

## Detalhes técnicos

- Usar `cloud--configure_auth` para ativar/desativar auto-confirm
- Usar edge function ou script para criar o usuário via `supabase.auth.signUp`
- Usar migração SQL para fazer `UPDATE user_roles SET role = 'admin'` após criação

