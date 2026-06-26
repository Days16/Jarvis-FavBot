# 🔧 Utilidades

Comandos de utilidad general que no encajan en otros módulos pero son esenciales para el día a día del servidor.

## Embed builder

| Comando | Descripción |
|---|---|
| `/embed create` | Abre el constructor de embeds interactivo |
| `/embed send #canal` | Envía el embed construido al canal indicado |
| `/embed edit messageID` | Edita un embed existente enviado por el bot |
| `/embed json` | Exporta el embed actual como JSON |
| `/embed import json` | Importa un embed desde JSON |

### Campos del embed builder

- Título (max 256 chars)
- Descripción (max 4096 chars, soporta markdown)
- Color (selector de color HEX)
- URL del título (link al hacer clic en el título)
- Autor (nombre + URL + icono)
- Footer (texto + icono)
- Imagen grande (URL)
- Thumbnail (URL, imagen pequeña esquina derecha)
- Campos (hasta 25: nombre, valor, inline o no)
- Timestamp (fecha/hora actual o personalizada)

---

## Recordatorios

| Comando | Descripción |
|---|---|
| `/remind tiempo texto` | Recordatorio personal por DM o mención |
| `/remind list` | Lista tus recordatorios pendientes |
| `/remind cancel ID` | Cancela un recordatorio |

### Formato de tiempo

```
/remind 30m Revisar el PR de GitHub
/remind 2h Reunión con el equipo
/remind 1d Renovar el dominio
/remind 1w Publicar el devlog
/remind 2026-07-01 Lanzamiento de Jarvis-FavBot

→ Bot responde: ✅ Te recordaré "Revisar el PR de GitHub" en 30 minutos
```

El recordatorio llega por DM o mención en el canal donde se usó el comando (configurable).

---

## Encuestas rápidas

| Comando | Descripción |
|---|---|
| `/poll yesno pregunta` | Encuesta sí/no con reacciones 👍👎 |
| `/poll create pregunta [duración]` | Encuesta con botones y barra de progreso |
| `/poll end ID` | Finaliza una encuesta antes de tiempo |

---

## Información

| Comando | Descripción |
|---|---|
| `/userinfo [@user]` | Info completa del usuario |
| `/serverinfo` | Info del servidor |
| `/roleinfo @rol` | Info del rol |
| `/channelinfo [#canal]` | Info del canal |
| `/avatar [@user]` | Avatar en máxima resolución + link |
| `/banner [@user]` | Banner del usuario (requiere Nitro) |
| `/icon` | Icono del servidor en máxima resolución |
| `/botinfo` | Info de Jarvis-FavBot: versión, uptime, stats |
| `/ping` | Latencia del bot y de la API de Discord |
| `/uptime` | Tiempo que lleva el bot en línea |

### Embed de /userinfo

```
👤 Información de @Days16

ID:             123456789012345678
Creado:         15/01/2024 (532 días)
En el servidor: 01/03/2025 (117 días)
Boost:          Sí 🚀 (desde 15/04/2025)

Roles (5): @Admin @Veterano @Gamer @Miembro @Verificado

Estado:    🟢 En línea
Actividad: 🎮 Jugando a Elden Ring
Badges:    🏠 Early Supporter  🐛 Bug Hunter
```

### Embed de /serverinfo

```
🏰 Jarvis-FavBot Server

ID:       987654321098765432
Dueño:    @Admin
Región:   Europa
Creado:   01/01/2024 (177 días)
Boost:    Tier 2 (9 boosts activos) 🚀

Miembros: 342 (330 usuarios + 12 bots)
Online:   87 ahora mismo

Canales: 45 total
  💬 Texto:  32
  🔊 Voz:   10
  📁 Categ: 8

Roles:    28
Emojis:   64 (32 animados)
Stickers: 15

Verificación: Media
2FA obligatorio: Solo para mods
```

---

## Conversores y calculadoras

| Comando | Descripción |
|---|---|
| `/calculate expresión` | Calculadora: soporta operaciones complejas, trigonometría |
| `/convert cantidad unidad_origen unidad_destino` | Conversor de unidades |
| `/currency cantidad moneda_origen moneda_destino` | Conversor de divisas (tasa en tiempo real) |
| `/weather ciudad` | Clima actual y previsión 3 días |
| `/translate texto idioma` | Traducción rápida (sin IA, más barato) |
| `/color #hexcode` | Info de un color: HEX, RGB, HSL y vista previa |
| `/timestamp fecha` | Convierte una fecha a timestamp de Discord `<t:xxxx:R>` |

### Ejemplos

```
/calculate 2^10 + sqrt(144) - sin(45)
→ 1024 + 12 - 0.707 = 1035.29

/convert 100 km millas
→ 100 kilómetros = 62.14 millas

/currency 500 EUR USD
→ 500 € = 541.50 $ (tasa: 1€ = 1.083$)

/color #5B4FD4
→ Previsualización del color
   HEX: #5B4FD4
   RGB: 91, 79, 212
   HSL: 244°, 59%, 57%
```

---

## Buscar en el servidor

| Comando | Descripción |
|---|---|
| `/find user nombre` | Busca usuarios por nombre parcial |
| `/find role nombre` | Busca roles por nombre parcial |
| `/find emoji nombre` | Busca emojis del servidor por nombre |

---

## Comandos de texto / diversión rápida

| Comando | Descripción |
|---|---|
| `/say texto` | El bot repite el texto (elimina tu mensaje original) |
| `/say #canal texto` | El bot envía el mensaje en otro canal |
| `/announce texto` | Anuncia con @everyone en el canal configurado |
| `/mock texto` | CoNvIeRtE eL tExTo A mOcKiNg CaSe |
| `/reverse texto` | otsxeT le etrevnoc — Invierte el texto |
| `/big texto` | 🅱🅸🅶 — Convierte a emojis de letras |
| `/clap texto` | Añade 👏 entre 👏 cada 👏 palabra |

---

## Estructura de archivos

```
src/commands/utils/
├── embed/
│   ├── create.js
│   ├── send.js
│   └── edit.js
├── remind.js
├── info/
│   ├── userinfo.js
│   ├── serverinfo.js
│   ├── roleinfo.js
│   ├── channelinfo.js
│   ├── avatar.js
│   ├── banner.js
│   ├── botinfo.js
│   └── ping.js
├── tools/
│   ├── calculate.js
│   ├── convert.js
│   ├── currency.js
│   ├── weather.js
│   ├── translate.js
│   ├── color.js
│   └── timestamp.js
└── text/
    ├── say.js
    ├── mock.js
    ├── reverse.js
    └── announce.js

src/models/
└── Reminder.js    # Recordatorios pendientes
```
