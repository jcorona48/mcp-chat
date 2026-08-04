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

### 5. Auto-selección de modelo de visión · `S/M` · hecho
**Feature #11.** Al agregar una imagen como adjunto, si el modelo activo no soporta visión (`vision`), ofrecer/buscar automáticamente un modelo con `vision === true` del proveedor activo y sugerirlo (o cambiar). La información `vision` ya la devuelve `app/api/ai/models/route.ts`.
- Archivos: `components/chat.tsx` (al setear attachments), `components/model-picker.tsx`, `components/model-search-list.tsx`.
- Nota: mejor sugerir que cambiar en silencio; confirmar con un toast o badge.
- Implementado: helpers `modelSupportsVision`/`findVisionModel` en `ai/providers.ts` (regex de visión para custom models, capabilities para presets); banner inline en `components/textarea.tsx` cuando hay imagen adjunta y el modelo no soporta visión: botón "Cambiar a {model}" (primer custom model con visión) o aviso si no hay ninguno, con botón de descartar que se resetea al quitar las imágenes. i18n: `visionModelSuggestion`, `switchToVisionModel`, `noVisionModelAvailable`.

---

## Fase 2 — Medios

### 7. Recientes + favoritos de modelos · `M` · hecho
**Feature #10.** En `components/model-picker.tsx`: sección "Recientes" (últimos N modelos usados, `localStorage` + `useLocalStorage`) y "Favoritos" (toggle estrella, estrella ya existe para custom). Persistencia por chat o global — decidir: global.
- Archivos: `components/model-picker.tsx`, `components/chat.tsx` (registrar uso al cambiar modelo), `lib/` (helper localStorage).
- i18n: `recentModels`, `favoriteModels`, `removeFavorite` (es/en).
- Implementado: secciones Favoritos/Recientes/Todos con `SelectLabel`, toggle estrella por fila (hover), badge Cog para custom, `useLocalStorage` global, prune de ids inválidos. Registro de recientes en `handleModelChange` (sin necesidad de tocar chat.tsx).

### 8. Token/costo por mensaje y por chat · `M` · hecho
**Feature #7.** Leer `usage` (prompt/completion tokens) del stream: en AI SDK, `streamText` expone `usage` en `onFinish`; se persiste como parte `{ type: "usage", promptTokens, completionTokens, totalTokens }` solo en el mensaje assistant de la respuesta (sin reescribir el historial). El coste (precio por modelo) se deja para siguiente iteración si el mapa de precios da pereza.
- Archivos: `app/api/chat/route.ts`, `lib/chat/usage.ts`, `components/token-badge.tsx`, `components/textarea.tsx`, `components/chat.tsx`.
- Implementado: persistencia server-side del usage con helpers tipados (`getChatUsage`/`getMessageUsage`/`addUsageToParts` en `lib/chat/usage.ts`, reutilizables por #9); badge reutilizable `TokenBadge` (total del chat) mostrado junto al textarea vía slot `tokenBadge`; system prompt del sistema extraído y compactado en `lib/ai/system-prompt.ts` (`buildSystemPrompt`). Contador del system-prompt dialog retirado (UX mala; el objetivo era el prompt del sistema, no el del usuario). **Ajuste UX:** el desglose por mensaje (popover/dropdown) se eliminó como redundante con muchos mensajes — queda solo el total.

### 9. Barra de uso de contexto · `M` · pendiente
**Feature #8.** Mostrar % del context window consumido (tokens del chat / contexto del modelo). Requiere mapa `modelId → contextLength` (OpenRouter ya lo devuelve en `/models` como `context_length`; para los demás proveedores, mapa manual de tamaños conocidos con fallback). El conteo de tokens ya está implementado (#8).
- Archivos: `lib/ai/` (mapa de contextos), `components/chat.tsx` (barra bajo el header o sobre el textarea), `app/api/ai/models/route.ts`.
- Nota: color ámbar >70%, rojo >90%; opcional botón "compactar" (resumen hasta aquí). Reutilizar `getChatUsage` de `lib/chat/usage.ts`.
- **Descartada por ahora (usuario):** los modelos se cargan dinámicos vía HTTP y la mayoría de proveedores no exponen el contexto; depender de un mapa manual de tamaños = adivinar. Solo tendría sentido si el provider lo reportara de forma fiable.

### 10. Temas custom / acento · `M` · hecho
**Feature #30.** Selector de color primario (una paleta de ~6 acentos) que overridera las CSS variables de `app/globals.css` (ej. `--primary`, `--ring`). Persistir en `localStorage`. Requiere que los tokens de color estén definidos como variables — verificar estructura actual.
- Archivos: `app/globals.css`, `components/theme-provider.tsx` (o nuevo `accent-provider.tsx`), `components/theme-toggle.tsx` (extender con menú de acento).
- Implementado: `app/globals.css` usa `var(--accent-hue, <default>)` en `--primary`, `--ring`, `--chart-1`, `--sidebar-primary`, `--sidebar-ring`, `--accent`, `--sidebar-accent` (28 tokens); `components/accent-provider.tsx` (`useLocalStorage("accent-hue")` con hue como número + helpers `hueToHex`/`hexToHue`); `components/palette-dialog.tsx` con 6 acentos + `<input type="color">` + slider de matiz + reset; abierto desde `components/theme-toggle.tsx` (item "Paleta"); montado en `app/providers.tsx`. i18n: `accent`, `accent*`, `palette`, `paletteDescription`, `customColor`, `hue`, `reset`, `done`.

### 11. Backup de configuración · `M` · hecho
**Feature #24.** Exportar/importar un JSON con: proveedores custom, API keys (opcional, con advertencia), servidores MCP, system prompt global, favoritos/preferencias. Botón en settings (donde esté el api-key-manager o un nuevo diálogo de settings).
- Archivos: nuevo `components/settings-backup-dialog.tsx` (o dentro de un manager existente), `lib/`.
- i18n: `exportConfig`, `importConfig`, `backupDescription`, `importWarning` (es/en).
- Implementado: `lib/config-backup.ts` (schema versionado, `buildConfigBackup({includeApiKeys})`, `parseConfigBackup` con validación, `applyConfigBackup` que escribe en localStorage y recarga); `components/settings-backup-dialog.tsx` (export con checkbox "Incluir claves API", import con advertencia y reload); fila "Backup de configuración" en `components/settings-dialog.tsx`. Cubre: api keys, custom models, system prompt, prompt presets, servidores MCP + selección, tools desactivadas (`disabled-tools`), acento, favoritos/recientes y modelo seleccionado. i18n: `configBackup.*`, `userMenu.configBackup`.
- **Recordatorio**: cualquier nueva opción de configuración persistida (nueva key de localStorage) debe añadirse al backup en `lib/config-backup.ts` (`STORAGE_KEYS` + campo en `ConfigBackup`).

### 12. Importar conversación · `M` · hecho
**Feature #23.** Restaurar una conversación desde el JSON exportado (`exportJson` ya genera ese formato). Leer archivo → parsear → recrear el chat (insert en DB y estado).
- Archivos: `components/export-chat-dialog.tsx` (añadir tab Import), `app/api/chats/route.ts` (endpoint o reutilizar create), `components/chat-sidebar.tsx` (acción importar).
- Nota: el MD exportado no se puede importar fielmente; solo JSON.
- Implementado: `app/api/chats/import/route.ts` (POST valida `{ messages }`, reutiliza `saveChat` → título, `convertToDBMessage` y `sanitizePartsForStorage`; preserva `createdAt`); `components/import-chat-dialog.tsx` (selector de archivo JSON, acepta array suelto o `{ messages }`, navega a `/chat/{id}`); entrada en el menú de usuario del sidebar (`Importar conversación`) con `refreshChats` tras importar. i18n: `chat.import*`, `userMenu.importConversation`.

---

## Fase 3 — Medianos/caros

### 13. Modo aprobación de tools · `M/L` · hecho
**Feature #16.** Por servidor/tool, elegir modo: **auto** (ejecutar siempre) o **confirmar** (el usuario aprueba cada invocación antes de ejecutar). Persistencia por tool (allow-list/deny-list). La confirmación es un botón en `components/tool-invocation.tsx` en estado "esperando".
- Archivos: `components/tool-invocation.tsx`, `lib/` (config de permisos), `app/api/chat/route.ts` (el stream ya ejecuta tools server-side — implica pausar/reanudar la generación, lo que lo hace caro).
- Nota: el diseño actual ejecuta tools en el server dentro de `streamText`; aprobación requiere dividir la generación en pasos o un step de pre-ejecución. Considerar MVP: "tools peligrosas = confirmar" con allow-list manual.

**Cambio de diseño (AI SDK v6):** no hace falta pre-ejecución manual — el SDK trae approval nativo: `tool.needsApproval: true` pausa el stream y emite un chunk `tool-approval-request`; el cliente responde con `addToolApprovalResponse({ id, approved })` y `sendAutomaticallyWhen` re-dispara el request para continuar.

**Decisiones de UX/UI tomadas (user):**
- Alcance: **global**, por tool (persistido en `localStorage` key `approval-tools`; lista de tools que requieren confirmación; el resto queda en auto).
- Config: toggle de escudo (Shield/ShieldAlert) en cada fila del `ToolPicker` (desktop y móvil) — fuera del checkbox para no interferir con habilitar/deshabilitar. Mejoras de descubribilidad: **filtro "Con aprobación"** (chip con contador en el popover, ámbar al activarse) para revisar de un vistazo las tools marcadas, y **toggle maestro por servidor** (escudo en el header de cada grupo, junto al checkbox; click = todas requieren aprobación, re-click = ninguna).
- UI de aprobación: en la card de `ToolInvocation`, estado `approval-requested` = borde ámbar + icono ShieldAlert pulsando + botones **Aprobar/Denegar** junto a los args; `output-denied` muestra "Denegada" (+ razón si existe).
- Al denegar, la conversación continúa igual que al aprobar (`sendAutomaticallyWhen` dispara con cualquier `approval-responded`), para que el modelo siga sin la tool o pregunte.

**Implementado:**
- `lib/context/mcp-context.tsx`: estado `approvalTools`/`setApprovalTools` (localStorage `approval-tools`) + prune de ids huérfanos junto a `disabledTools`.
- `app/api/chat/route.ts`: acepta `approvalTools?: string[]`; `expandToolNameVariants()` (antes `expandDisabledToolNames`) reutilizado para expandir alias `-`↔`_`; sobre las tools instrumentadas aplica `needsApproval: true` a las listadas.
- `components/chat.tsx`: envía `approvalTools` en el body; `sendAutomaticallyWhen` ahora reenvía con cualquier `approval-responded` (aprobada o denegada); conecta `onToolApproval` → `addToolApprovalResponse` (ya estaba en el destructure de `useChat`).
- `components/tool-invocation.tsx`: estados `approval-requested` (auto-expande, botones Aprobar/Denegar), `approval-responded` (Aprobada) y `output-denied` (Denegada + razón) con iconos ShieldAlert/ShieldCheck/ShieldX.
- `components/tool-picker.tsx`: toggle de escudo por tool + hint al pie del popover + filtro "Con aprobación" con contador + toggle maestro por servidor.
- `lib/config-backup.ts`: `approvalTools` incluido en backup/restore (ver recordatorio de #11).
- i18n (es/en): `common.approvalRequired/approved/denied/approve/deny/toolDeniedMessage`, `toolPicker.requireApproval/autoExecute/approvalHint/approvalOnly/noApprovalTools`.
- Nota: al aprobar, el re-request reinicia el servidor MCP (re-init) y re-sitúa el límite de steps (el stream continúa desde la tool aprobada en un request nuevo); aceptado por ahora.
- Comportamiento del modelo tras una denegación: el re-request le llega como `tool-result` con `error-text` ("Tool execution denied." o el `reason`). Para evitar loops de reintentos, `buildSystemPrompt` incluye una sección `## Tool Approval` **condicional** (solo si `hasApprovalTools`) que le dice al modelo: no reintentar la misma tool ni variantes en el mismo turno, reconocer la imposibilidad y sugerir alternativas/preguntar.

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

### 16. Selección de tools (global) · `L` · hecho
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
- Nota: si dos servidores exponen una tool con el mismo nombre, el filtro por nombre afecta a ambas (trade-off aceptado). Al desactivar una tool, el filtro del route elimina también sus variantes alias (`-`↔`_`, ver `createToolNameAliases` en `lib/mcp-client.ts`), ya que esas claves alternativas quedarían invocables de otro modo.
- Implementado: `lib/context/mcp-context.tsx` (estado `disabledTools` en localStorage key `disabled-tools`, `activeTools` = tools de servidores seleccionados ∩ conectados agrupadas por servidor, prune de ids huérfanos); `components/tool-picker.tsx` (popover con contador activas/total, reset "Activar todas", búsqueda si >12 tools, checkbox maestro por servidor y filas por tool); `components/textarea.tsx` (botón `Wrench` antes de `ModelParams`, punto en `text-primary` si hay desactivadas); `components/chat.tsx` (envía `disabledTools` en el body); `app/api/chat/route.ts` (filtra el toolset MCP tras `initializeMCPClients`, `hasTools` refleja el set filtrado, AI-config tools siempre presentes). i18n: `toolPicker.*`.

---

## Ideas descartadas (por ahora)

- **Pegar imagen con Ctrl+V**: no estaba en la lista elegida por el usuario; los adjuntos por botón ya cubren el caso de uso.
- **Búsqueda en conversación con scroll en vez de filtro**: Ctrl+F del navegador ya cubre el "encontrar y saltar". El filtro actual (solo muestra coincidencias) se mantiene. Opcional futuro: highlight de coincidencias + auto-scroll, pero no es prioridad.
- **Copiar respuesta completa / código**: ya existen (botón copy en `components/message.tsx`, copy en bloques de código en `components/markdown.tsx`).

---

## Limitaciones conocidas

### Adjuntos no persisten en el historial
Al adjuntar archivos/imágenes y enviar, el adjunto se ve en el mensaje en vivo pero **desaparece al recargar/volver al chat**: los bytes nunca se suben ni se almacenan, solo viajan como `FilePart` (base64) en el stream en memoria, y la UI no renderiza partes de tipo archivo/imagen.
- Dónde: `components/chat.tsx` (`handleSubmit` envía `files` al data stream), `lib/chat-store.ts` (persiste `parts` como JSON), `components/message.tsx` (solo renderiza `text` y `tool-*`, líneas 308-384).
- El schema `MessagePart` (`lib/db/schema.ts:29`) tiene `type` libre, así que una parte `{ type: "file", mimeType, url }` encajaría sin migración.

**Soluciones posibles (de menor a mayor costo):**
1. **S/M — Metadatos + placeholder:** guardar `{ type: "file", mimeType, name, size }` (sin bytes) y renderizar en el historial un chip "📎 nombre" en `components/message.tsx`. La conversación queda fiel pero no permite re-ver el archivo; no requiere storage externo.
2. **M/L — Subida a blob storage:** endpoint de upload (Vercel Blob / S3 / local), persistir la URL en la parte y renderizar el preview real al recargar. Solución completa; requiere storage + manejo de borrado/expiración.
3. **L (descartada como default) — Data URL persistente:** guardar el base64 en `parts`. Funciona para imágenes pequeñas pero infla la BD y no escala.

**Recomendación:** empezar por (1) para que el historial sea fiel, y evaluar (2) si se quiere re-ver los adjuntos. **Decisión del usuario pendiente.**

---

## Notas técnicas útiles

- Verificación: `npx tsc --noEmit` + `npx eslint <archivos>` (npm run lint está roto) + `npm run build`.
- i18n: `messages/es.json` y `messages/en.json`; cualquier texto nuevo debe ir en ambos.
- Catálogo de modelos (`app/api/ai/models/route.ts`): OpenRouter `/models` devuelve `context_length` y `pricing` — aprovechar para features #8 y #9.
- El stream de `useChat` (AI SDK v6) expone `usage` por mensaje para feature #8.
