# 🎭 Reaction roles y gestión de roles

Sistema moderno de asignación de roles. Usa botones de Discord v2 y menús desplegables en lugar de reacciones emoji (más estable y visualmente superior).

## Comandos de reaction roles

| Comando | Descripción | Permisos |
|---|---|---|
| `/rr create #canal` | Crea un nuevo panel de roles en el canal | MANAGE_ROLES |
| `/rr add panel rol [emoji] [descripción]` | Añade un rol al panel | MANAGE_ROLES |
| `/rr remove panel rol` | Elimina un rol del panel | MANAGE_ROLES |
| `/rr edit panel rol campo valor` | Edita label, emoji o descripción de un botón | MANAGE_ROLES |
| `/rr mode panel modo` | Cambia el modo del panel | MANAGE_ROLES |
| `/rr require panel @rol` | Requiere tener este rol para usar el panel | MANAGE_ROLES |
| `/rr level panel n` | Requiere nivel mínimo para usar el panel | MANAGE_ROLES |
| `/rr delete panel` | Elimina el panel completo | MANAGE_ROLES |
| `/rr list` | Lista todos los paneles del servidor | MANAGE_ROLES |
| `/rr refresh panel` | Recrea el mensaje del panel (si se desincroniza) | MANAGE_ROLES |

## Modos de panel

| Modo | Comportamiento |
|---|---|
| `normal` | El usuario puede tener múltiples roles del panel |
| `exclusive` | Solo puede tener 1 rol del panel a la vez (quita el anterior) |
| `toggle` | Si ya tiene el rol, al pulsar el botón lo pierde |
| `add_only` | Solo puede añadir roles, nunca quitarlos |
| `remove_only` | Solo puede quitar roles que ya tiene |

## Tipos de panel

### Panel de botones (por defecto)

```
╔══════════════════════════════════════╗
║  🎭 Elige tu rol                     ║
║  Pulsa para obtener o quitar un rol  ║
║                                      ║
║  [🔵 Gamer] [🔴 Artista] [🟢 Dev]   ║
║  [🟡 Streamer] [⚪ Lector]           ║
╚══════════════════════════════════════╝
```

Máximo 25 botones por panel. Se puede organizar en filas de 5.

### Panel con menú desplegable (select menu)

```
╔══════════════════════════════════════╗
║  🎭 Selecciona tus roles             ║
║                                      ║
║  [▼ Selecciona uno o varios roles ]  ║
╚══════════════════════════════════════╝
```

El menú permite selección múltiple. Máximo 25 opciones.

## Respuestas efímeras

Cuando un usuario obtiene o pierde un rol:

```
✅ Se te ha asignado el rol @Gamer   (solo lo ve el usuario)
❌ Se te ha quitado el rol @Gamer    (solo lo ve el usuario)
⛔ No tienes permiso para este panel  (si no cumple requisitos)
```

## Autorole

| Comando | Descripción | Permisos |
|---|---|---|
| `/autorole add @rol` | Asigna rol automáticamente a nuevos miembros | MANAGE_ROLES |
| `/autorole add @rol --bots` | Rol para bots que entren al servidor | MANAGE_ROLES |
| `/autorole remove @rol` | Quita rol del autorole | MANAGE_ROLES |
| `/autorole list` | Lista roles del autorole | MANAGE_ROLES |
| `/autorole delay segundos` | Retraso antes de asignar el rol (evita raids) | MANAGE_ROLES |

### Ejemplo de configuración autorole

```
Sin verificar: @Visitante (al entrar)
Tras verificar: @Miembro  (al pulsar botón de verificación)
Bots:          @Bot       (automático si es bot)
```

## Gestión manual de roles

| Comando | Descripción | Permisos |
|---|---|---|
| `/role give @user @rol` | Asigna un rol manualmente | MANAGE_ROLES |
| `/role take @user @rol` | Quita un rol manualmente | MANAGE_ROLES |
| `/role info @rol` | Info del rol: permisos, miembros, color, fecha | Todos |
| `/role members @rol` | Lista de usuarios con ese rol (paginado) | Todos |
| `/role color @rol #hexcolor` | Cambia el color del rol | MANAGE_ROLES |
| `/role mass give @rol` | Da un rol a todos los miembros del servidor | ADMINISTRATOR |
| `/role mass take @rol` | Quita un rol a todos los miembros | ADMINISTRATOR |

## Canales de roles exclusivos por nivel

Combinando reaction roles con el sistema de niveles:

```
Panel "Acceso según nivel":
  Nivel 10 → @Acceso-Zona-1
  Nivel 25 → @Acceso-Zona-2
  Nivel 50 → @Acceso-Zona-VIP

Si el usuario no tiene el nivel, el bot responde:
"❌ Necesitas nivel 10 para obtener este rol (tienes nivel 7)"
```

## Estructura de archivos

```
src/commands/roles/
├── rr/
│   ├── create.js
│   ├── add.js
│   ├── remove.js
│   ├── edit.js
│   ├── mode.js
│   ├── require.js
│   ├── delete.js
│   └── list.js
├── autorole.js
├── give.js
├── take.js
├── info.js
└── mass.js

src/events/
└── interactionCreate.js  # Maneja pulsaciones de botones del panel

src/utils/
└── rolePanel.js          # Gestión de paneles, crear/actualizar mensajes

src/models/
└── RolePanel.js          # Schema: paneles, botones, configuración
```
