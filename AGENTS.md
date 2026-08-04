# AGENTS.md

## Proyecto
- App Next.js (App Router) + AI SDK v6 + next-intl. La app es MceChat: chat con MCP, multi-proveedor (OpenAI/OpenRouter/custom), gestión de modelos, presets y tokens.
- Convenciones de commits: conventional commits. Las features se trabajan en la rama `test/feat`.

## Comandos de verificación
Siempre correr tras hacer cambios y antes de commitear:
- `npx tsc --noEmit`
- `npx eslint <archivos modificados>` (warnings preexistentes aceptados: `<img>` en textarea.tsx)
- `npm run build`

## Reutilización de código (obligatorio)
- **No duplicar tipos ni utilidades.** Tipos compartidos de UI/mensajes viven en `lib/types.ts`; lógica de mensajes en `lib/chat/message-utils.ts`; helpers de chat en `lib/chat/`.
- Si un tipo/helper ya existe, importarlo en vez de redefinirlo localmente (ej: `MessageStatus`, `MessagePart`, `cn`).
- Componentes reutilizables van en `components/` (ej: `FileChip`). Lo específico de mensajes vive en `components/messages/`.
- Extraer a componente compartido cuando un markup aparece en 2+ lugares.

## i18n
- Todo texto visible va en `messages/es.json` + `messages/en.json`, bajo el namespace correspondiente. No hardcodear strings.

## Código
- No añadir comentarios salvo que se pidan.
- Seguir el estilo existente (imports: externos primero, luego locales con alias `@/`).
