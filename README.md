# Tecnicax

Sitio estático HTML/CSS/JS con panel de administración. Stack: Vercel + Supabase.

## Notas de seguridad

### CSP — `unsafe-inline` en `script-src` y `style-src`

El `vercel.json` incluye `'unsafe-inline'` en ambas directivas por las siguientes razones:

- **`style-src 'unsafe-inline'`**: varios elementos HTML usan atributos `style=""` inline (alturas de imágenes, layouts). Para eliminarlo: mover todos los `style=""` a clases CSS en `style.css`.
- **`script-src 'unsafe-inline'`**: `index.html`, `pages/*.html` y `admin/*.html` contienen bloques `<script>` inline que manejan la carga de datos desde Supabase. Para eliminarlo: extraer todos esos bloques a archivos `.js` externos.

Mientras existan scripts y estilos inline, el CSP protege contra carga de recursos desde dominios no autorizados pero no contra XSS inline. El riesgo está mitigado por el escaping de datos de Supabase aplicado en todos los puntos de renderizado.

### `admin_usuarios` — sin políticas INSERT/UPDATE/DELETE

La tabla `admin_usuarios` en Supabase no tiene políticas de escritura habilitadas por diseño. La gestión de administradores se realiza exclusivamente desde el dashboard de Supabase usando `service_role`, nunca desde el cliente JS del panel.

Al agregar un nuevo admin, el campo `id` debe ser el UUID del usuario ya existente en `auth.users` — no usar `gen_random_uuid()`.
