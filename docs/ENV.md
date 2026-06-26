# ⚙️ Variables de entorno — Jarvis-FavBot

Copia `.env.example` a `.env` y rellena los valores. Las marcadas con `*` son obligatorias para arrancar.

## Bot principal *

```env
# Token del bot — Discord Developer Portal > Tu aplicación > Bot > Token
DISCORD_TOKEN=

# ID de tu aplicación — Discord Developer Portal > Tu aplicación > General Information
CLIENT_ID=

# ID de tu servidor de pruebas (para registrar comandos en modo dev)
GUILD_ID=
```

## Base de datos *

```env
# MongoDB Atlas — cluster0.xxxxx.mongodb.net
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/Jarvis-FavBot
```

## OpenRouter (módulo IA)

Consigue tu API key en https://openrouter.ai

```env
OPENROUTER_API_KEY=sk-or-v1-...

# Modelo por defecto. Opciones recomendadas:
#   meta-llama/llama-3-70b-instruct   (gratis, bueno)
#   openai/gpt-4o                      (pago, mejor)
#   anthropic/claude-3-5-sonnet        (pago, excelente)
#   mistralai/mistral-7b-instruct      (gratis, rápido)
OPENROUTER_MODEL=meta-llama/llama-3-70b-instruct
```

## Integraciones externas

### Twitch

Panel de desarrolladores: https://dev.twitch.tv/console

```env
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```

### YouTube

Google Cloud Console → API & Services → YouTube Data API v3

```env
YOUTUBE_API_KEY=
```

### OpenWeather (comando /weather)

https://openweathermap.org/api — plan gratuito suficiente

```env
OPENWEATHER_API_KEY=
```

### Tenor (GIF reactions)

https://tenor.com/developer/keyregistration

```env
TENOR_API_KEY=
```

### Reddit (memes y feed)

Crear app en https://www.reddit.com/prefs/apps

```env
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=Jarvis-FavBot/1.0
```

### GitHub (alertas de repos)

GitHub Settings → Developer settings → Personal access tokens

```env
GITHUB_TOKEN=ghp_...
```

### Steam (alertas de wishlist)

https://store.steampowered.com/account — necesitas tu Steam API key

```env
STEAM_API_KEY=
```

## Dashboard web (Next.js)

```env
# OAuth2 secret — Discord Developer Portal > Tu app > OAuth2 > Client Secret
DISCORD_CLIENT_SECRET=

# String aleatorio para cifrar sesiones de NextAuth
# Genera uno con: openssl rand -base64 32
NEXTAUTH_SECRET=

# URL donde se despliega el dashboard
NEXTAUTH_URL=http://localhost:3000

# Base de datos para el dashboard (PostgreSQL en Railway)
DATABASE_URL=postgresql://usuario:contraseña@host:5432/Jarvis-FavBot_dashboard
```

## Configuración general del bot

```env
# Prefijo de fallback para comandos de texto (además de slash commands)
BOT_PREFIX=!

# ID del canal de logs de moderación por defecto (se puede sobreescribir por servidor)
DEFAULT_LOG_CHANNEL=

# Máximo de canales privados por usuario
MAX_PRIVATE_CHANNELS=3

# Días sin actividad antes de borrar un canal privado automáticamente
PRIVATE_CHANNEL_INACTIVITY_DAYS=7

# Límite de tokens de contexto para el chat de IA
AI_CONTEXT_MESSAGES=10

# Número de mensajes máximo que resume /ai summary
AI_SUMMARY_LIMIT=50
```

## Ejemplo de .env completo mínimo

```env
DISCORD_TOKEN=MTxxxxxxxxxxxxxxxxxxxxxxx.Gyyyyy.zzzzzzzzzzzzzzzzzzzzzzzzzz
CLIENT_ID=123456789012345678
GUILD_ID=987654321098765432
MONGODB_URI=mongodb+srv://Jarvis-FavBot:mipassword@cluster0.abcde.mongodb.net/Jarvis-FavBot
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=meta-llama/llama-3-70b-instruct
```

## Notas de seguridad

- **Nunca subas `.env` a GitHub.** Está en `.gitignore` por defecto.
- Rota los tokens si los expones accidentalmente — Discord invalida automáticamente los tokens detectados en repositorios públicos.
- Para producción usa las variables de entorno del panel de Railway, no el archivo `.env`.
- El `NEXTAUTH_SECRET` debe ser diferente en desarrollo y producción.
