# Lab 09 — CI/CD para `app-node` con GitHub Actions

Laboratorio paso a paso para armar un pipeline de integración y despliegue
continuo sobre el mini proyecto Node.js que vive en `app-node/`. El objetivo
es que cada `push` ejecute tests, construya una imagen Docker y la publique en
Docker Hub, reutilizando los conceptos de los niveles 07 (cache) y 08
(artifacts).

## Contexto

`app-node/` es una aplicación Node.js mínima con dos funciones (`sum`,
`greet`), un `package.json` con `npm test` y un `Dockerfile` por escribir. La
idea es montar sobre ese esqueleto un workflow profesional que:

1. Instale dependencias aprovechando un cache entre runs.
2. Corra los tests y deje un reporte descargable desde la UI.
3. Empaquete el proyecto dentro de una imagen Docker reproducible.
4. Publique esa imagen en Docker Hub usando secrets.

## Objetivos de aprendizaje

Al terminar este lab vas a saber:

- Escribir un workflow con **jobs encadenados** mediante `needs:`.
- **Cachear dependencias** entre runs con `actions/cache` (clave estable +
  `restore-keys` como fallback).
- **Subir artefactos** (reportes, binarios, logs) para descargar desde la UI
  o pasar entre jobs.
- Escribir un **`Dockerfile` multi-stage** que produzca imágenes chicas y
  reproducibles.
- **Publicar imágenes a Docker Hub** desde un workflow, autenticando con
  secrets y reutilizando capas con `cache-from` / `cache-to`.

## Requisitos previos

- Una cuenta en [Docker Hub](https://hub.docker.com).
- En el repo de GitHub, dos secrets en *Settings → Secrets and variables →
  Actions*:
  - `DOCKERHUB_USERNAME` — tu usuario de Docker Hub.
  - `DOCKERHUB_TOKEN` — un access token (no la contraseña) generado desde
    *Docker Hub → Account Settings → Security*.
- Docker instalado localmente para probar el `Dockerfile` antes de pushear.

## El reto

Vas a crear un único archivo `.github/workflows/ci.yml` con tres jobs.
Andá paso por paso, commiteá entre paso y paso, y revisá la pestaña
**Actions** del repo después de cada push.

### Paso 1 — Job `test` con cache de `node_modules`

Pistas:

- Arrancá con `actions/checkout@v4`.
- Para instalar Node usá `actions/setup-node@v4` con `node-version: 20` y,
  opcionalmente, el cache built-in apuntando a `app-node/package-lock.json`.
- Si preferís hacerlo manual con `actions/cache@v4`, la `key` debe depender
  del hash de `app-node/package-lock.json` y conviene darle `restore-keys`
  con prefijo como fallback.
- Corré los tests con `npm test --prefix app-node` y **subí la salida como
  artifact** con `actions/upload-artifact@v4`. Un buen nombre:
  `test-results`.
- Tip: el artifact tiene que vivir incluso cuando el cache falla, así que no
  lo pongas como paso condicional al cache hit.

Concepto clave a repasar: `07-cache/README.md`.

### Paso 2 — `Dockerfile` multi-stage

Vas a crear un `Dockerfile` en la **raíz del repo** (no dentro de
`app-node/`). Pensá en dos stages:

- **Stage `builder`**: imagen base `node:20-alpine`. Copiás primero
  `app-node/package*.json`, corrés `npm ci --omit=dev` para aprovechar la
  cache de capas de Docker, y después copiás `app-node/src/`.
- **Stage `runtime`**: misma imagen base, pero con lo mínimo: copiás del
  stage `builder` solo `node_modules` y el código. Definí un `USER` no root,
  un `WORKDIR` y un `CMD` que arranque `node src/index.js`.

No te olvides del `.dockerignore` (excluí `node_modules`, `.github`, `*.md`,
`test/`).

Concepto a repasar: buenas prácticas de imágenes (multi-stage, capas
ordenadas por estabilidad).

### Paso 3 — Job `build` que construye y cachea capas

Encadenalo con `needs: test`. Pistas:

- Reautenticá en Docker Hub con `docker/login-action@v3` (sí, también en el
  job `build`, aunque no publiques acá — así el `cache-from`/`cache-to`
  funciona si lo subís a un registry intermedio).
- Usá `docker/build-push-action@v5` con:
  - `context: app-node` (o `.` si preferís).
  - `file: ./Dockerfile` (porque vive en la raíz).
  - `push: false` — todavía no publicamos.
  - `tags: ${{ github.sha }}` para tener una etiqueta única.
  - `cache-from: type=gha` y `cache-to: type=gha,mode=max` para reusar
    capas **entre runs**. Esto vive en GitHub Actions cache, no en Docker
    Hub.

Concepto clave a repasar: la diferencia entre cache de GitHub Actions y
artifact.

### Paso 4 — Job `publish` a Docker Hub

Encadenalo con `needs: build`. Pistas:

- Disparalo con un `if:` que filtre, por ejemplo:
  `github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))`.
- `docker/login-action` con los dos secrets.
- `docker/build-push-action` con `push: true` y `tags`:
  - `${{ secrets.DOCKERHUB_USERNAME }}/app-node:${{ github.sha }}` — siempre.
  - `${{ secrets.DOCKERHUB_USERNAME }}/app-node:latest` — solo en `main`.
- Si todo salió bien, la imagen aparece en
  `https://hub.docker.com/r/<tu-usuario>/app-node/tags` después de unos
  minutos.

Concepto clave a repasar: `08-artifacts/README.md` (la idea de "salida del
pipeline, visible y descargable").

### Paso 5 (bonus) — Extensiones opcionales

- Agregá un tag basado en versión con `docker/metadata-action` cuando se
  pushea un tag `v*` (ej: `v1.2.3` → `app-node:1.2.3`).
- Sumá un job `lint` con `hadolint` para validar el `Dockerfile`.
- Subí la imagen construida como artifact vía `actions/upload-artifact` (con
  `actions/download-artifact`) para tener un fallback de "imagen local" sin
  volver a Docker Hub.

## Checklist de "¿lo logré?"

- [ ] `npm test` corre en CI y la ejecución aparece verde.
- [ ] El artifact `test-results` se descarga desde la página del run.
- [ ] El segundo run del workflow muestra "cache hit" en el log del paso de
      cache.
- [ ] `docker build` corre localmente con el `Dockerfile` que escribiste.
- [ ] Tras pushear a `main`, la imagen aparece en Docker Hub con el tag del
      SHA y `latest`.
- [ ] Los secrets **no** aparecen en los logs (ni siquiera enmascarados por
      accidente).

## Cuestionario

1. **(Artifacts)** ¿Por qué el resultado de `npm test` debería subirse como
   **artifact** y no como **cache**? Mencioná al menos dos razones.

2. **(Cache)** Cambiás una línea de `app-node/package.json` pero **no** tocás
   `app-node/package-lock.json`. ¿La `key` basada en
   `hashFiles('app-node/package-lock.json')` produce hit o miss? ¿Qué papel
   juegan las `restore-keys` en ese caso?

3. **(Cache vs Artifact)** Tu workflow genera una carpeta `dist/` de 800 MB
   con un binario que después se sube a un release. ¿Lo subís como artifact,
   como cache, o de ninguna de las dos formas? Justificá brevemente.

## Referencias

- `07-cache/README.md` — anatomía de `actions/cache`, claves y restore-keys.
- `08-artifacts/README.md` — subir y bajar artefactos, retención y errores
  comunes.
- Documentación oficial de `docker/login-action` y `docker/build-push-action`.