# ViaNexo

Aplicativo desktop Windows para gestao operacional de fretamento, frota, motoristas, funcionarios importados por planilha e montagem de rotas em lote.

## Desenvolvimento

```powershell
npm.cmd install
npm.cmd run dev
```

## Build local

```powershell
npm.cmd run build
npm.cmd run package
```

O instalador Windows e os arquivos de update ficam em `release/`.

## Versionamento e releases

Use versionamento semantico simples:

- `patch`: correcoes pequenas, exemplo `0.2.1`
- `minor`: novas features, exemplo `0.3.0`
- `major`: mudancas grandes, exemplo `1.0.0`

Fluxo recomendado:

```powershell
npm.cmd version patch
npm.cmd run package
gh release create v0.2.1 "release/ViaNexo Setup 0.2.1.exe" "release/latest.yml" "release/ViaNexo Setup 0.2.1.exe.blockmap"
```

O app usa GitHub Releases para verificar atualizacoes.
