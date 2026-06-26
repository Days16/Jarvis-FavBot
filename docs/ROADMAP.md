# 🗺 Roadmap de desarrollo — Jarvis-FavBot

Plan de 12 semanas para construir Jarvis-FavBot de forma incremental. Cada fase entrega valor funcional y se puede desplegar por separado.

## Visión general

```
Semana 1-2   → Base sólida + Moderación
Semana 3-4   → Tickets + Canales privados + Reaction roles
Semana 5-6   → Sorteos + Niveles + Economía
Semana 7-8   → Música + Entretenimiento
Semana 9-10  → IA OpenRouter + Integraciones externas
Semana 11-12 → Dashboard web + Deploy final
```

---

## Fase 1 — Base del proyecto y moderación (Sem 1–2)

### Semana 1

**Objetivo:** Bot funcional con estructura sólida.

- [ ] Inicializar proyecto con `npm init`, instalar `discord.js`, `mongoose`, `dotenv`
- [ ] Crear `index.js` con login del bot y ShardingManager
- [ ] Crear `deploy-commands.js` para registrar slash commands
- [ ] Handler de comandos (carga automática desde `/src/commands/`)
- [ ] Handler de eventos (carga automática desde `/src/events/`)
- [ ] Conexión a MongoDB Atlas con Mongoose
- [ ] Sistema de cooldowns para comandos
- [ ] Helper `embedBuilder.js` con estilos consistentes
- [ ] Helper `permCheck.js` para verificar permisos
- [ ] Comando `/ping` y `/botinfo` de prueba
- [ ] Archivo `.env.example` completo
- [ ] README base del proyecto

**Entregable:** Bot que arranca, conecta a MongoDB y responde a `/ping`.

---

### Semana 2

**Objetivo:** Moderación completa y automod.

- [ ] Comandos: `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`
- [ ] Comandos: `/warn`, `/warns`, `/delwarn`
- [ ] Comando `/clear` con filtro por usuario
- [ ] Comandos: `/slowmode`, `/lockdown`, `/unlock`
- [ ] Schema `Warn.js` en MongoDB
- [ ] Sistema de warns con umbrales automáticos
- [ ] Automod: antiflood, anti-caps, anti-invite, anti-spam
- [ ] Anti-raid con lockdown automático
- [ ] Anti-dehoist automático
- [ ] Sistema de logs de moderación (`modLogger.js`)
- [ ] Evento `guildBanAdd` para logs de bans externos
- [ ] Comando `/automod config` y `/automod status`
- [ ] Schema `GuildLogs.js` y comando `/logs setup`

**Entregable:** Moderación completa lista para producción.

---

## Fase 2 — Tickets, canales privados y reaction roles (Sem 3–4)

### Semana 3

**Objetivo:** Sistema de tickets y bienvenidas.

- [ ] Schema `Ticket.js`
- [ ] Comando `/ticket setup` con panel de botones
- [ ] Categorías de tickets configurables
- [ ] Crear/cerrar canales de ticket con permisos correctos
- [ ] Comandos: `/ticket claim`, `/ticket close`, `/ticket reopen`
- [ ] Comandos: `/ticket add`, `/ticket remove`
- [ ] Generador de transcripciones HTML (`transcriptGenerator.js`)
- [ ] Sistema de rating al cerrar ticket
- [ ] Auto-close por inactividad con `node-schedule`
- [ ] Comando `/ticket stats`
- [ ] Sistema de bienvenidas: imagen canvas, DM, mensaje
- [ ] Panel de verificación con botón
- [ ] Logs de miembros: entrada, salida, nick

**Entregable:** Tickets funcionales con transcripciones y sistema de bienvenidas con imagen.

---

### Semana 4

**Objetivo:** Canales privados y reaction roles.

- [ ] Schema `PrivateChannel.js` y `Group.js`
- [ ] Comandos de canales privados: `/private create/invite/kick/name/close/list`
- [ ] Gestión automática de permisos en Discord
- [ ] Auto-delete por inactividad
- [ ] Comandos de grupos: `/group create/invite/kick/promote/leave/disband`
- [ ] Comando `/rolechannel create/add/remove`
- [ ] Schema `RolePanel.js`
- [ ] Comandos: `/rr create/add/remove/mode/require/level`
- [ ] Panel de reaction roles con botones y select menu
- [ ] Manejo de interacciones de botones de reaction roles
- [ ] Comandos de autorole: `/autorole add/remove/list`
- [ ] Comandos de gestión de roles: `/role give/take/info/members`

**Entregable:** Canales privados completos y reaction roles modernos con botones.

---

## Fase 3 — Sorteos, niveles y economía (Sem 5–6)

### Semana 5

**Objetivo:** Sorteos y sistema de niveles.

- [ ] Schema `Giveaway.js`
- [ ] Comando `/giveaway create` con modal
- [ ] Sistema de pesos (boost, invitaciones, roles especiales)
- [ ] Validación de requisitos (nivel, roles)
- [ ] Countdown en vivo (actualización del embed cada 30s)
- [ ] Comandos: `/giveaway reroll/end/cancel/pause/resume/list/history`
- [ ] Schema `UserGuild.js` (XP, nivel, economía)
- [ ] Sistema de XP por mensajes con cooldown
- [ ] Sistema de XP por voz (`voiceStateUpdate`)
- [ ] Multiplicadores por rol y canal
- [ ] Roles automáticos al subir de nivel
- [ ] Tarjeta de perfil con `@napi-rs/canvas`
- [ ] Comandos: `/rank`, `/leaderboard`, `/level config/rewards`
- [ ] Sistema de prestige

**Entregable:** Sorteos avanzados y sistema de niveles completo.

---

### Semana 6

**Objetivo:** Economía completa.

- [ ] Schema `GuildEconomy.js` y `ShopItem.js`
- [ ] Comandos: `/balance`, `/daily`, `/weekly`, `/work`, `/crime`
- [ ] Comandos: `/pay`, `/rob`
- [ ] Comandos de banco: `/bank deposit/withdraw/balance`
- [ ] Comandos de tienda: `/shop`, `/buy`, `/sell`, `/inventory`, `/use`
- [ ] Juegos de azar: `/gamble`, `/slots`, `/roulette`, `/blackjack`, `/coinflip`
- [ ] Leaderboard de economía
- [ ] Comando `/economy config` para admins
- [ ] Schema `Invite.js` y tracking de invitaciones
- [ ] Comandos: `/invites`, `/inviter`, `/invites top`
- [ ] Contadores en canales de voz (`/counter`)
- [ ] Informe semanal automatizado

**Entregable:** Economía completa con tienda, juegos y tracking de invitaciones.

---

## Fase 4 — Música y entretenimiento (Sem 7–8)

### Semana 7

**Objetivo:** Sistema de música completo.

- [ ] Instalar y configurar Distube v4 + @distube/youtube + play-dl
- [ ] Comandos básicos: `/play`, `/stop`, `/skip`, `/pause`, `/resume`
- [ ] Comandos de cola: `/queue`, `/queue remove/clear`, `/move`
- [ ] Comandos: `/nowplaying`, `/volume`, `/seek`, `/loop`, `/shuffle`
- [ ] Sistema de filtros de audio (bassboost, nightcore, etc.)
- [ ] Panel de control con botones (mensaje fijo)
- [ ] Manejo de eventos de Distube (playSong, addSong, finish, error)
- [ ] Schema `Playlist.js`
- [ ] Comandos de playlists: `/playlist save/load/list/delete`
- [ ] Comando `/lyrics` via API externa
- [ ] Auto-leave por canal vacío o inactividad
- [ ] Configuración de música por servidor

**Entregable:** Música completamente funcional con panel de botones.

---

### Semana 8

**Objetivo:** Módulo de entretenimiento completo.

- [ ] Banco de preguntas de trivia (`trivia.json`, 500+ preguntas)
- [ ] Comandos: `/trivia`, `/trivia battle`, `/trivia stats`, `/trivia leaderboard`
- [ ] Juegos: `/connect4`, `/tictactoe`, `/rps`
- [ ] Wordle en español (`wordle_words.json`)
- [ ] Ahorcado (`/hangman`)
- [ ] GIF reactions: `/slap`, `/hug`, `/pat`, `/kiss`, `/cry`, `/dance`
- [ ] Comandos misc: `/8ball`, `/coinflip`, `/dice`, `/choose`, `/rate`, `/ship`
- [ ] Memes via Reddit API: `/meme`
- [ ] Fotos de animales: `/cat`, `/dog`, `/fox`
- [ ] Encuestas: `/poll yesno`, `/poll create`, `/poll end`
- [ ] Comandos de utilidad: `/embed`, `/remind`, `/userinfo`, `/serverinfo`
- [ ] Comandos info: `/roleinfo`, `/channelinfo`, `/avatar`, `/banner`
- [ ] Herramientas: `/calculate`, `/convert`, `/currency`, `/weather`, `/color`

**Entregable:** Módulo de entretenimiento y utilidades completo.

---

## Fase 5 — IA y integraciones externas (Sem 9–10)

### Semana 9

**Objetivo:** Integración completa de OpenRouter.

- [ ] Cliente `openrouter.js` con manejo de errores y reintentos
- [ ] Sistema de contexto en memoria (`aiContext.js`)
- [ ] Comandos: `/ai chat`, `/ai ask`, `/ai model`, `/ai models`
- [ ] Comandos: `/ai persona`, `/ai reset`
- [ ] Comandos: `/ai summary`, `/ai translate`
- [ ] Comando `/ai imagine` con modelo de imagen
- [ ] Comando `/ai check` para análisis de toxicidad
- [ ] Auto-respuesta en canales configurados
- [ ] Schema `GuildAI.js`
- [ ] Comando `/ai config`
- [ ] Filtro de contenido y guardrails
- [ ] Contador de tokens y coste estimado

**Entregable:** IA completamente integrada con chat contextual, imágenes y moderación IA.

---

### Semana 10

**Objetivo:** Integraciones externas.

- [ ] Integración Twitch: alertas de live, EventSub webhook
- [ ] Integración YouTube: alertas de nuevo vídeo via polling
- [ ] Integración GitHub: webhooks de push, PR, issues
- [ ] Lector de feeds RSS
- [ ] Feed de Reddit (hot/new posts)
- [ ] Alertas de oferta en Steam
- [ ] Schemas de integraciones en MongoDB
- [ ] Comandos de configuración de cada integración
- [ ] Worker/poller para cada servicio con `node-schedule`

**Entregable:** Todas las integraciones externas funcionando.

---

## Fase 6 — Dashboard web y deploy (Sem 11–12)

### Semana 11

**Objetivo:** Dashboard web funcional.

- [ ] Inicializar proyecto Next.js 14 en `/dashboard`
- [ ] Configurar NextAuth.js con Discord OAuth2
- [ ] Schema Prisma para sessions y config del dashboard
- [ ] Página de login y selector de servidores
- [ ] Layout con sidebar y navbar
- [ ] API REST interna en el bot (Express, puerto 3001)
- [ ] Middleware de autenticación en la API
- [ ] Páginas de configuración: moderación, bienvenidas, niveles
- [ ] Páginas de configuración: economía, sorteos, IA, música
- [ ] Panel de tickets con visor de transcripciones
- [ ] Visor de logs con filtros
- [ ] Stats en tiempo real del servidor

**Entregable:** Dashboard web completo y conectado al bot.

---

### Semana 12

**Objetivo:** Pulido, testing y deploy a producción.

- [ ] Testing de todos los módulos en servidor de pruebas
- [ ] Manejo de errores global (`process.on('unhandledRejection')`)
- [ ] Rate limiting en comandos sensibles
- [ ] Optimización de queries de MongoDB (índices)
- [ ] Deploy del bot en Railway (Hobby plan)
- [ ] Deploy del dashboard en Railway (servicio separado)
- [ ] Variables de entorno de producción en Railway
- [ ] Configuración de dominio para el dashboard
- [ ] Monitoring básico (logs de Railway, alertas de downtime)
- [ ] Documentación final de todos los módulos
- [ ] Crear servidor de soporte de Jarvis-FavBot

**Entregable:** Jarvis-FavBot en producción 24/7, dashboard accesible públicamente.

---

## Backlog (post v1.0)

Features para versiones futuras, ordenadas por prioridad:

### Alta prioridad
- [ ] Sistema de eventos/torneos del servidor
- [ ] Canales de noticias con rol de suscripción
- [ ] Bot de música secundario (para cuando el principal está ocupado)
- [ ] App de Discord (interfaz en la barra lateral de Discord)

### Media prioridad
- [ ] Sistema de badges y logros personalizables
- [ ] Mini CRM de staff (notas sobre usuarios)
- [ ] Backup y restauración de configuración del servidor
- [ ] Multi-idioma (inglés, portugués, francés)
- [ ] API pública de Jarvis-FavBot para integraciones de terceros

### Baja prioridad
- [ ] Dashboard móvil (PWA)
- [ ] Plugin system para módulos de terceros
- [ ] Soporte para múltiples prefijos de texto
- [ ] Integración con YouTube Music y Apple Music
- [ ] Sistema de logs de voz (grabaciones, transcripciones)

---

## Métricas de éxito (v1.0)

| Métrica | Objetivo |
|---|---|
| Uptime | >99% |
| Latencia media | <100ms |
| Comandos por segundo | >10 sin degradación |
| Tiempo de respuesta slash command | <500ms |
| Cobertura de módulos | 15/15 |
| Servidores en producción | 1+ |
