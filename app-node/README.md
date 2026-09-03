# app-node

Mini proyecto Node.js **sin dependencias externas**. Sirve como conejillo de indias
para los ejemplos de GitHub Actions en este laboratorio.

## Contenido

- `src/index.js` — exporta `sum(a, b)` y `greet(name)`. Tiene un bloque
  `if (require.main === module)` para correrlo directo con `node`.
- `test/smoke.test.js` — 2 tests usando el runner nativo `node:test`.

## Comandos locales

```bash
npm test       # corre node --test test/
npm start      # ejecuta src/index.js
node src/index.js G4
```

## Por qué este proyecto

Es deliberadamente mínimo:

- **No tiene dependencias** → `package-lock.json` se genera con `npm install` y queda
  estable para que los ejemplos de cache funcionen con claves reproducibles.
- **Tests nativos (`node:test`)** → no requiere instalar Jest/Vitest, así los flujos
  en los runners de GitHub Actions son rápidos.

## Cómo lo usan los workflows

La mayoría de los ejemplos hacen checkout del repo completo y luego apuntan al
subdirectorio con `defaults.run.working-directory: app-node`, o directamente
ejecutan comandos asumiendo que ese path existe. Ver cada `README.md` de nivel
para el detalle.
