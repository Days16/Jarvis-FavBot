# 🏅 Niveles y sistema de XP

Sistema de rangos más completo que MEE6 (de pago) y Arcane. Incluye XP por mensajes, XP por voz, multiplicadores, prestige y tarjetas de perfil generadas con canvas.

## Comandos

| Comando | Descripción | Permisos |
|---|---|---|
| `/rank [@user]` | Tarjeta de perfil con nivel, XP y rango | Todos |
| `/leaderboard [tipo]` | Top 10 del servidor. Tipos: mensajes, voz, total | Todos |
| `/level rewards` | Lista roles que se obtienen por nivel | Todos |
| `/xp give @user cantidad` | Añade XP manualmente | MANAGE_GUILD |
| `/xp remove @user cantidad` | Quita XP manualmente | MANAGE_GUILD |
| `/xp reset @user` | Resetea el XP de un usuario | MANAGE_GUILD |
| `/xp reset all` | Resetea el XP de todo el servidor (confirmación requerida) | ADMINISTRATOR |
| `/level config` | Menú de configuración del sistema de niveles | MANAGE_GUILD |
| `/level addreward nivel rol` | Asigna un rol a obtener al alcanzar ese nivel | MANAGE_GUILD |
| `/level removereward nivel` | Elimina el rol reward de ese nivel | MANAGE_GUILD |
| `/prestige` | Reinicia a nivel 0 a cambio de un emblema de prestige | Todos |

## Cálculo de XP

### Por mensajes

```javascript
// XP aleatorio entre min y max por mensaje
xpGanado = Math.floor(Math.random() * (max - min + 1)) + min

// Valores por defecto:
min = 15
max = 25

// Cooldown entre mensajes (para evitar spam farm):
cooldown = 60 segundos  // configurable

// XP necesario para subir al siguiente nivel:
xpRequerido = 5 * (nivel ^ 2) + 50 * nivel + 100
```

### Por voz

```javascript
// XP cada minuto en canal de voz
xpPorMinuto = 10  // configurable

// NO suma XP si:
// - El usuario está solo en el canal
// - El usuario está muteado y deafeado (AFK)
// - El canal está marcado como excluido
```

### Multiplicadores

Los multiplicadores se **suman** (no se multiplican entre sí):

| Fuente | Multiplicador |
|---|---|
| Base | 1x |
| Boost activo en el servidor | +0.5x (configurable) |
| Rol VIP / Premium | +0.5x (por rol, configurable) |
| Canal de estudio/eventos | +1x (por canal, configurable) |

Ejemplo: usuario con boost + rol VIP en canal de estudio → **3x XP**

## Tarjeta de perfil (`/rank`)

Generada con `@napi-rs/canvas`. Incluye:

- Avatar del usuario (circular)
- Nombre y discriminador
- Nivel actual y posición en el leaderboard
- Barra de progreso de XP con valores exactos
- Emblemas de prestige (si los tiene)
- Fondo personalizable por el usuario (si tiene item de tienda)

Dimensiones: 934x282px. Formato: PNG.

## Sistema de roles por nivel

Configurable con `/level addreward`:

```
Nivel 5  → @Novato
Nivel 10 → @Miembro
Nivel 20 → @Activo
Nivel 30 → @Veterano
Nivel 50 → @Leyenda
```

Modos de asignación (configurable):
- **Stack** — el usuario acumula todos los roles
- **Replace** — solo tiene el rol del nivel actual (quita el anterior)

## Notificación de subida de nivel

Cuando un usuario sube de nivel el bot envía:

### En el canal (por defecto)

```
🎉 ¡@Days16 ha subido al nivel 15! 
Sigue así para alcanzar el nivel 20 y obtener el rol @Activo
```

### Por DM (configurable)

```
🎉 ¡Has subido al nivel 15 en Jarvis-FavBot Server!
XP actual: 4.250 / 5.350 para nivel 16
```

Canal de notificación configurable. Se puede desactivar completamente.

## Sistema de Prestige

Cuando un usuario alcanza el nivel máximo (configurable, por defecto 100) puede usar `/prestige`:

```
⚠️ ¿Seguro que quieres hacer prestige?
   Esto reiniciará tu nivel a 0.
   A cambio obtendrás:
   • Emblema Prestige I en tu tarjeta de perfil
   • Rol @Prestige I
   • 500 monedas de bonus

[Confirmar] [Cancelar]
```

Se pueden hacer múltiples prestiges (I, II, III, IV, V…). Cada uno da un emblema diferente. Los usuarios con prestige suelen aparecer destacados en el leaderboard.

## Leaderboard

```
🏆 Leaderboard — Jarvis-FavBot Server

#1 | @Days16       | Nivel 47 | 89.420 XP
#2 | @User2        | Nivel 41 | 72.150 XP  🏅 Prestige I
#3 | @User3        | Nivel 38 | 63.900 XP
...

[⬅ Anterior]  Página 1/10  [Siguiente ➡]
Tipo: Total ▼
```

Tipos de leaderboard: total, mensajes, voz.

## Estructura de archivos

```
src/commands/levels/
├── rank.js
├── leaderboard.js
├── xp.js
├── config.js
├── rewards.js
└── prestige.js

src/events/
├── messageCreate.js   # Suma XP por mensaje
└── voiceStateUpdate.js # Suma XP por voz

src/utils/
├── levelSystem.js     # Cálculo de XP y niveles
├── profileCard.js     # Generación de tarjeta canvas
└── levelNotifier.js   # Notificaciones de subida

src/models/
└── UserLevel.js       # Schema MongoDB
```
