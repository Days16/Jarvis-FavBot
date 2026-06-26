# ⚡ Jarvis-FavBot

Bot de Discord todo en uno para comunidades multipropósito. Combina los mejores features de MEE6, Carl-bot, Dyno y Groovy en un solo bot propio, con IA real integrada via OpenRouter.

## ✨ Características

- 🛡 **Moderación completa** — ban, kick, warn, antiflood, antiraid, automod
- 🎫 **Tickets** — soporte profesional con transcripciones y stats
- 🎁 **Sorteos** — requisitos, pesos, múltiples ganadores, countdown en vivo
- 🏅 **Niveles y XP** — voz + mensajes, prestige, tarjetas canvas
- 🔒 **Canales privados** — cuartos de usuario y grupos exclusivos
- 💰 **Economía** — tienda, inventario, juegos de azar
- 🎵 **Música** — YouTube, SoundCloud, Spotify, efectos de audio
- 🎭 **Reaction roles** — botones, menús, grupos exclusivos
- 🤖 **IA OpenRouter** — chat contextual, resumen, imágenes, toxicidad
- 🎮 **Entretenimiento** — trivia, minijuegos, memes, encuestas
- 🔗 **Integraciones** — Twitch, YouTube, GitHub, RSS, Steam
- 📊 **Estadísticas** — logs completos, contadores, invitaciones
- 🖥 **Dashboard web** — Next.js 14 + Discord OAuth2

## 🛠 Stack

| Tecnología | Uso |
|---|---|
| Node.js 20 LTS | Runtime |
| discord.js v14 | API de Discord |
| MongoDB + Mongoose | Base de datos principal |
| Distube v4 | Reproducción de música |
| @napi-rs/canvas | Tarjetas de perfil e imágenes |
| OpenRouter API | IA: GPT-4o, Claude, Llama, Mistral |
| Axios | HTTP: integraciones externas |
| node-schedule | Tareas programadas |
| Next.js 14 | Dashboard web |
| NextAuth.js | OAuth2 con Discord |

## 🚀 Instalación rápida

```bash
# 1. Clonar y entrar
git clone https://github.com/TU_USER/Jarvis-FavBot.git
cd Jarvis-FavBot

# 2. Instalar dependencias
npm install

# 3. Copiar y rellenar variables de entorno
cp .env.example .env
# → Edita .env con tus tokens

# 4. Registrar slash commands en Discord
node deploy-commands.js

# 5. Arrancar el bot
node index.js
# o en desarrollo:
npm run dev
```

## 📁 Estructura del proyecto

```
Jarvis-FavBot/
├── src/
│   ├── commands/
│   │   ├── mod/          # Moderación y automod
│   │   ├── tickets/      # Sistema de tickets
│   │   ├── giveaways/    # Sorteos
│   │   ├── levels/       # XP y rangos
│   │   ├── economy/      # Economía y tienda
│   │   ├── music/        # Reproducción de audio
│   │   ├── private/      # Canales privados
│   │   ├── roles/        # Reaction roles y gestión
│   │   ├── ai/           # IA via OpenRouter
│   │   ├── fun/          # Entretenimiento y juegos
│   │   ├── integrations/ # Twitch, YouTube, GitHub...
│   │   ├── welcome/      # Bienvenidas y verificación
│   │   ├── stats/        # Logs y estadísticas
│   │   └── utils/        # Utilidades generales
│   ├── events/           # Eventos de Discord
│   ├── handlers/         # Cargador de comandos/eventos
│   ├── models/           # Schemas de MongoDB
│   └── utils/            # Helpers compartidos
├── dashboard/            # Next.js 14 (panel web)
├── docs/                 # Documentación de módulos
├── index.js              # Entry point
├── deploy-commands.js    # Registrar slash commands
├── .env.example
└── package.json
```

## 📖 Documentación

Cada módulo tiene su propio archivo de documentación en `/docs/`:

- [Moderación](docs/MODERACION.md)
- [Tickets](docs/TICKETS.md)
- [Sorteos](docs/SORTEOS.md)
- [Niveles y XP](docs/NIVELES.md)
- [Canales Privados](docs/CANALES_PRIVADOS.md)
- [Economía](docs/ECONOMIA.md)
- [Música](docs/MUSICA.md)
- [Reaction Roles](docs/REACTION_ROLES.md)
- [Inteligencia Artificial](docs/IA.md)
- [Entretenimiento](docs/ENTRETENIMIENTO.md)
- [Integraciones](docs/INTEGRACIONES.md)
- [Bienvenidas](docs/BIENVENIDAS.md)
- [Estadísticas y Logs](docs/STATS.md)
- [Utilidades](docs/UTILS.md)
- [Dashboard Web](docs/DASHBOARD.md)
- [Schemas MongoDB](docs/SCHEMAS.md)
- [Variables de Entorno](docs/ENV.md)
- [Roadmap](docs/ROADMAP.md)

## ⚙️ Variables de entorno requeridas

Ver [docs/ENV.md](docs/ENV.md) para la guía completa.

Mínimo para arrancar:

```env
DISCORD_TOKEN=
CLIENT_ID=
MONGODB_URI=
```

## 📜 Licencia

MIT — úsalo, modifícalo y distribúyelo libremente.
