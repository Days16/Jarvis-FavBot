# 🎵 Música

Stack: Distube v4 + @distube/youtube + play-dl para conversión de Spotify. Panel de control con botones para no necesitar comandos mientras escuchas.

## Dependencias

```bash
npm install distube @distube/youtube play-dl
```

## Comandos

| Comando | Descripción |
|---|---|
| `/play búsqueda_o_url` | Reproduce o añade a la cola. Acepta YouTube, SoundCloud, Spotify |
| `/stop` | Para la música y vacía la cola |
| `/skip` | Salta a la siguiente canción |
| `/skip n` | Salta N canciones de golpe |
| `/pause` | Pausa la reproducción |
| `/resume` | Reanuda la reproducción |
| `/queue` | Muestra la cola con paginación |
| `/queue remove n` | Elimina la canción número N de la cola |
| `/queue clear` | Vacía la cola pero sigue reproduciendo la canción actual |
| `/nowplaying` | Embed con portada, barra de progreso y tiempo restante |
| `/volume n` | Ajusta el volumen (0-150) |
| `/seek tiempo` | Avanza o retrocede. Formato: 1:30 o 90s |
| `/loop` | Alterna entre: sin loop → canción → cola → sin loop |
| `/shuffle` | Mezcla aleatoriamente el orden de la cola |
| `/move n posición` | Mueve una canción a otra posición en la cola |
| `/filter nombre` | Activa un efecto de audio |
| `/filter off` | Desactiva todos los filtros |
| `/filters` | Lista todos los filtros disponibles |
| `/lyrics` | Muestra la letra de la canción actual |
| `/playlist save nombre` | Guarda la cola como playlist |
| `/playlist load nombre` | Carga una playlist guardada |
| `/playlist list` | Lista tus playlists guardadas |
| `/playlist delete nombre` | Elimina una playlist |

## Fuentes soportadas

| Fuente | Tipo | Notas |
|---|---|---|
| YouTube | URL / búsqueda | Playlists de YT también soportadas |
| SoundCloud | URL | Canciones y playlists |
| Spotify | URL | Convertido a búsqueda de YouTube via play-dl |
| Búsqueda directa | Texto | Busca en YouTube automáticamente |

### Soporte Spotify

Distube no puede reproducir directamente desde Spotify (API restringida). `play-dl` extrae el nombre y artista del link y busca en YouTube automáticamente.

```
Usuario: /play https://open.spotify.com/track/xxxxx
Bot:     🔍 Buscando "Song Name - Artist" en YouTube...
         ▶ Reproduciendo: Song Name - Artist (YouTube)
```

## Panel de control (mensaje fijo)

Al empezar a reproducir se crea un mensaje fijo en el canal con botones:

```
╔══════════════════════════════════════════╗
║  🎵 Ahora reproduciendo                  ║
║                                          ║
║  Song Name                               ║
║  Artista · Álbum                         ║
║                                          ║
║  ████████████░░░░░░  2:34 / 4:12        ║
║                                          ║
║  [⏮] [⏯] [⏭] [🔀] [🔁] [🔊] [🔉]      ║
║                                          ║
║  Cola: 3 canciones · Vol: 80%            ║
╚══════════════════════════════════════════╝
```

El panel se actualiza automáticamente con cada nueva canción.

## Filtros de audio

Implementados con ffmpeg a través de Distube:

| Filtro | Descripción |
|---|---|
| `bassboost` | Potencia los graves |
| `nightcore` | Sube el pitch y acelera |
| `vaporwave` | Baja el pitch y ralentiza |
| `8d` | Efecto de audio 8D (binaural) |
| `karaoke` | Intenta eliminar la voz principal |
| `echo` | Añade eco al audio |
| `distort` | Distorsión del audio |
| `mono` | Convierte a mono |
| `normalizer` | Normaliza el volumen |

Solo se puede activar un filtro a la vez.

## Sistema de votación para skip

En servidores grandes, `/skip` puede requerir votación:

```
Configurable: si hay más de N usuarios en el canal de voz,
el skip requiere que el X% vote a favor.

Por defecto: desactivado
```

## Embed de nowplaying

```
╔══════════════════════════════╗
║  🎵 Ahora reproduciendo      ║
║                              ║
║  [Portada]  Song Name        ║
║             Artista          ║
║             Álbum · Año      ║
║                              ║
║  ███████░░░░░░░  1:45 / 4:12 ║
║                              ║
║  🔁 Sin loop  🔀 Sin mezcla  ║
║  🔊 Volumen: 80%             ║
║                              ║
║  Solicitado por @Days16      ║
╚══════════════════════════════╝
```

## Playlists de usuario

Las playlists se guardan por usuario en MongoDB:

```javascript
{
  userId: "123456789",
  guildId: "987654321",
  name: "Mi playlist",
  tracks: [
    { title: "Song 1", url: "https://...", duration: 240 },
    { title: "Song 2", url: "https://...", duration: 180 },
  ],
  createdAt: Date
}
```

## Configuración por servidor

| Parámetro | Por defecto | Descripción |
|---|---|---|
| Volumen por defecto | 80 | Volumen al iniciar |
| Auto-leave | 3 min | Sale del canal si lleva X min solo |
| Auto-leave vacío | 1 min | Sale si el canal se vacía |
| Max duración canción | 60 min | Rechaza canciones más largas |
| Max canciones en cola | 100 | Límite de la cola |
| Roles permitidos | Todos | Qué roles pueden usar el bot |
| Canal de música | Cualquiera | Si se configura, solo responde en ese canal |

## Estructura de archivos

```
src/commands/music/
├── play.js
├── stop.js
├── skip.js
├── pause.js
├── resume.js
├── queue.js
├── nowplaying.js
├── volume.js
├── seek.js
├── loop.js
├── shuffle.js
├── move.js
├── filter.js
├── filters.js
├── lyrics.js
└── playlist.js

src/events/
└── distube/         # Eventos de Distube (playSong, addSong, error, etc.)
    ├── playSong.js
    ├── addSong.js
    ├── finish.js
    └── error.js

src/utils/
└── musicPanel.js    # Gestión del panel de botones

src/models/
└── Playlist.js      # Schema playlists de usuario
```
