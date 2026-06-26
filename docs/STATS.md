# 📊 Estadísticas y logs

Sistema de logs completo y estadísticas del servidor en tiempo real. Registro de todas las acciones importantes con embeds limpios y bien organizados.

## Configuración de logs

| Comando | Descripción | Permisos |
|---|---|---|
| `/logs setup #canal` | Canal principal para todos los logs | MANAGE_GUILD |
| `/logs channel tipo #canal` | Canal específico para un tipo de log | MANAGE_GUILD |
| `/logs enable tipo` | Activa un tipo de log específico | MANAGE_GUILD |
| `/logs disable tipo` | Desactiva un tipo de log | MANAGE_GUILD |
| `/logs status` | Muestra qué logs están activos y en qué canal | MANAGE_GUILD |
| `/logs test` | Envía un embed de prueba de cada tipo activo | MANAGE_GUILD |

### Tipos de logs disponibles

| Tipo | Qué registra |
|---|---|
| `messages` | Ediciones y borrados de mensajes |
| `members` | Entradas, salidas, cambios de nick |
| `mod` | Bans, kicks, warns, timeouts |
| `roles` | Roles asignados y quitados |
| `channels` | Creación, edición y borrado de canales |
| `voice` | Entradas/salidas de canales de voz |
| `invites` | Uso de invitaciones del servidor |
| `guild` | Cambios en la configuración del servidor |
| `bot` | Comandos usados y acciones del bot |

Se puede asignar cada tipo a un canal distinto para mantener orden.

---

## Logs de mensajes

### Mensaje editado

```
✏️ Mensaje editado
──────────────────
Canal:   #general
Usuario: @Days16 (ID: 123456789)

Antes:   Hola a todos como estais
Después: Hola a todos, ¿cómo estáis?

[Ver mensaje →]          26/06/2026 14:32
```

### Mensaje borrado

```
🗑 Mensaje eliminado
────────────────────
Canal:   #general
Usuario: @Days16 (ID: 123456789)

Contenido: Mensaje que fue borrado
Archivos:  [imagen.png] (si había adjuntos)

                         26/06/2026 14:33
```

Si el mensaje fue borrado por un moderador, el log indica quién lo borró.

---

## Logs de miembros

### Entrada al servidor

```
📥 Nuevo miembro
─────────────────
Usuario:  @Days16 (ID: 123456789)
Cuenta creada: 15/01/2024 (532 días)
Invitado por: @Amigo via invitación abc123
Miembro #342

                         26/06/2026 14:00
```

### Salida del servidor

```
📤 Miembro salió
─────────────────
Usuario:  @Days16 (ID: 123456789)
Entró:    01/03/2025 (117 días en el servidor)
Roles:    @Miembro @Veterano @Gamer

                         26/06/2026 15:00
```

### Cambio de nickname

```
✏️ Nick cambiado
─────────────────
Usuario:  @Days16 (ID: 123456789)
Antes:    "DaysOld"
Después:  "Days16"

                         26/06/2026 14:45
```

---

## Logs de moderación

### Ban

```
🔨 Usuario baneado
───────────────────
Usuario:   @Troll (ID: 987654321)
Moderador: @Admin
Razón:     Spam reiterado en #general
Duración:  Permanente
ID acción: MOD-abc123

                         26/06/2026 14:32
```

---

## Logs de voz

```
🎙 Actividad en voz
────────────────────
Usuario: @Days16

Entró en:  🔊 Canal General
Salió de:  🔊 Canal General
Duración:  1h 23min

                         26/06/2026 16:00
```

---

## Estadísticas del servidor

### /serverstats

```
📊 Jarvis-FavBot Server — Estadísticas

👥 Miembros totales:    342
   └ Usuarios:          330
   └ Bots:              12
   └ Online ahora:      87

💬 Mensajes hoy:        1.247
🔊 Minutos en voz hoy: 432
🎫 Tickets abiertos:    3
⚠️  Warns activos:       8

📅 Servidor creado: 01/01/2024
```

### /userstats [@user]

```
📊 Estadísticas de @Days16

Nivel:        47 (89.420 XP)
Mensajes:     3.421 (hoy: 14)
Tiempo voz:   87h 32min
Warns activos: 0
Monedas:      12.540 💰
En el server:  117 días
```

---

## Invitaciones

| Comando | Descripción |
|---|---|
| `/invites` | Lista todas las invitaciones activas del servidor |
| `/inviter @user` | Muestra quién invitó a ese usuario |
| `/invites top` | Ranking de quién más ha invitado |
| `/invites leaderboard` | Leaderboard completo de invitaciones |

### Embed de invitaciones

```
📨 Invitaciones activas — Jarvis-FavBot Server

Código     Creada por    Usos   Expira
──────────────────────────────────────
abc123     @Days16       15     Nunca
xyz789     @User2        3      7 días
def456     @User3        28     Nunca

Total: 3 invitaciones activas
```

El bot rastrea automáticamente qué invitación usó cada miembro al entrar.

---

## Contadores en canales de voz

```
/counter create members   → 👥 Miembros: 342
/counter create humans    → 👤 Usuarios: 330
/counter create bots      → 🤖 Bots: 12
/counter create online    → 🟢 Online: 87
/counter delete           → Elimina el contador
```

Los contadores se actualizan cada 10 minutos (límite de la API de Discord para renombrar canales).

---

## Informe semanal automático

Cada lunes a las 9:00 el bot envía un informe al canal de stats:

```
📋 Informe semanal — Semana del 17/06 al 23/06

👥 Miembros: 342 (+8 esta semana)
💬 Mensajes: 8.432 (-3% vs semana anterior)
🔊 Horas en voz: 127h
🎫 Tickets: 23 abiertos / 21 cerrados
⚠️  Acciones de moderación: 5
🎁 Sorteos: 2 (47 participantes total)

Top activos esta semana:
1. @User1 — 423 mensajes
2. @User2 — 387 mensajes
3. @Days16 — 341 mensajes
```

Configurable con `/report weekly channel #canal`.

---

## Estructura de archivos

```
src/commands/stats/
├── serverstats.js
├── userstats.js
├── invites.js
├── inviter.js
├── counter.js
└── logs.js

src/events/
├── messageUpdate.js      # Log de edición
├── messageDelete.js      # Log de borrado
├── guildMemberAdd.js     # Log de entrada
├── guildMemberRemove.js  # Log de salida
├── guildMemberUpdate.js  # Log de nick/roles
├── guildBanAdd.js        # Log de ban
├── guildBanRemove.js     # Log de unban
├── channelCreate.js      # Log de canal creado
├── channelDelete.js      # Log de canal borrado
├── channelUpdate.js      # Log de canal editado
├── voiceStateUpdate.js   # Log de voz
└── inviteCreate.js       # Trackeo de invitaciones

src/utils/
├── logger.js             # Función central para enviar logs a Discord
└── statsCollector.js     # Recoge métricas para el informe semanal

src/models/
├── GuildLogs.js          # Config de logs por servidor
├── Invite.js             # Trackeo de invitaciones
└── WeeklyStats.js        # Datos del informe semanal
```
