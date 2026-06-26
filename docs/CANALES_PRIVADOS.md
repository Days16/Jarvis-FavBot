# 🔒 Canales privados

Sistema de canales privados con dos modalidades: cuartos personales de usuario y grupos exclusivos. Feature diferenciador que ningún bot grande ofrece de forma integrada.

## Tipo 1 — Cuartos privados de usuario

Cada usuario puede crear su propio canal de texto privado. Solo ellos y quien inviten pueden verlo y escribir en él.

### Comandos

| Comando | Descripción | Notas |
|---|---|---|
| `/private create [nombre]` | Crea tu canal privado `#tu-nombre` | Máx. configurable por servidor |
| `/private invite @user` | Invita a alguien a tu canal | Recibe permiso de leer y escribir |
| `/private kick @user` | Expulsa a alguien de tu canal | No pueden volver hasta que les reinvites |
| `/private name nuevo_nombre` | Renombra tu canal | Límite: 2 veces al día |
| `/private close` | Elimina tu canal privado | Acción irreversible |
| `/private list` | Lista tus canales y sus miembros actuales | |
| `/private info` | Info del canal: miembros, fecha creación, mensajes | |
| `/private topic texto` | Cambia el topic/descripción del canal | |

### Ejemplo de flujo

```
/private create mi-cuarto
→ Bot crea #mi-cuarto en la categoría "Canales privados"
→ Permisos: @everyone = deny, @Days16 = allow (read + send)
→ Bot envía embed de bienvenida con comandos útiles

/private invite @amigo
→ @amigo recibe permiso de read + send en #mi-cuarto
→ Bot notifica en el canal: "👤 @amigo fue invitado al canal"

/private kick @amigo
→ Se revocan los permisos de @amigo
→ @amigo ya no puede ver el canal
```

### Límites y reglas

| Configuración | Valor por defecto | Configurable |
|---|---|---|
| Canales privados por usuario | 2 | Sí (dashboard) |
| Usuarios por canal | 10 | Sí (dashboard) |
| Cambios de nombre al día | 2 | Sí |
| Inactividad antes de borrar | 7 días | Sí |
| Requiere nivel mínimo | Nivel 5 | Sí |

### Seguridad y privacidad

- **El staff siempre puede ver** los canales privados en modo auditoría (permiso de `VIEW_CHANNEL` sin `SEND_MESSAGES`).
- Los moderadores reciben alerta si se detecta contenido que activa el automod en un canal privado.
- Los canales privados aparecen en los logs de moderación si hay acciones.
- El usuario NO puede bloquear al staff de ver su canal. Esto es por diseño para evitar uso indebido.

### Auto-delete por inactividad

```
Día 5 sin mensajes → aviso DM al propietario
Día 7 sin mensajes → canal eliminado automáticamente
                     (los mensajes no se guardan)
```

---

## Tipo 2 — Canales de grupos exclusivos

Canales cerrados para grupos de usuarios o para roles específicos del servidor. Dos sub-tipos:

### 2A — Grupos de usuario (club privado)

Un usuario con permiso puede crear un grupo y invitar a quien quiera. Tiene sistema de administración interno.

| Comando | Descripción | Quién puede |
|---|---|---|
| `/group create nombre` | Crea un grupo con su canal `#grupo-nombre` | Nivel mínimo o rol requerido |
| `/group invite @user` | Invita a alguien al grupo | Creador / admin del grupo |
| `/group kick @user` | Expulsa a alguien del grupo | Creador / admin del grupo |
| `/group promote @user` | Da permisos de admin del grupo a otro miembro | Solo creador |
| `/group demote @user` | Quita los permisos de admin | Solo creador |
| `/group leave` | Sales del grupo voluntariamente | Cualquier miembro |
| `/group disband` | Disuelve el grupo y elimina el canal | Solo creador o staff |
| `/group list` | Lista los grupos del servidor y su estado público/privado | Todos |
| `/group info nombre` | Miembros del grupo, fecha de creación, actividad | Todos |
| `/group transfer @user` | Transfiere la propiedad del grupo a otro miembro | Solo creador |

#### Visibilidad de grupos

Los grupos pueden ser:
- **Privados**: nadie puede ver el canal, invitación solo por el creador
- **Públicos**: el canal es visible para todos pero solo miembros pueden escribir
- **Con solicitud**: cualquiera puede pedir unirse, el admin aprueba o rechaza

#### Log de accesos de grupo

Cada acción de un grupo queda registrada internamente:

```
[14:32] @Days16 creó el grupo "Los Cracks"
[14:35] @Days16 invitó a @User2
[15:10] @User2 fue expulsado por @Days16
[16:00] @User3 se unió por solicitud aprobada
```

---

### 2B — Canales exclusivos por rol

El administrador crea canales que solo puede ver y usar quien tenga un rol específico.

| Comando | Descripción | Permisos |
|---|---|---|
| `/rolechannel create #canal @rol` | Crea canal visible solo para ese rol | MANAGE_CHANNELS |
| `/rolechannel add #canal @rol` | Añade acceso de un rol a un canal existente | MANAGE_CHANNELS |
| `/rolechannel remove #canal @rol` | Quita el acceso de un rol al canal | MANAGE_CHANNELS |
| `/rolechannel list` | Lista todos los canales exclusivos del servidor | MANAGE_CHANNELS |

#### Casos de uso típicos

- `#vip-chat` — solo para rol @VIP (compradores, suscriptores)
- `#nitro-exclusivo` — solo para boosters del servidor
- `#staff-privado` — solo para moderadores y admins
- `#beta-testers` — solo para quienes tienen el rol @Beta

---

## Categorías en Discord

Los canales privados se crean en categorías separadas para mantener el orden:

```
📁 CUARTOS PRIVADOS
   🔒 #mi-cuarto-days16
   🔒 #cuarto-de-user2

📁 GRUPOS
   🔒 #grupo-los-cracks
   🔒 #grupo-dev-team

📁 CANALES VIP
   💎 #vip-chat
   🚀 #nitro-lounge
```

## Estructura de archivos

```
src/commands/private/
├── create.js
├── invite.js
├── kick.js
├── name.js
├── close.js
├── list.js
└── info.js

src/commands/private/group/
├── create.js
├── invite.js
├── kick.js
├── promote.js
├── leave.js
├── disband.js
└── list.js

src/commands/private/rolechannel/
├── create.js
├── add.js
├── remove.js
└── list.js

src/utils/
└── privateChannelManager.js  # Crear/eliminar canales, gestionar permisos

src/models/
├── PrivateChannel.js  # Schema cuartos de usuario
└── Group.js           # Schema grupos
```
