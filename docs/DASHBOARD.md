# 🖥 Dashboard web

Panel de administración web en Next.js 14. El admin configura todo el bot desde el navegador sin usar comandos de Discord.

## Stack

| Tecnología | Uso |
|---|---|
| Next.js 14 (App Router) | Framework principal, SSR + Server Components |
| NextAuth.js | Autenticación OAuth2 con Discord |
| Prisma | ORM para la base de datos del dashboard |
| PostgreSQL | Base de datos del dashboard (Railway) |
| Tailwind CSS | Estilos |
| shadcn/ui | Componentes UI |
| Zustand | Estado global del cliente |
| SWR / React Query | Fetching y caché de datos |

## Estructura del dashboard

```
dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/         # Página de login con Discord
│   ├── (dashboard)/
│   │   ├── layout.tsx     # Layout con sidebar y navbar
│   │   ├── page.tsx       # Selector de servidores
│   │   └── [guildId]/
│   │       ├── page.tsx          # Overview del servidor
│   │       ├── moderation/       # Config moderación y automod
│   │       ├── welcome/          # Config bienvenidas
│   │       ├── levels/           # Config niveles y XP
│   │       ├── economy/          # Config economía y tienda
│   │       ├── giveaways/        # Gestión de sorteos
│   │       ├── tickets/          # Panel de tickets
│   │       ├── roles/            # Reaction roles
│   │       ├── music/            # Config música
│   │       ├── ai/               # Config IA
│   │       ├── integrations/     # Twitch, YouTube, etc.
│   │       ├── logs/             # Visor de logs
│   │       └── settings/         # Config general del servidor
├── components/
│   ├── ui/                # Componentes base (shadcn)
│   ├── dashboard/         # Componentes específicos del dashboard
│   └── forms/             # Formularios de configuración
├── lib/
│   ├── auth.ts            # Configuración de NextAuth
│   ├── db.ts              # Cliente de Prisma
│   ├── discord.ts         # Helpers para la API de Discord
│   └── api.ts             # Funciones para comunicarse con el bot
└── prisma/
    └── schema.prisma      # Esquema de la BD del dashboard
```

## Autenticación

Login con Discord OAuth2. Solo pueden acceder los usuarios que son **administradores** del servidor que quieren gestionar.

### Flujo de login

```
Usuario visita /login
    ↓
Pulsa "Iniciar sesión con Discord"
    ↓
Discord OAuth2 (scopes: identify, guilds)
    ↓
El dashboard obtiene los servidores donde el usuario
tiene permisos de MANAGE_GUILD
    ↓
Muestra solo esos servidores en el selector
```

## Páginas del dashboard

### Selector de servidores (`/`)

Muestra todos los servidores donde el usuario tiene permisos de administración y Jarvis-FavBot está instalado.

```
¿En qué servidor quieres gestionar Jarvis-FavBot?

[Icono] Jarvis-FavBot Server        [Gestionar]
[Icono] Otro Servidor        [Gestionar]
[Icono] Mi servidor privado  [Añadir bot →]
```

---

### Overview del servidor (`/[guildId]`)

Estadísticas generales del servidor en tiempo real:

```
Jarvis-FavBot Server — Vista general

[Módulos activos: 12/15]  [Uptime: 99.8%]  [Ping: 45ms]

Stats de hoy:
💬 Mensajes      1.247
👥 Nuevos miembros  8
🎫 Tickets        23
⚠️  Acciones mod    2
🎁 Sorteos         1

Actividad reciente: [feed de últimas acciones]
```

---

### Configuración de moderación (`/[guildId]/moderation`)

- Toggle de cada módulo del automod (antiflood, anti-caps, anti-invite…)
- Sliders para umbrales (mensajes por segundo, % de caps)
- Lista de palabras prohibidas
- Whitelist de roles y canales
- Configuración de warns (umbrales para timeout/ban)
- Canal de logs de moderación

---

### Bienvenidas (`/[guildId]/welcome`)

- Selección de canal de bienvenida
- Editor de texto con preview en tiempo real
- Preview de la imagen de bienvenida
- Upload de imagen de fondo personalizada
- Editor del DM de bienvenida
- Configuración del panel de verificación

---

### Niveles y XP (`/[guildId]/levels`)

- XP mínimo y máximo por mensaje
- Cooldown entre mensajes
- Multiplicadores por rol (tabla editable)
- Multiplicadores por canal (tabla editable)
- Roles de nivel (tabla: nivel → rol)
- Modo de roles (stack o replace)
- Canal de notificaciones de nivel

---

### Economía (`/[guildId]/economy`)

- Nombre y emoji de la moneda
- Cantidades del daily/weekly/work
- Límite del banco
- Gestor de la tienda (añadir/editar/eliminar items)
- Ver balances de todos los usuarios
- Herramienta admin para dar/quitar monedas

---

### Sorteos (`/[guildId]/giveaways`)

- Lista de sorteos activos con su estado
- Crear nuevo sorteo desde el dashboard
- Ver historial de sorteos anteriores
- Reroll de sorteos finalizados

---

### Tickets (`/[guildId]/tickets`)

- Tickets abiertos en tiempo real
- Historial de tickets cerrados con buscador
- Transcripciones descargables
- Stats de staff (tiempo medio, rating)
- Configuración de categorías y canales

---

### IA (`/[guildId]/ai`)

- Selector de modelo activo
- Editor del system prompt / personalidad
- Lista de canales con auto-respuesta activada
- Estadísticas de uso (tokens usados, coste estimado)
- Botón para resetear el contexto de todos los canales

---

### Logs (`/[guildId]/logs`)

Visor de logs con filtros:

```
Tipo:    [Todos ▼]   Usuario: [Buscar...]   Fecha: [Hoy ▼]

[14:32] 🔨 @Admin baneó a @Troll — "Spam"
[14:15] ✏️ @Days16 editó un mensaje en #general
[13:50] 📥 @NuevoUser entró al servidor (via @Days16)
[13:30] 🔴 Ticket #042 cerrado por @Staff1 ⭐⭐⭐⭐⭐
```

---

### Configuración general (`/[guildId]/settings`)

- Prefijo del bot (para comandos de texto legacy)
- Idioma del bot (español, inglés)
- Zona horaria del servidor
- Roles de moderador y administrador del bot
- Canal de comandos (si se quiere restringir)
- Botón de reinicio del bot (solo para el servidor)
- Botón para desvincular el bot del servidor

---

## API interna

El dashboard se comunica con el bot via una API REST interna que el bot expone con Express:

```javascript
// El bot expone una API en el puerto 3001
app.get('/api/guild/:id/stats', authMiddleware, (req, res) => {
  // Devuelve stats del servidor
});

app.post('/api/guild/:id/config', authMiddleware, (req, res) => {
  // Actualiza config en MongoDB
  // Recarga la config en el bot en tiempo real
});
```

El dashboard llama a esta API para leer y escribir datos. La autenticación usa un token compartido en `.env`.

## Deployment en Railway

```
Proyecto Railway:
├── Servicio "Jarvis-FavBot"      → node index.js (bot)
├── Servicio "dashboard"   → next start (dashboard)
└── Servicio "postgresql"  → base de datos del dashboard

Variables de entorno compartidas desde Railway.
MongoDB Atlas conectado externamente.
```
