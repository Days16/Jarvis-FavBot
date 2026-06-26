# Jarvis-FavBot — Guía para Claude

Bot de Discord todo en uno para comunidades de gaming y entretenimiento. Reemplaza MEE6, Carl-bot, Dyno y Groovy en un solo proyecto. **Node.js 20 + discord.js v14 + Supabase (PostgreSQL). ES6 modules obligatorio** (`"type": "module"`).

## Comandos de desarrollo

```bash
npm run dev        # Arranca con nodemon (desarrollo)
npm start          # Producción
npm run deploy     # Registra slash commands en el servidor de pruebas (GUILD_ID)
npm run deploy:global  # Registra slash commands globalmente
```

## Variables de entorno (.env)

Solo 3 bloques en `.env` — todo lo demás va en Supabase:

```
DISCORD_TOKEN              # Token del bot
CLIENT_ID                  # App ID de Discord
GUILD_ID                   # Servidor de pruebas

SUPABASE_URL               # https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY  # Clave service_role (bypasea RLS)

OPENROUTER_API_KEY         # API Key de OpenRouter (IA)
OPENROUTER_MODEL           # Modelo por defecto
```

**Las credenciales de integraciones externas NO van en `.env`** — se gestionan desde el dashboard en la tabla `bot_config` de Supabase (Twitch, YouTube, Kick, TikTok, Reddit, GitHub, Steam, etc.).

## Base de datos — Supabase

**Cliente:** `@supabase/supabase-js` v2 con `service_role` key (server-side, bypasea RLS).

**Setup inicial:** ejecutar `supabase/schema.sql` y después `supabase/schema_phase2.sql` en Supabase Dashboard > SQL Editor.

**Tablas:**
| Tabla | Descripción | Datos complejos |
|-------|-------------|-----------------|
| `guilds` | Config por servidor | `channels`, `modules`, `automod`, `warn_thresholds` → JSONB |
| `warns` | Advertencias | Solo columnas simples |
| `guild_logs` | Config de logs | `channels`, `enabled` → JSONB |
| `bot_config` | Credenciales globales del bot (gestionadas vía dashboard) | Clave-valor simple |
| `guild_integrations` | Integraciones por servidor (Twitch, YouTube, Kick, TikTok, GitHub, RSS, Reddit, Steam) | `metadata` → JSONB |
| `guild_ticket_config` | Config tickets por servidor | `categories` → JSONB |
| `tickets` | Tickets de soporte | Columnas simples |
| `guild_welcome` | Config bienvenidas/despedidas/verificación | Columnas simples |
| `guild_autoroles` | Roles auto-asignados al entrar | Columnas simples |
| `private_channels` | Canales privados de usuario | `members` → TEXT[] |
| `groups` | Grupos exclusivos | `members`, `admins`, `pending` → TEXT[] |
| `role_panels` | Paneles de reaction roles | `entries` → JSONB |

**Patrón de acceso:** los modelos en `src/models/` son funciones puras (no clases Mongoose). Siempre devuelven objetos camelCase aunque la BD use snake_case.

```js
// Leer
const g = await getGuild(guildId);       // null si no existe
const g = await ensureGuild(guildId);    // crea si no existe, nunca null

// Escribir (acepta claves camelCase)
await updateGuild(guildId, { automod: { ...g.automod, enabled: true } });
```

**Regla de oro para actualizaciones JSONB:** siempre spread el objeto completo:
```js
// ✅ Correcto
await updateGuild(id, { automod: { ...guildData.automod, enabled: true } });

// ❌ Nunca modificar y "guardar" — no hay .save()
guildData.automod.enabled = true; // esto no persiste
```

## Estructura del proyecto

```
index.js                    # Entry point — login, handlers
deploy-commands.js          # Registra slash commands en Discord
supabase/
  schema.sql                # SQL para crear las tablas en Supabase
src/
  handlers/
    commandHandler.js       # Carga automática desde src/commands/**/*.js
    eventHandler.js         # Carga automática desde src/events/*.js
  utils/
    logger.js               # Logger con colores (info/success/warn/error/debug)
    database.js             # Cliente Supabase + connectDatabase()
    cooldowns.js            # checkCooldown(client, interaction, command)
    embedBuilder.js         # successEmbed/errorEmbed/warnEmbed/infoEmbed/modEmbed
    permCheck.js            # isModeratable(interaction, target), isModerator(member)
    modLogger.js            # sendModLog(guild, {action, color, fields})
    warnSystem.js           # addWarn/removeWarn/getActiveWarns
    automod.js              # checkAutomod(message, guildData), checkAntiRaid(guild, guildData)
  models/
    Guild.js                # getGuild / ensureGuild / updateGuild
    Warn.js                 # createWarn / deactivateWarn / countActiveWarns / getActiveWarns
    GuildLogs.js            # getGuildLogs / ensureGuildLogs / updateGuildLogs
    BotConfig.js            # getConfig(key) / setConfig(key,val) / getAllConfig() — con cache 5min
    GuildIntegrations.js    # CRUD de integraciones por servidor (Twitch/YouTube/Kick/TikTok/etc.)
  handlers/
    commandHandler.js       # Carga automática desde src/commands/**/*.js
    eventHandler.js         # Carga automática desde src/events/*.js
    buttonHandler.js        # handleButton(interaction) — tickets, verify, rp, group
    selectHandler.js        # handleSelect(interaction) — role panels select, ticket category
    modalHandler.js         # handleModal(interaction) — ticket creation modal
  events/
    ready.js                # (once, clientReady) — presencia, log de inicio
    interactionCreate.js    # Despacha slash/botones/selects/modals
    guildCreate.js          # ensureGuild() al unirse a un servidor
    guildMemberAdd.js       # Anti-raid + bienvenida canvas + autoroles + DM
    guildMemberRemove.js    # Goodbye message + log de salida
    guildBanAdd.js          # Log de bans externos vía audit log
    messageCreate.js        # Automod completo
  utils/
    ...
    ticketManager.js        # openTicket() / closeTicketChannel() — crea/cierra tickets
    transcriptGenerator.js  # generateTranscript(channel, ticket) → HTML string
    welcomeCard.js          # generateWelcomeCard(member, count, bgUrl) → Buffer PNG
    welcomeVariables.js     # applyVariables(text, member) — {user} {username} etc.
    scheduler.js            # initScheduler(client) — auto-close tickets, inactividad privados
  models/
    Guild.js                # getGuild / ensureGuild / updateGuild
    Warn.js                 # createWarn / deactivateWarn / countActiveWarns / getActiveWarns
    GuildLogs.js            # getGuildLogs / ensureGuildLogs / updateGuildLogs
    BotConfig.js            # getConfig / setConfig / getAllConfig — con cache 5min
    GuildIntegrations.js    # CRUD integraciones (Twitch/YouTube/Kick/TikTok/etc.)
    GuildTicketConfig.js    # getTicketConfig / ensureTicketConfig / updateTicketConfig / incrementTicketCount
    Ticket.js               # createTicket / getTicketByChannel / closeTicket / claimTicket / rateTicket / getTicketStats
    GuildWelcome.js         # getGuildWelcome / ensureGuildWelcome / updateGuildWelcome
    Autorole.js             # getAutoroles / addAutorole / removeAutorole
    PrivateChannel.js       # createPrivateChannel / updatePrivateChannel / deletePrivateChannel / ...
    Group.js                # createGroup / updateGroup / deleteGroup / getGroupsByGuild / ...
    RolePanel.js            # createRolePanel / updateRolePanel / deleteRolePanel / getRolePanelById / ...
  commands/
    utils/
      ping.js               # /ping
      botinfo.js            # /botinfo
      userinfo.js           # /userinfo [usuario]
      serverinfo.js         # /serverinfo
    mod/
      ban.js                # /ban usuario [razon] [duracion] [borrar_mensajes]
      unban.js              # /unban userid [razon]
      kick.js               # /kick usuario [razon]
      timeout.js            # /timeout usuario duracion [razon]
      untimeout.js          # /untimeout usuario [razon]
      warn.js               # /warn usuario razon
      warns.js              # /warns usuario
      delwarn.js            # /delwarn id
      clear.js              # /clear cantidad [usuario]
      slowmode.js           # /slowmode segundos [canal]
      lockdown.js           # /lockdown [canal] [razon]
      unlock.js             # /unlock [canal]
      nick.js               # /nick usuario [apodo]
      automod.js            # /automod status|toggle|whitelist
      logs.js               # /logs setup|channel|enable|disable|status|test
    tickets/
      ticket.js             # /ticket setup|category|claim|close|add|remove|rename|list|stats
    welcome/
      welcome.js            # /welcome channel|message|image|dm|test|status
      goodbye.js            # /goodbye channel|message|test|status
      verify.js             # /verify setup|role|message
    private/
      private.js            # /private create|invite|kick|name|close|list|topic
      group.js              # /group create|invite|kick|promote|demote|leave|disband|list|join|transfer
      rolechannel.js        # /rolechannel create|add|remove|list
    roles/
      rr.js                 # /rr create|add|remove|mode|require|publish|delete|list
      autorole.js           # /autorole add|remove|list
      role.js               # /role give|take|info|members|color
```

## Cómo añadir un comando

1. Crear `src/commands/<categoria>/nombre.js`
2. Exportar default con: `{ data: SlashCommandBuilder, execute(interaction, client), cooldown? }`
3. El handler lo carga automáticamente — no hay registro manual

```js
import { SlashCommandBuilder } from 'discord.js';

export default {
  cooldown: 5,
  data: new SlashCommandBuilder().setName('nombre').setDescription('...'),
  async execute(interaction, client) { ... },
};
```

## Cómo añadir un evento

```js
export default {
  name: 'eventName',
  once: false,
  async execute(arg1, arg2, client) { ... },
};
```

## Convenciones clave

- **Siempre** `interaction.deferReply()` si la respuesta puede tardar >3s
- Respuestas de error: `ephemeral: true`
- Todos los logs de moderación pasan por `sendModLog()` de `modLogger.js`
- Guardar config del servidor: `updateGuild(id, { campo: nuevoValor })`
- Actualizar JSONB: spread completo del objeto (`{ ...obj, campo: valor }`)
- Checks de moderabilidad: `isModeratable(interaction, target)` antes de cualquier acción
- Warns: usar `addWarn()` de `warnSystem.js` — aplica timeouts/ban automático por umbrales

## Roadmap

| Fase | Contenido | Estado |
|------|-----------|--------|
| **1** | Base + Moderación | ✅ Completa |
| **2** | Tickets + Bienvenidas + Canales privados + Reaction roles | ✅ Completa |
| 3 | Sorteos + Niveles + Economía | ⏳ Pendiente |
| 4 | Música (Distube) + Entretenimiento | ⏳ Pendiente |
| 5 | IA (OpenRouter) + Integraciones (Twitch, YouTube, **Kick**, **TikTok**, GitHub, RSS, Reddit, Steam) | ⏳ Pendiente |
| 6 | Dashboard (Next.js) + Deploy Railway | ⏳ Pendiente |

## Stack y dependencias clave

| Paquete | Uso |
|---------|-----|
| `discord.js@14` | API Discord |
| `@supabase/supabase-js@2` | Cliente Supabase (PostgreSQL) |
| `dotenv@16` | Variables de entorno |
| `ms@2` | Parser de duraciones ("1h", "7d") |
| `@napi-rs/canvas` | Canvas para imágenes (Fase 2+) |
| `distube@4` | Música (Fase 4) |
| `axios` | HTTP para integraciones externas (Fase 5) |
| `node-schedule` | Tareas cron (Fase 3+) |
