# 🛡 Moderación y seguridad

Sistema completo de moderación inspirado en Dyno (mejor automod) y Carl-bot (mejor configuración). Unifica ambos en un solo módulo.

## Comandos de moderación

| Comando | Descripción | Permisos |
|---|---|---|
| `/ban @user [razón] [duración]` | Banea con DM automático al usuario | BAN_MEMBERS |
| `/unban userID [razón]` | Levanta el ban y registra quién lo hizo | BAN_MEMBERS |
| `/kick @user [razón]` | Expulsa con DM y registro | KICK_MEMBERS |
| `/timeout @user duración [razón]` | Timeout de 1min a 28 días | MODERATE_MEMBERS |
| `/untimeout @user` | Levanta el timeout antes de que expire | MODERATE_MEMBERS |
| `/warn @user razón` | Añade advertencia con ID único | MODERATE_MEMBERS |
| `/warns @user` | Lista todas las advertencias activas | MODERATE_MEMBERS |
| `/delwarn ID` | Elimina una advertencia por su ID | MANAGE_GUILD |
| `/clear n [@user]` | Borra 1-100 mensajes. Filtra por usuario si se especifica | MANAGE_MESSAGES |
| `/slowmode segundos` | Activa slowmode. 0 para desactivar | MANAGE_CHANNELS |
| `/lockdown [#canal]` | Bloquea el canal para @everyone | MANAGE_CHANNELS |
| `/unlock [#canal]` | Reabre el canal bloqueado | MANAGE_CHANNELS |
| `/nick @user [nuevo_nick]` | Cambia el nick de un usuario | MANAGE_NICKNAMES |
| `/role give @user rol` | Asigna un rol manualmente | MANAGE_ROLES |
| `/role take @user rol` | Quita un rol manualmente | MANAGE_ROLES |

## Sistema de advertencias (warns)

Las advertencias se acumulan por usuario y servidor. Umbrales configurables desde el dashboard:

```
3 warns → timeout de 1 hora (por defecto)
5 warns → timeout de 24 horas
7 warns → ban permanente
```

Cada warn tiene:
- ID único (ej: `WARN-abc123`)
- Razón registrada
- Moderador que lo puso
- Timestamp
- Estado (activo / expirado / eliminado)

## Automod automático

El automod actúa sin necesidad de comandos. Se configura desde `/automod config` o desde el dashboard.

### Antiflood

```
Detecta: N mensajes en M segundos del mismo usuario
Acción:  Borrar mensajes + timeout configurable + DM de aviso
Default: 5 mensajes en 3 segundos → timeout 5 minutos
```

### Anti-caps

```
Detecta: Mensajes con >70% de mayúsculas y longitud >10 chars
Acción:  Borrar mensaje + advertencia silenciosa
```

### Anti-invite

```
Detecta: Links de invitación de Discord no autorizados
Acción:  Borrar mensaje + warn automático
Config:  Whitelist de servidores permitidos
```

### Anti-spam

```
Detecta: Texto idéntico repetido 3+ veces seguidas
         Stickers o emojis masivos (>10 en un mensaje)
Acción:  Borrar + warn
```

### Anti-raid

```
Detecta: Más de 10 cuentas nuevas entrando en 60 segundos
Acción:  Lockdown automático de todos los canales
         Alerta al canal de staff con mención
         Registro del evento con IPs y timestamps
Desactivar: /antiraid off (solo admin)
```

### Anti-dehoist

```
Detecta: Usuarios con nick que empieza por @, !, # u otros chars especiales
         (para aparecer primero en la lista de miembros)
Acción:  Renombra el nick a "Moderado [ID]" automáticamente
```

### Detector de toxicidad IA

```
Detecta: Insultos velados, evasión de filtros, lenguaje tóxico indirecto
Usa:     OpenRouter API (modelo configurable)
Acción:  Marca el mensaje para revisión de mods o borra automáticamente
Config:  Sensibilidad 1-10 desde el dashboard
Coste:   ~0.001$ por 1000 mensajes analizados con Llama 3
```

## Comandos de configuración

| Comando | Descripción |
|---|---|
| `/automod config` | Abre el menú interactivo de configuración del automod |
| `/automod status` | Muestra qué módulos del automod están activos |
| `/automod whitelist add @rol` | Roles exentos de las reglas del automod |
| `/automod whitelist add #canal` | Canales exentos del automod |
| `/modlog channel #canal` | Canal donde se envían los logs de moderación |
| `/modlog test` | Envía un embed de prueba al canal de logs |

## Sistema de logs de moderación

Cada acción genera un embed en el canal de logs con:

```
🔨 Usuario baneado
─────────────────
Usuario:    @Days16 (ID: 123456789)
Moderador:  @Admin (ID: 987654321)
Razón:      Spam reiterado
Duración:   Permanente
Prueba:     [screenshot adjunto si se sube]
Timestamp:  26/06/2026 14:32:18
ID acción:  MOD-xyz789
```

## Schemas relevantes

Ver [SCHEMAS.md](SCHEMAS.md#warn) para el schema de advertencias y [SCHEMAS.md](SCHEMAS.md#modlog) para el schema de logs.

## Estructura de archivos

```
src/commands/mod/
├── ban.js
├── unban.js
├── kick.js
├── timeout.js
├── untimeout.js
├── warn.js
├── warns.js
├── delwarn.js
├── clear.js
├── slowmode.js
├── lockdown.js
├── unlock.js
├── nick.js
└── automod.js

src/events/
├── messageCreate.js     # Analiza mensajes para automod
├── guildMemberAdd.js    # Anti-raid
└── guildBanAdd.js       # Log de bans externos

src/utils/
├── automod.js           # Lógica del automod
├── warnSystem.js        # Sistema de warns y umbrales
└── modLogger.js         # Generación de embeds de log
```
