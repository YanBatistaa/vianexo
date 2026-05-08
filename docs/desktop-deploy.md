# Deploy Desktop ViaNexo

## Gerar instalador

```powershell
npm.cmd run package
```

O comando gera:

- `release/ViaNexo-Setup-<versao>.exe`
- `release/ViaNexo-Setup-<versao>.exe.blockmap`
- `release/latest.yml`

## Instalador customizado

Os recursos visuais ficam em `build/`:

- `installerSidebar.bmp`
- `installerHeader.bmp`
- `license_pt_BR.txt`

O script `scripts/generate-installer-assets.ts` recria os BMPs antes do pacote.

## Atualizacao silenciosa

O app baixa a atualizacao pelo `electron-updater`, mostra progresso no modal e aplica com `quitAndInstall(true, true)`.

Na pratica:

- usuario clica em `Atualizar agora`;
- barra de progresso mostra download/status;
- app aplica a atualizacao sem apresentar wizard de instalacao;
- ViaNexo reinicia automaticamente apos aplicar.
