# Plano Nuvem e Portal

## Estado implementado

- Exportacao local `vianexo.sync-package.v1`.
- Arquivo JSON salvo em `sync-packages` dentro da pasta de backup.
- Pacote inclui clientes, funcionarios, frota, motoristas e rotas.
- Auditoria registra cada exportacao.

## Proximo passo de nuvem

1. Criar API autenticada para receber `vianexo.sync-package.v1`.
2. Validar `schema`, `appVersion`, `createdAt` e contagens.
3. Aplicar upsert por `id` em banco remoto.
4. Retornar status de sincronizacao para o desktop.

## Portal do cliente

1. Cliente acessa somente suas rotas e funcionarios.
2. Dados publicados vêm do pacote de sincronizacao.
3. Portal nunca recebe hash de senha, permissoes internas ou sessoes locais.
4. Futuro campo recomendado: token publico por cliente, rotacionavel pelo desktop.
