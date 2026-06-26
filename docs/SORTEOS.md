# 🎁 Sistema de sorteos (Giveaways)

Sistema más completo que GiveawayBot. Soporta requisitos de nivel, roles, peso por boost, múltiples ganadores y countdown en vivo.

## Comandos

| Comando | Descripción | Permisos |
|---|---|---|
| `/giveaway create` | Abre modal para crear un sorteo | MANAGE_GUILD |
| `/giveaway reroll ID` | Escoge nuevos ganadores del sorteo | MANAGE_GUILD |
| `/giveaway end ID` | Termina el sorteo antes de tiempo | MANAGE_GUILD |
| `/giveaway cancel ID` | Cancela el sorteo sin ganador | MANAGE_GUILD |
| `/giveaway pause ID` | Pausa el contador del sorteo | MANAGE_GUILD |
| `/giveaway resume ID` | Reanuda un sorteo pausado | MANAGE_GUILD |
| `/giveaway list` | Lista sorteos activos del servidor | MANAGE_GUILD |
| `/giveaway history` | Últimos 20 sorteos con ganadores | Todos |
| `/giveaway info ID` | Detalles de un sorteo específico | Todos |

## Crear un sorteo

Al usar `/giveaway create` se abre un modal con estos campos:

```
Premio:       Nitro Classic x1
Duración:     2d 6h 30m  (formato flexible: 1h, 2d, 1w)
Ganadores:    1
Canal:        #sorteos
```

Y opciones avanzadas como:

```
Nivel mínimo:     10           (requiere módulo de niveles)
Rol requerido:    @Verificado  (solo con ese rol pueden participar)
Boost = tickets:  2            (los boosters tienen 2x entradas)
Invitaciones:     sí           (más entradas según invitaciones activas)
Imagen:           URL          (imagen decorativa en el embed)
```

## Embed del sorteo

```
╔══════════════════════════════════════╗
║  🎁  SORTEO — Nitro Classic x1       ║
║                                      ║
║  Pulsa 🎉 para participar            ║
║                                      ║
║  Ganadores:    1                     ║
║  Termina en:   1d 4h 32m             ║
║  Participantes: 47                   ║
║                                      ║
║  Requisitos:                         ║
║  • Nivel mínimo 10                   ║
║  • Rol @Verificado                   ║
║                                      ║
║  Organizado por @Admin               ║
╚══════════════════════════════════════╝
```

El embed se actualiza automáticamente cada 30 segundos con el tiempo restante y el número de participantes.

## Sistema de pesos (tickets)

Los participantes pueden tener más de una entrada según configuración:

| Condición | Entradas extra |
|---|---|
| Base (cualquier usuario) | 1 entrada |
| Tiene boost activo en el servidor | +1 a +5 (configurable) |
| Ha invitado X usuarios | +1 por cada 5 invitaciones (configurable) |
| Tiene rol especial (VIP, etc.) | +2 entradas (configurable por rol) |

## Requisitos de participación

Si el usuario no cumple los requisitos al pulsar 🎉, el bot le responde en efímero:

```
❌ No puedes participar en este sorteo.
   Necesitas: Nivel mínimo 10 (tienes nivel 7)
```

## Anuncio del ganador

```
╔══════════════════════════════════════╗
║  🎉  ¡SORTEO FINALIZADO!             ║
║                                      ║
║  Premio:    Nitro Classic x1         ║
║                                      ║
║  🏆 Ganador: @Days16                 ║
║                                      ║
║  ¡Felicidades! Contacta con          ║
║  @Admin para recibir tu premio.      ║
╚══════════════════════════════════════╝
```

Si hay múltiples ganadores se listan todos con mención.

## Reroll

Si el ganador no responde o no se puede contactar:

```
/giveaway reroll ID
→ Se selecciona un nuevo ganador entre los participantes originales
→ El ganador anterior queda excluido del reroll
→ Se puede hacer reroll hasta 3 veces por sorteo
```

## Estructura de archivos

```
src/commands/giveaways/
├── create.js
├── reroll.js
├── end.js
├── cancel.js
├── pause.js
├── resume.js
├── list.js
├── history.js
└── info.js

src/events/
└── interactionCreate.js  # Maneja el botón 🎉

src/utils/
└── giveawayManager.js    # Lógica de sorteos, timers, pesos

src/models/
└── Giveaway.js           # Schema MongoDB
```

## Schema del sorteo

```javascript
// src/models/Giveaway.js
{
  guildId:       String,   // ID del servidor
  channelId:     String,   // Canal del sorteo
  messageId:     String,   // Mensaje del embed
  prize:         String,   // Premio
  winnerCount:   Number,   // Número de ganadores
  endAt:         Date,     // Cuándo termina
  ended:         Boolean,  // Si ya terminó
  paused:        Boolean,  // Si está pausado
  hostedBy:      String,   // ID del organizador
  winners:       [String], // IDs de los ganadores
  participants:  [String], // IDs de todos los que pulsaron 🎉
  requirements: {
    minLevel:    Number,
    requiredRole: String,
    boostMultiplier: Number,
    inviteMultiplier: Number,
  }
}
```
