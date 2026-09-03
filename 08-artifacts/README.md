# 08 — Artifacts

Los **artifacts** son archivos persistidos por un run que se pueden:
- **Descargar** desde la UI de GitHub Actions.
- **Descargar** desde otro job del mismo run con `actions/download-artifact`.

> Diferencia clave con **cache** (nivel 07):
> - **Artifact**: para **distribuir** (descargar desde UI, pasar entre jobs).
>   Persiste 90 días por default (configurable).
> - **Cache**: para **acelerar** runs. No descargable, se borra por antigüedad.

## Anatomía

### Subir

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build-log                   # nombre del artefacto (unico en el run)
    path: dist/build.log              # archivo o directorio a subir
    retention-days: 7                 # default 90, max segun plan
    if-no-files-found: error          # warn | error | ignore
```

`path:` puede ser:
- Un archivo (`dist/build.log`).
- Un directorio (`reports/` → sube todo el contenido).
- Un glob (`dist/**/*.json`).
- Multi-path (varias líneas con `|`).

### Bajar

```yaml
- uses: actions/download-artifact@v4
  with:
    name: build-log           # nombre especifico
    path: ./descargados/build # donde dejarlo (default: GITHUB_WORKSPACE)
```

Sin `name:` descarga **todos** los artefactos del run.

## Cómo probarlo

### 1. Disparar el workflow
**Actions** → "08 - Artifacts" → **Run workflow** → **Run**.

### 2. Ver los artefactos subidos
Cuando el job `generar` termine, scroll abajo en la página del run. Vas a
ver una sección **Artifacts** con 3 entradas:
- `build-log` → `build.log` adentro.
- `test-reports` → carpeta con varios archivos.
- `outputs-completos` → todo junto.

Click en cualquiera para descargarlo desde la UI.

### 3. Ver el consumo entre jobs
El job `consumir` corre después de `generar` y descarga los 3 artefactos.
En el log del step "Mostrar lo descargado" vas a ver:
- El contenido de `build.log`.
- Los `reports/*.txt` y `coverage.json`.
- Los artefactos en `./descargados/todos/` con la estructura preservada.

## Detalles a tener en cuenta

- **Nombres únicos**: si subís dos artefactos con el mismo `name:` en el mismo
  job, falla el segundo.
- **Artifacts y matrix**: si subís un artifact en un job con matrix, cada
  combinación sube su propia copia. Para juntarlas, usá `actions/upload-artifact`
  en un job posterior que dependa de todas (con `needs:`).
- **Re-run**: los artifacts del run original persisten. Al re-correr el job,
  los nuevos artifacts los reemplazan.
- **Tamaño máximo**: hasta 10 GB por artifact (plan gratis) o 50 MB por archivo.
  Comprimir primero si te pasás.

## Variantes

1. **Artifact condicional**: agregá un `if: ${{ github.event_name == 'push' }}`
   al step de upload y comprobá que solo se sube con push, no con `workflow_dispatch`.

2. **Descargar artefactos de otro run**: usar
   `actions/download-artifact@v4` con `github.run_id` no funciona directo,
   pero podés usar `actions/github-script` con la API para apuntar a otro run.

3. **Comprimir antes de subir**: agregá
   `run: tar -czf dist.tar.gz dist/` antes del upload. Vas a ver un solo
   archivo `.tar.gz` en el artifact en vez de múltiples archivos sueltos.

## Errores comunes

- **Subir y bajar con nombres distintos**: el `name:` debe coincidir exacto
  entre upload y download (case-sensitive).
- **`if-no-files-found: warn` por defecto**: si el path no matchea nada,
  el step "warning" pero no falla. Si querés falla dura, poné `error`.
- **Olvidar `path:` en download**: descarga a `$GITHUB_WORKSPACE` directo,
  mezclando archivos con el código del repo. Mejor siempre usar un subdirectorio.
- **Subir `node_modules`**: técnicamente funciona, pero es mala práctica.
  Esos gigabytes son **cache**, no artifact.
- **Confundir retention-days con TTL del cache**: artifacts y cache tienen
  políticas de retención **distintas**. El cache se eviction-a por LRU
  agresivamente; el artifact respeta `retention-days`.
