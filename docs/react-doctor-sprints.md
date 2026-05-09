# React Doctor Checklist e Sprints Internas

## Sprint 1 - Medicao e Triagem

- [x] Rodar React Doctor em JSON/offline.
- [x] Separar warnings reais de falsos positivos do contexto Electron/Vite.
- [x] Manter migrations, restauracao de dados e handlers sequenciais quando a ordem protege integridade.

## Sprint 2 - Configuracao de Ruido

- [x] Configurar falsos positivos de SSR/progressive enhancement para app desktop Electron.
- [x] Ignorar analise de dead code que nao entende entrypoints Electron.
- [x] Excluir scripts operacionais do score React para focar no app.

## Sprint 3 - Estado e Render Seguro

- [x] Corrigir updates de estado com closure obsoleta em cadastros.
- [x] Trocar estado de arquivo de importacao por ref quando nao impacta render.
- [ ] Planejar refatoracao maior de `RoutesModule`, `SettingsModule` e `ImportsModule` para reducers/componentes menores.

## Sprint 4 - Micro-otimizacoes Seguras

- [x] Substituir cadeias `filter().map()` seguras por `flatMap`.
- [x] Usar atualizacoes funcionais de cards de rota.
- [x] Paralelizar leitura do arquivo e import dinamico de `xlsx`.
- [ ] Manter awaits sequenciais em migrations/sync quando ha dependencia de ordem.

## Sprint 5 - Verificacao

- [x] Rodar React Doctor novamente.
- [x] Rodar lint, build e testes locais.
- [x] Documentar warnings restantes e por que nao foram automatizados.

## Resultado

- Score inicial apos primeira rodada: 88, com 117 warnings.
- Score apos sprints: 98, com 7 warnings.
- Warnings restantes: `prefer-useReducer`, `no-giant-component` e `no-cascading-set-state` em `src/renderer/App.tsx`.

## Backlog Consciente

- Separar `RoutesModule` em componentes menores para controles, lista de funcionarios, cards de rota e historico.
- Migrar estado relacionado de `SettingsModule`, `ImportsModule`, `Shell` e `SetupScreen` para reducers quando houver uma bateria de testes de UI ou fluxo manual dedicado.
- Manter a configuracao do React Doctor focada no app Electron/Vite, ignorando falsos positivos de SSR, progressive enhancement e entrypoints Electron.
