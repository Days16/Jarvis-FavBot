# 👋 Bienvenidas, salidas y verificación

Sistema de onboarding completo para nuevos miembros: imagen de bienvenida, DM automático, verificación y autorole.

## Comandos

| Comando | Descripción | Permisos |
|---|---|---|
| `/welcome channel #canal` | Canal donde se mandan las bienvenidas | MANAGE_GUILD |
| `/welcome message texto` | Personaliza el mensaje. Admite variables | MANAGE_GUILD |
| `/welcome image on/off` | Activa la imagen generada con canvas | MANAGE_GUILD |
| `/welcome image background url` | URL de imagen de fondo personalizada | MANAGE_GUILD |
| `/welcome dm texto` | DM automático al nuevo miembro | MANAGE_GUILD |
| `/welcome dm off` | Desactiva el DM de bienvenida | MANAGE_GUILD |
| `/welcome test` | Simula una bienvenida con tu usuario | MANAGE_GUILD |
| `/goodbye channel #canal` | Canal para mensajes de salida | MANAGE_GUILD |
| `/goodbye message texto` | Mensaje de despedida personalizable | MANAGE_GUILD |
| `/goodbye test` | Simula una salida con tu usuario | MANAGE_GUILD |
| `/verify setup #canal` | Crea el panel de verificación | MANAGE_GUILD |
| `/verify role @rol` | Rol que se asigna tras verificar | MANAGE_GUILD |
| `/verify message texto` | Mensaje del panel de verificación | MANAGE_GUILD |

## Variables disponibles en los mensajes

| Variable | Se reemplaza por |
|---|---|
| `{user}` | Mención del usuario (@Days16) |
| `{username}` | Nombre del usuario sin mención |
| `{server}` | Nombre del servidor |
| `{membercount}` | Número total de miembros |
| `{membercount_ordinal}` | "Eres el miembro número 342" |
| `{date}` | Fecha de entrada (DD/MM/YYYY) |

### Ejemplo de mensaje de bienvenida

```
¡Bienvenido/a {user}! 🎉
Eres el miembro número **{membercount}** de {server}.
Dirígete a #reglas para verificarte y acceder al servidor completo.
```

## Imagen de bienvenida (canvas)

Generada con `@napi-rs/canvas`. Dimensiones: 1024x400px.

```
┌─────────────────────────────────────────┐
│                                         │
│   [Avatar]    ¡Bienvenido/a!            │
│               Days16                    │
│               Miembro #342              │
│                                         │
│   Jarvis-FavBot Server                         │
└─────────────────────────────────────────┘
```

Elementos de la imagen:
- Fondo: imagen personalizada o gradiente por defecto
- Avatar circular del usuario con borde de color
- Nombre de usuario
- Posición (miembro número X)
- Nombre del servidor
- Fuente: Inter / Roboto (incluida en el proyecto)

El fondo se puede personalizar por URL (`/welcome image background url`) o con un color sólido.

## DM de bienvenida

Mensaje privado automático al nuevo miembro:

```
¡Hola {username}! 👋

Bienvenido/a a **{server}**.

Aquí tienes todo lo que necesitas saber:
📋 Reglas: #reglas
💬 Preguntas: #ayuda
🎮 Juegos y comunidad: #general

Si necesitas ayuda, abre un ticket en #soporte.

¡Esperamos que disfrutes la experiencia!
```

## Verificación

El sistema de verificación evita la entrada de bots y cuentas de raid:

```
/verify setup #verificacion
→ Bot crea un embed con botón "Verificarme" en el canal
→ Al pulsar el botón, el usuario recibe el rol @Verificado
→ Los canales del servidor están ocultos para @everyone
   y visibles solo para @Verificado
```

### Embed del panel de verificación

```
╔══════════════════════════════════════╗
║  ✅ Verificación de miembro          ║
║                                      ║
║  Para acceder al servidor pulsa      ║
║  el botón de abajo.                  ║
║                                      ║
║  Al verificarte aceptas las          ║
║  reglas de la comunidad.             ║
║                                      ║
║         [✅ Verificarme]             ║
╚══════════════════════════════════════╝
```

### Tipos de verificación (configurable)

| Tipo | Método |
|---|---|
| `button` | Solo pulsar el botón (por defecto) |
| `captcha` | Resolver un captcha de texto simple |
| `react` | Reaccionar con un emoji específico |
| `rules` | Leer y aceptar las reglas explícitamente |

## Mensaje de salida

Cuando un miembro abandona el servidor:

```
👋 @Days16 ha abandonado el servidor.
Ahora somos 341 miembros.
Estuvo con nosotros desde el 01/03/2025 (117 días).
```

## Contador de miembros en tiempo real

Canal de voz que muestra el número de miembros:

```
/counter create tipo
→ Crea un canal de voz con nombre dinámico

Tipos disponibles:
  members  → "👥 Miembros: 342"
  humans   → "👤 Usuarios: 330"
  bots     → "🤖 Bots: 12"
  online   → "🟢 Online: 87"

Se actualiza cada 10 minutos (límite de la API de Discord)
```

## Estructura de archivos

```
src/commands/welcome/
├── welcome.js
├── goodbye.js
└── verify.js

src/events/
├── guildMemberAdd.js   # Bienvenida, DM, autorole
└── guildMemberRemove.js # Mensaje de salida

src/utils/
├── welcomeCard.js      # Generación de imagen con canvas
└── verifyManager.js    # Gestión del panel de verificación

src/models/
└── GuildWelcome.js     # Config de bienvenida por servidor
```
