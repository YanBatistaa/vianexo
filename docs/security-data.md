# Seguranca e Dados

## Sessao

- Login cria token aleatorio local.
- Banco guarda apenas SHA-256 do token.
- Sessao expira em 14 dias e renova ao abrir o app.
- Logout revoga token salvo.
- Token fica no `localStorage` do renderer Electron.

## Backups

- Backups continuam arquivos SQLite locais.
- Cada backup recente mostra SHA-256 parcial na tela de configuracoes.
- Restauracao valida cabecalho SQLite antes de trocar banco.
- Antes da restauracao, app cria copia de seguranca do banco atual.

## Dados Sensíveis

- Senhas usam `bcrypt`.
- Permissoes ficam por modulo e acao.
- Acoes sensiveis registram auditoria local.
- Banco ainda nao usa criptografia completa em repouso; para ambiente com risco físico alto, usar disco criptografado do Windows.
