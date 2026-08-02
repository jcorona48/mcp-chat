# Roadmap de MceChat

Lista de features acordadas, ordenadas de menor a mayor esfuerzo para ir avanzando despacio.
Cada item tiene: dificultad (S/M/L), alcance y notas de implementación con referencias al código actual.

## Leyenda
- Estado: `pendiente` / `en-progreso` / `hecho`
- Dificultad: `S` (horas) / `M` (medio día) / `L` (1+ días)

---

## Fase 1 — Quick wins

### 1. Presets de parámetros del modelo · `S` · hecho
**Feature #9.** Botones de preset en `components/model-params.tsx`: **Creativo** (temp ~1.3, maxTokens alto), **Preciso** (temp ~0.2), **Auto** (ambos en `null`). Al pulsar, setea `temperature`/`maxTokens`. Mantener sliders para ajuste fino.
- Archivos: `components/model-params.tsx`, `components/chat.tsx` (estado ya existe).
- i18n: keys nuevas en namespace `modelParams` (es/en): `presets`, `presetPrecise`, `presetCreative`.

### 2. Mensajes colapsables · `S/M` · hecho
**Feature #5.** Para mensajes muy largos (>~800 palabras o >~4000 chars), mostrar un "resumen + Ver más" que expanda. Umbral configurable en una constante.
- Archivos: `components/message.tsx` (envolver contenido), `components/markdown.tsx` (sin cambios).
- i18n: `expandMessage`, `collapseMessage` (es/en).
- Implementado: umbral 4000 chars / preview 1200 chars; solo aplica con `status === "ready"` (no durante streaming); toggle Ver más/Ver menos; se colapsa el cuerpo completo del mensaje (incluye tools ocultas en modo colapsado).

### 3. Colapsar resultados de tools · `S` · hecho (ya cubierto)
**Feature #20.** Los resultados largos (output, errores, JSON) se muestran colapsados por defecto con un toggle para expandir. Ya hay patrón "click para ver/ocultar" en reasoning; reutilizarlo para el `output` de tools.
- **Conclusión del usuario:** no hace falta colapso adicional dentro de la card — la card completa de `components/tool-invocation.tsx` ya se colapsa/expande al hacer click en su header (incluye args y resultado). Se intentó un preview por-resultado y se **revertió** como redundante. Nada que implementar.

### 4. Health de MCP con latencia + reconectar · `S` · hecho (solo latencia)
**Feature #17.** Enriquecer `app/api/mcp-health/route.ts` (o el manager) para devolver latencia por servidor y exponer un botón "reconectar" que re-ejecute el check desde `components/mcp-server-manager.tsx`.
- Archivos: `app/api/mcp-health/route.ts`, `components/mcp-server-manager.tsx`.
- Nota: medir `performance.now()` alrededor del fetch del check; mostrar ms en la UI junto al indicador de estado.
- **Auditoría previa:** el reconectar YA existía (`restartServer` + botón RefreshCw, línea 527). Solo faltaba latencia → se agregó: `latencyMs` en la respuesta de `/api/mcp-health`, campo `latencyMs` en `MCPServer`, guardado al conectar (`updateServerWithTools`) y mostrado junto a "Conectado" en el `StatusIndicator`.

### 5. Auto-selección de modelo de visión · `S/M` · pendiente
**Feature #11.** Al agregar una imagen como adjunto, si el modelo activo no soporta visión (`vision`), ofrecer/buscar automáticamente un modelo con `vision === true` del proveedor activo y sugerirlo (o cambiar). La información `vision` ya la devuelve `app/api/ai/models/route.ts`.
- Archivos: `components/chat.tsx` (al setear attachments), `components/model-picker.tsx`, `components/model-search-list.tsx`.
- Nota: mejor sugerir que cambiar en silencio; confirmar con un toast o badge.

---

## Fase 2 — Medios

### 7. Recientes + favoritos de modelos · `M` · hecho
**Feature #10.** En `components/model-picker.tsx`: sección "Recientes" (últimos N modelos usados, `localStorage` + `useLocalStorage`) y "Favoritos" (toggle estrella, estrella ya existe para custom). Persistencia por chat o global — decidir: global.
- Archivos: `components/model-picker.tsx`, `components/chat.tsx` (registrar uso al cambiar modelo), `lib/` (helper localStorage).
- i18n: `recentModels`, `favoriteModels`, `removeFavorite` (es/en).
- Implementado: secciones Favoritos/Recientes/Todos con `SelectLabel`, toggle estrella por fila (hover), badge Cog para custom, `useLocalStorage` global, prune de ids inválidos. Registro de recientes en `handleModelChange` (sin necesidad de tocar chat.tsx).

### 8. Token/costo por mensaje y por chat · `M` · pendiente
**Feature #7.** Leer `usage` (prompt/completion tokens) del stream: en AI SDK, `useChat` expone `messages[i].usage` / `message.parts` (o `onFinish(usage)`); acumular en `lib` un contador por chat y mostrarlo en el header o al pie de cada mensaje. Costo: mapa de precios por modelo (OpenRouter `/models` devuelve `pricing`; para Anthropic/OpenAI usar tablas aproximadas).
- Archivos: `components/chat.tsx`, `components/message.tsx`, `app/api/ai/models/route.ts` (podría añadir `pricing`/`contextLength` al catálogo), `lib/`.
- Nota: empezar solo con tokens (sin costo) si el mapa de precios da pereza.

### 9. Barra de uso de contexto · `M` · pendiente
**Feature #8.** Mostrar % del context window consumido (tokens del chat / contexto del modelo). Requiere mapa `modelId → contextLength` (OpenRouter ya lo devuelve en `/models` como `context_length`; para los demás proveedores, mapa manual de tamaños conocidos con fallback).
- Archivos: `lib/ai/` (mapa de contextos), `components/chat.tsx` (barra bajo el header o sobre el textarea), `app/api/ai/models/route.ts`.
- Nota: color ámbar >70%, rojo >90%; opcional botón "compactar" (resumen hasta aquí).

### 10. Temas custom / acento · `M` · pendiente
**Feature #30.** Selector de color primario (una paleta de ~6 acentos) que overridera las CSS variables de `app/globals.css` (ej. `--primary`, `--ring`). Persistir en `localStorage`. Requiere que los tokens de color estén definidos como variables — verificar estructura actual.
- Archivos: `app/globals.css`, `components/theme-provider.tsx` (o nuevo `accent-provider.tsx`), `components/theme-toggle.tsx` (extender con menú de acento).

### 11. Backup de configuración · `M` · pendiente
**Feature #24.** Exportar/importar un JSON con: proveedores custom, API keys (opcional, con advertencia), servidores MCP, system prompt global, favoritos/preferencias. Botón en settings (donde esté el api-key-manager o un nuevo diálogo de settings).
- Archivos: nuevo `components/settings-backup-dialog.tsx` (o dentro de un manager existente), `lib/`.
- i18n: `exportConfig`, `importConfig`, `backupDescription`, `importWarning` (es/en).

### 12. Importar conversación · `M` · pendiente
**Feature #23.** Restaurar una conversación desde el JSON exportado (`exportJson` ya genera ese formato). Leer archivo → parsear → recrear el chat (insert en DB y estado).
- Archivos: `components/export-chat-dialog.tsx` (añadir tab Import), `app/api/chats/route.ts` (endpoint o reutilizar create), `components/chat-sidebar.tsx` (acción importar).
- Nota: el MD exportado no se puede importar fielmente; solo JSON.

---

## Fase 3 — Medianos/caros

### 13. Modo aprobación de tools · `M/L` · pendiente
**Feature #16.** Por servidor/tool, elegir modo: **auto** (ejecutar siempre) o **confirmar** (el usuario aprueba cada invocación antes de ejecutar). Persistencia por tool (allow-list/deny-list). La confirmación es un botón en `components/tool-invocation.tsx` en estado "esperando".
- Archivos: `components/tool-invocation.tsx`, `lib/` (config de permisos), `app/api/chat/route.ts` (el stream ya ejecuta tools server-side — implica pausar/reanudar la generación, lo que lo hace caro).
- Nota: el diseño actual ejecuta tools en el server dentro de `streamText`; aprobación requiere dividir la generación en pasos o un step de pre-ejecución. Considerar MVP: "tools peligrosas = confirmar" con allow-list manual.

### 14. Web search como herramienta · `M/L` · pendiente
Incluir un toggle "Web search" por chat que agregue una herramienta de búsqueda web (ej. provider de búsqueda de `websearch`/Tavily o scraping propio) al toolset junto a las MCP.
- Archivos: `app/api/chat/route.ts` (tool dinámico), `components/textarea.tsx` o settings del chat (toggle), `lib/ai/` (provider de búsqueda).
- Decisión pendiente: qué servicio de búsqueda usar (necesita API key propia o usar un endpoint público).

### 15. Soporte stdio transport · `L` · pendiente
**Feature #19.** Añadir transporte `stdio` a los servidores MCP (hoy solo SSE/HTTP). Implica spawn de procesos locales — inviable en deploy serverless (Vercel); solo tiene sentido en local/self-host.
- Archivos: `components/mcp-server-manager.tsx` (tipo de transporte), `lib/mcp/` (cómo se montan los servidores — revisar), `app/api/chat/route.ts`.
- Nota: requiere servidor Node persistente o modo local-only. **Preguntar al usuario si quiere esto antes de empezar** (el proyecto está en Next.js/Vercel).

---

## Fase 4 — Grande

### 16. Selección de tools (global) · `L` · documentado, no implementado
**Feature #15 (redefinida).** El usuario confirmó que **la configuración global de servidores MCP ya resuelve bien**; la feature no necesita ser "por chat". Se redefine como: **encender/apagar tools individuales, con alcance global**.
- Estado: documentada y diseñada, pero **pospuesta** por priorizar features fáciles.

**Decisiones de UX/UI tomadas (user):**
- Alcance: **global** (no por chat).
- Ubicación: botón `Wrench` en la barra del textarea (junto a `ModelParams`), abriendo un Popover agrupado por servidor — mismo patrón que ModelParams.
- Default: **todas activas** → guardar una **blocklist** (`disabledTools: string[]`) en `localStorage` (key `disabled-tools`); cero regresión con el comportamiento actual.
- Indicador: botón en `text-primary` (+ punto/badge) cuando haya tools desactivadas.

**Diseño del popover:**
- Header "Herramientas" + contador activas/total + botón reset ("activar todas").
- Búsqueda interna si hay muchas tools (>~12).
- Agrupado por servidor: header con nombre del servidor + checkbox maestro "todo/nada"; cada fila = checkbox + nombre + descripción truncada.
- Empty state: "Conecta un servidor MCP para ver herramientas".
- Listar tools solo de servidores `selectedMcpServers ∩ status === "connected"` (los que realmente van al API).

**Implementación (cuando se aborde):**
- `lib/context/mcp-context.tsx`: añadir `disabledTools`/`setDisabledTools` (useLocalStorage) + derivar servidores conectados con tools; prunear ids huérfanos.
- `components/tool-picker.tsx` (nuevo): trigger + popover descrito arriba; consume `useMCP`.
- `components/textarea.tsx`: renderizar `ToolPicker` en la barra inferior antes de `ModelParams`.
- `components/chat.tsx`: incluir `disabledTools` en `transportConfigRef` → body.
- `app/api/chat/route.ts`: aceptar `disabledTools?: string[]` y filtrar del toolset MCP tras `initializeMCPClients` (mantener siempre las AI-config tools, p.ej. `addMcpServer`); `hasTools` debe reflejar el toolset filtrado.
- i18n (es/en): `tools`, `activateAll`, `noTools`, `connectedServers`, tooltips.
- Nota: si dos servidores exponen una tool con el mismo nombre, el filtro por nombre afecta a ambas (trade-off aceptado).

---

## Ideas descartadas (por ahora)

- **Pegar imagen con Ctrl+V**: no estaba en la lista elegida por el usuario; los adjuntos por botón ya cubren el caso de uso.
- **Búsqueda en conversación con scroll en vez de filtro**: Ctrl+F del navegador ya cubre el "encontrar y saltar". El filtro actual (solo muestra coincidencias) se mantiene. Opcional futuro: highlight de coincidencias + auto-scroll, pero no es prioridad.
- **Copiar respuesta completa / código**: ya existen (botón copy en `components/message.tsx`, copy en bloques de código en `components/markdown.tsx`).

---

## Notas técnicas útiles

- Verificación: `npx tsc --noEmit` + `npx eslint <archivos>` (npm run lint está roto) + `npm run build`.
- i18n: `messages/es.json` y `messages/en.json`; cualquier texto nuevo debe ir en ambos.
- Catálogo de modelos (`app/api/ai/models/route.ts`): OpenRouter `/models` devuelve `context_length` y `pricing` — aprovechar para features #8 y #9.
- El stream de `useChat` (AI SDK v6) expone `usage` por mensaje para feature #8.
