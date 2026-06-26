# 🔗 Integraciones externas

Alertas y feeds de plataformas externas directamente en canales de Discord. Todas las integraciones son opcionales y se configuran por separado.

## Twitch

Notificaciones cuando un streamer se pone en directo.

| Comando | Descripción | Permisos |
|---|---|---|
| `/twitch add streamer #canal` | Activa alertas de un streamer en ese canal | MANAGE_GUILD |
| `/twitch remove streamer` | Desactiva las alertas de ese streamer | MANAGE_GUILD |
| `/twitch list` | Lista streamers configurados en el servidor | MANAGE_GUILD |
| `/twitch message streamer texto` | Personaliza el mensaje de la alerta | MANAGE_GUILD |
| `/twitch mention streamer @rol` | Rol que se menciona cuando va en directo | MANAGE_GUILD |

### Embed de alerta de Twitch

```
╔══════════════════════════════════════╗
║  🔴 AHORA EN DIRECTO                 ║
║                                      ║
║  [Avatar]  Days16                    ║
║                                      ║
║  🎮 Jugando a: Elden Ring            ║
║  📺 Título:  ¡Speedrun SIN MORIR!    ║
║  👥 Viewers: 342                     ║
║                                      ║
║  [Ver en Twitch →]                   ║
╚══════════════════════════════════════╝
```

Se actualiza cuando el streamer cambia de juego o termina el directo.

**Requiere:** `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` en `.env`

---

## YouTube

Notificación cuando un canal sube un nuevo vídeo o estreno.

| Comando | Descripción | Permisos |
|---|---|---|
| `/youtube add canal_id #canal` | Activa alertas de un canal de YouTube | MANAGE_GUILD |
| `/youtube remove canal_id` | Desactiva las alertas | MANAGE_GUILD |
| `/youtube list` | Lista canales configurados | MANAGE_GUILD |

### Embed de nuevo vídeo

```
╔══════════════════════════════════════╗
║  ▶ NUEVO VÍDEO                       ║
║                                      ║
║  [Miniatura]                         ║
║                                      ║
║  📹 Título del vídeo                 ║
║  📺 Canal: NombreDelCanal            ║
║  ⏱ Duración: 12:34                  ║
║  👁 Vistas: 1.2K                     ║
║                                      ║
║  [Ver en YouTube →]                  ║
╚══════════════════════════════════════╝
```

Comprobación automática cada 10 minutos via YouTube Data API v3.

**Requiere:** `YOUTUBE_API_KEY` en `.env`

---

## GitHub

Alertas de actividad en repositorios de GitHub.

| Comando | Descripción | Permisos |
|---|---|---|
| `/github add usuario/repo #canal` | Activa alertas del repositorio | MANAGE_GUILD |
| `/github remove usuario/repo` | Desactiva las alertas | MANAGE_GUILD |
| `/github events repo push,pr,issue` | Filtra qué eventos notificar | MANAGE_GUILD |
| `/github list` | Lista repos configurados | MANAGE_GUILD |

### Eventos soportados

| Evento | Descripción |
|---|---|
| `push` | Nuevo commit o push a una rama |
| `pr` | Pull request abierta, cerrada o mergeada |
| `issue` | Issue abierta, cerrada o comentada |
| `release` | Nueva release publicada |
| `star` | Alguien da ⭐ al repo |

### Embed de push

```
╔══════════════════════════════════════╗
║  📦 Push en Days16/Jarvis-FavBot            ║
║                                      ║
║  Rama: main                          ║
║  Autor: @Days16                      ║
║                                      ║
║  • feat: añadir sistema de sorteos   ║
║  • fix: cooldown del /daily          ║
║  • docs: actualizar README           ║
║                                      ║
║  [Ver en GitHub →]                   ║
╚══════════════════════════════════════╝
```

**Requiere:** `GITHUB_TOKEN` en `.env`

---

## RSS — Feeds personalizados

Suscripción a cualquier feed RSS/Atom.

| Comando | Descripción | Permisos |
|---|---|---|
| `/rss add url #canal` | Suscribe al feed RSS en ese canal | MANAGE_GUILD |
| `/rss remove url` | Desactiva el feed | MANAGE_GUILD |
| `/rss list` | Lista feeds activos | MANAGE_GUILD |
| `/rss interval minutos` | Cada cuántos minutos comprobar (mín. 5) | MANAGE_GUILD |

Casos de uso: blog propio, noticias de gaming, actualizaciones de un juego, notas de parche.

---

## Reddit — Feed de subreddit

| Comando | Descripción | Permisos |
|---|---|---|
| `/reddit add r/subreddit #canal` | Posts nuevos del subreddit en el canal | MANAGE_GUILD |
| `/reddit remove r/subreddit` | Desactiva el feed | MANAGE_GUILD |
| `/reddit filter tipo` | Filtra por: hot, new, top, rising | MANAGE_GUILD |
| `/reddit nsfw on/off` | Permitir o bloquear contenido NSFW | MANAGE_GUILD |

**Requiere:** `REDDIT_CLIENT_ID` y `REDDIT_CLIENT_SECRET` en `.env`

---

## Steam — Alertas de ofertas

| Comando | Descripción | Permisos |
|---|---|---|
| `/steam wishlist url #canal` | Alerta cuando un juego de la wishlist baja de precio | MANAGE_GUILD |
| `/steam remove` | Desactiva las alertas de Steam | MANAGE_GUILD |
| `/steam deal juego` | Busca el mejor precio actual de un juego | Todos |

### Embed de oferta

```
╔══════════════════════════════════════╗
║  💸 OFERTA EN STEAM                  ║
║                                      ║
║  [Portada]  Nombre del juego         ║
║                                      ║
║  Precio original:  29,99€            ║
║  Precio con oferta: 9,99€  (-67%)   ║
║                                      ║
║  Termina en: 2 días 4 horas          ║
║                                      ║
║  [Ver en Steam →]                    ║
╚══════════════════════════════════════╝
```

**Requiere:** `STEAM_API_KEY` en `.env`

---

## Estructura de archivos

```
src/commands/integrations/
├── twitch.js
├── youtube.js
├── github.js
├── rss.js
├── reddit.js
└── steam.js

src/services/          # Workers que comprueban periódicamente
├── twitchPoller.js    # Usa EventSub de Twitch para webhooks en tiempo real
├── youtubePoller.js   # Comprueba cada 10 min via YouTube API
├── githubPoller.js    # Webhooks de GitHub o polling
├── rssPoller.js       # Comprueba feeds RSS cada N minutos
├── redditPoller.js    # Comprueba subreddits via Reddit API
└── steamPoller.js     # Comprueba precios cada hora

src/models/
├── TwitchAlert.js
├── YouTubeAlert.js
├── GitHubAlert.js
├── RSSFeed.js
├── RedditFeed.js
└── SteamWishlist.js
```
