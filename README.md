<p align="center">
  <img src="assets/vianexo-logo.png" alt="Logo ViaNexo" width="180" />
</p>

# ViaNexo

**ViaNexo** e uma plataforma desktop para gestao operacional de fretamento, frota e roteiros corporativos. O app foi pensado para empresas que hoje controlam clientes, funcionarios, vans/topics e divisoes de carros por planilhas, mas precisam de mais clareza, rastreabilidade e velocidade no dia a dia.

## Objetivo

Centralizar a operacao de transporte fretado em um aplicativo local para Windows, permitindo que a gestora importe planilhas de funcionarios, cadastre clientes, organize frota e motoristas, monte rotas em lote e acompanhe a operacao sem depender de controles manuais espalhados.

## Para que serve

- Cadastrar empresas contratantes.
- Importar funcionarios por planilha Excel/CSV.
- Preservar colunas extras da planilha como dados complementares.
- Cadastrar e editar veiculos, capacidades e motoristas.
- Criar motoristas diretamente pela tela de frota quando necessario.
- Montar rotas em lote, inclusive com funcionarios de clientes diferentes no mesmo carro.
- Salvar e editar rotas.
- Fazer backup local do banco.
- Receber aviso de nova versao e atualizar pelo app.

## Plataforma

- **Desktop Windows**
- **Offline-first**
- **Banco SQLite local**
- **Atualizacoes via GitHub Releases**

## Stack

- Electron
- React
- TypeScript
- Vite
- Prisma
- SQLite
- electron-builder
- electron-updater

## Desenvolvimento

No PowerShell, use `npm.cmd` para evitar bloqueio de `npm.ps1` por policy do Windows.

```powershell
npm.cmd install
npm.cmd run dev
```

## Validacao local

```powershell
npm.cmd run lint
npm.cmd run test:smoke
npm.cmd run test:permissions
npm.cmd run test:contracts
npm.cmd run test:migrations
npm.cmd run build
```

## Gerar instalador

```powershell
npm.cmd run package
```

Os arquivos finais ficam em `release/`:

- `ViaNexo Setup <versao>.exe`
- `ViaNexo Setup <versao>.exe.blockmap`
- `latest.yml`
- `win-unpacked/ViaNexo.exe`

## Versionamento e releases

O projeto usa versionamento semantico.

- `patch`: correcoes pequenas, exemplo `0.3.1`
- `minor`: novas features, exemplo `0.4.0`
- `major`: mudancas grandes, exemplo `1.0.0`

Fluxo recomendado:

```powershell
npm.cmd version patch
npm.cmd run package
gh release create v0.3.1 "release/ViaNexo Setup 0.3.1.exe" "release/latest.yml" "release/ViaNexo Setup 0.3.1.exe.blockmap" --title "ViaNexo 0.3.1" --notes "Notas da versao"
git push origin main --tags
```

## Repositorio e updates

O app consulta releases publicas do GitHub para verificar atualizacoes:

https://github.com/YanBatistaa/vianexo

Quando uma release com versao maior e publicada, o ViaNexo mostra uma notificacao no app permitindo atualizar agora ou depois.

## Release automatizada

O workflow `Build and release ViaNexo` pode ser executado manualmente no GitHub Actions. Ele roda lint, smoke, permissoes, contratos IPC, build do instalador, normaliza os assets do auto-update para `ViaNexo-Setup-<versao>.exe` e cria a release com `latest.yml`.

O campo `channel` permite publicar:

- `stable`: cria `v<versao>`.
- `beta`: cria `v<versao>-beta` marcada como pre-release.

Para gerar notas locais:

```powershell
npm.cmd run release:changelog -- --version=0.3.1 --channel=stable
```
