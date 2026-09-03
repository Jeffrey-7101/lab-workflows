# 07 — Cache

`actions/cache@v4` guarda directorios/archivos entre runs para evitar
recomputar cosas costosas (instalar deps, compilar, descargar, etc.).

> **Distinción importante**: cache **no es lo mismo** que artifact.
> - **Cache**: optimiza performance entre runs (se borra solo, no descargable
>   desde la UI).
> - **Artifact**: persiste archivos para bajarlos desde la UI o pasarlos entre
>   jobs del mismo run (lo vemos en el nivel 08).

## Anatomía básica

```yaml
- uses: actions/cache@v4
  with:
    path: app-node/node_modules    # qué guardar/restaurar
    key: node-modules-${{ hashFiles('app-node/package-lock.json') }}
    restore-keys: |
      node-modules-${{ runner.os }}-
      node-modules-
```

### `key` (obligatoria)
Identifica de forma única el contenido cacheado. Si el hash cambia (ej:
cambiaste `package-lock.json`), es un **miss**.

Convención común: `<nombre>-<os>-<hash-del-lockfile>`.

### `restore-keys` (opcional)
Lista de prefijos de fallback. Si la `key` exacta falla, intenta con la
primera `restore-key` que matchee por prefijo. Útil para reusar un cache
parcial cuando solo cambió un archivo menor.

### Outputs
- `cache-hit`: `'true'` si encontró un match exacto, `'false'` si cayó en
  `restore-keys` o fue miss total.
- `cache-primary-key`: la key que se intentó guardar.

## Cómo probarlo

### 1. Primer run (miss → instala)
1. **Actions** → "07 - Cache" → **Run workflow** → **Run**.
2. En el log del step "Mostrar hit/miss del cache" vas a ver
   `CACHE MISS, instalando dependencias`.
3. `npm ci` corre y tarda unos segundos.

### 2. Segundo run (hit → reusa)
1. Volvé a correrlo sin cambiar nada.
2. Ahora vas a ver `CACHE HIT con key: node-modules-linux-<hash>`.
3. `npm ci` se **salta** (el `if [ -d node_modules ]` lo detecta).

### 3. Forzar miss
Cambiá una línea de `app-node/package.json` y commiteala. Al volver a correr
el workflow, el hash cambia → miss → reinstala.

## Buenas prácticas

- **Cacheá solo lo que se puede recomputar**: dependencias (`node_modules`,
  `.pip-cache`, etc.), builds intermedios (`dist/`, `target/`).
- **No cachees archivos muy grandes** (> 10 GB GitHub puede empezar a fallar).
- **Key estable**: usá el hash de un archivo estable (ej: `package-lock.json`).
  Si usás `hashFiles('**/*')`, cualquier cambio de archivo invalida el cache.
- **Restore-keys bien elegidas**: un fallback demasiado genérico puede
  restaurar un cache incompatible y romper el build.
- **Acciones oficiales que ya cachean**: `actions/setup-node`, `setup-python`,
  `setup-go` tienen un `cache:` built-in que evita tener que escribir el
  `actions/cache` manual.

## Variantes

1. **Setup-node con cache built-in**: reemplazá todo el bloque del step "Cache
   de node_modules" por:

   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: 20
       cache: 'npm'
       cache-dependency-path: app-node/package-lock.json
   ```

   Esta acción ya invoca `actions/cache` internamente. Mirá el log y vas a
   ver el "Cache hit/miss" igual.

2. **Cachear pip**: si tuvieras un proyecto Python, sería
   `path: ~/.cache/pip` con `key: pip-${{ hashFiles('**/requirements.txt') }}`.

3. **Multi-path**: el `path:` puede ser multilínea:
   ```yaml
   path: |
     ~/.npm
     ~/.cache
     app-node/node_modules
   ```

## Errores comunes

- **Path no existe en el runner**: si `path:` apunta a algo que el job no
  generó, el cache falla silenciosamente. Verificá con `ls` antes del cache.
- **Hash demasiado inestable**: si el hash incluye archivos que cambian en
  cada commit (logs, timestamps), el cache nunca hit-ea.
- **Olvidar `npm ci` cuando hay miss**: sin `npm ci` el `node_modules` queda
  vacío aunque el cache haya restaurado archivos viejos que no matchean tu
  lockfile actual.
- **Confundir cache con artifact**: si querés **bajar** un build desde la UI,
  es artifact. Si querés **acelerar** un run futuro, es cache.
