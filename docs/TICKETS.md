# 🎫 Sistema de tickets

Sistema de soporte profesional con canales privados, transcripciones HTML, ratings de staff y estadísticas.

## Flujo de un ticket

```
Usuario pulsa botón "Crear ticket"
    ↓
Bot crea canal privado #ticket-0042
Solo visible para: usuario + staff
    ↓
Staff ve la notificación y puede /ticket claim
    ↓
Conversación en el canal privado
    ↓
/ticket close → transcripción HTML → DM al usuario → canal eliminado
    ↓
Usuario recibe formulario de rating (1-5 ⭐)
```

## Comandos

| Comando | Descripción | Quién puede |
|---|---|---|
| `/ticket setup` | Crea el panel con botón "Abrir ticket" en el canal indicado | Admin |
| `/ticket category add nombre` | Añade una categoría al panel (soporte, reporte, compras…) | Admin |
| `/ticket category remove nombre` | Elimina una categoría | Admin |
| `/ticket claim` | El staff se asigna el ticket | Staff |
| `/ticket unclaim` | Libera la asignación del ticket | Staff |
| `/ticket close [razón]` | Cierra el ticket y genera transcripción | Staff / Creador |
| `/ticket reopen` | Reabre un ticket cerrado en las últimas 24h | Staff |
| `/ticket add @user` | Añade a un usuario al canal del ticket | Staff |
| `/ticket remove @user` | Quita a un usuario del canal del ticket | Staff |
| `/ticket rename nombre` | Renombra el canal del ticket | Staff |
| `/ticket pin` | Hace pin del mensaje actual en el ticket | Staff |
| `/ticket list` | Lista todos los tickets abiertos del servidor | Staff |
| `/ticket stats` | Estadísticas de tickets: tiempo medio, rating staff | Admin |

## Panel de tickets

El panel se crea con `/ticket setup` y genera un embed con botones. Ejemplo:

```
╔══════════════════════════════╗
║  🎫  Soporte — Jarvis-FavBot        ║
║                              ║
║  Pulsa el botón para abrir   ║
║  un ticket con el staff.     ║
║                              ║
║  [🔵 Soporte]  [🔴 Reporte]  ║
║  [🟢 Compras]  [⚪ Otro]     ║
╚══════════════════════════════╝
```

Cada botón abre un modal pidiendo detalles antes de crear el ticket.

## Categorías predefinidas

| Categoría | Emoji | Canal destino | Roles notificados |
|---|---|---|---|
| Soporte | 🔵 | #soporte-staff | @Staff |
| Reporte | 🔴 | #reportes-staff | @Moderadores |
| Compras | 🟢 | #ventas-staff | @Ventas |
| Candidatura | 🟡 | #candidaturas-staff | @Admin |
| Otro | ⚪ | #tickets-staff | @Staff |

Todas las categorías son personalizables desde el dashboard.

## Auto-close

Los tickets sin actividad durante X horas (por defecto 48h) reciben:

1. Aviso en el canal: "Este ticket se cerrará automáticamente en 2 horas si no hay actividad."
2. Cierre automático si sigue sin actividad.
3. Notificación por DM al creador.

Configurable con `/ticket autoclose horas`.

## Transcripciones

Al cerrar un ticket se genera automáticamente un archivo HTML con:

- Todos los mensajes del ticket con timestamps
- Avatares de los participantes
- Archivos adjuntos enlazados
- Nombre del staff que lo gestionó
- Rating final del usuario

La transcripción se envía por:
- DM al usuario que abrió el ticket
- Canal de archivo de transcripciones (configurable)

## Sistema de rating

Al recibir la transcripción el usuario ve:

```
¿Cómo fue tu experiencia con el soporte?
[⭐] [⭐⭐] [⭐⭐⭐] [⭐⭐⭐⭐] [⭐⭐⭐⭐⭐]
```

Las valoraciones se acumulan por miembro del staff y son visibles en `/ticket stats`.

## Estadísticas

`/ticket stats` muestra:

```
📊 Estadísticas de tickets — Jarvis-FavBot
────────────────────────────────────
Tickets este mes:     47
Tiempo medio respuesta: 12 min
Tiempo medio cierre:    2h 34min
Rating promedio:       4.3 / 5 ⭐

Top staff este mes:
1. @Staff1  — 18 tickets — 4.8⭐
2. @Staff2  — 15 tickets — 4.1⭐
3. @Staff3  —  9 tickets — 4.5⭐
```

## Estructura de archivos

```
src/commands/tickets/
├── setup.js
├── claim.js
├── close.js
├── reopen.js
├── add.js
├── remove.js
├── list.js
└── stats.js

src/events/
└── interactionCreate.js  # Maneja botones del panel de tickets

src/utils/
├── ticketManager.js      # Crear/cerrar canales, permisos
└── transcriptGenerator.js # Generar HTML de transcripción

src/models/
└── Ticket.js             # Schema MongoDB
```
