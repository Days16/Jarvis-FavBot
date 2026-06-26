# 🎮 Entretenimiento y minijuegos

Módulo de diversión con trivia, juegos multijugador, memes, encuestas y reactions. Diseñado para mantener activa a la comunidad.

## Trivia

| Comando | Descripción |
|---|---|
| `/trivia` | Pregunta aleatoria de trivia con 4 opciones y 20s para responder |
| `/trivia categoria` | Trivia de una categoría específica |
| `/trivia battle @user` | Duelo 1vs1: primero en responder 5 correctas gana |
| `/trivia categorias` | Lista todas las categorías disponibles |
| `/trivia stats [@user]` | Tus estadísticas de trivia: aciertos, racha, ranking |
| `/trivia leaderboard` | Ranking de trivia del servidor |

### Categorías de trivia

- 🔬 Ciencia y tecnología
- 🌍 Geografía
- 📖 Historia
- 🎮 Videojuegos
- 🎬 Cine y series
- 🎵 Música
- ⚽ Deportes
- 🦁 Naturaleza y animales
- 🍕 Gastronomía
- 🧮 Matemáticas
- 🎨 Arte y cultura
- 🌐 Internet y memes

### Embed de trivia

```
❓ TRIVIA — Videojuegos

¿En qué año salió The Legend of Zelda: Ocarina of Time?

[A] 1996   [B] 1998   [C] 2000   [D] 2001

⏱ 20 segundos · Dificultad: Media
```

Al responder correctamente: +XP y +monedas (configurables).

## Juegos multijugador

| Comando | Descripción |
|---|---|
| `/connect4 @user` | 4 en raya. Turnos con botones, 30s por turno |
| `/tictactoe @user` | Tres en raya. 3x3 con botones |
| `/rps @user` | Piedra, papel o tijera. También funciona vs el bot |
| `/wordle` | Adivina la palabra en 6 intentos. Nueva palabra cada día |
| `/hangman` | El ahorcado. Letras con botones, 8 vidas |

### 4 en raya (connect4)

```
         1  2  3  4  5  6  7
         ·  ·  ·  ·  ·  ·  ·
         ·  ·  ·  ·  ·  ·  ·
         ·  ·  ·  🟡  ·  ·  ·
         ·  ·  🔴 🟡  ·  ·  ·
         ·  🔴 🟡 🔴  ·  ·  ·
         🔴 🟡 🔴 🟡  ·  ·  ·

Turno de @Days16 (🔴) · 30s restantes
[1] [2] [3] [4] [5] [6] [7]
```

Si un jugador no responde en 30s, pierde su turno. Dos turnos perdidos = derrota.

### Wordle

```
Intento 1: PISTA
  P 🟨  I ⬛  S 🟩  T ⬛  A 🟨

Intento 2: SALSA
  S 🟨  A 🟩  L ⬛  S 🟩  A 🟨

Quedan 4 intentos. Escribe tu siguiente palabra:
```

Palabras en español. Una nueva palabra al día (igual para todos los usuarios del servidor).

## Comandos de diversión

| Comando | Descripción |
|---|---|
| `/8ball pregunta` | La bola mágica responde con una de 20 respuestas |
| `/coinflip` | Cara o cruz |
| `/dice NdN` | Lanza dados en formato RPG: 2d6, 1d20, 4d4+3 |
| `/choose opcion1 opcion2...` | El bot elige aleatoriamente entre tus opciones |
| `/rate @user` | Puntuación aleatoria humorística de 0 a 100 |
| `/ship @user1 @user2` | Compatibilidad entre dos usuarios (0-100%) |
| `/slap @user` | Gif de bofetada con embed humorístico |
| `/hug @user` | Gif de abrazo |
| `/pat @user` | Gif de palmadita en la cabeza |
| `/kiss @user` | Gif de beso |
| `/cry` | Gif de llanto |
| `/dance` | Gif de baile |
| `/meme` | Meme aleatorio de Reddit |
| `/meme categoria` | Meme de una categoría específica |
| `/cat` | Foto aleatoria de un gato 🐱 |
| `/dog` | Foto aleatoria de un perro 🐶 |
| `/fox` | Foto aleatoria de un zorro 🦊 |

### Memes via Reddit API

Subreddits por defecto: `r/memes`, `r/dankmemes`, `r/me_irl`, `r/programminghumor`, `r/gaming`.

Filtra automáticamente contenido NSFW.

### Respuestas del 8ball

Positivas: "Sí, definitivamente", "Todo indica que sí", "Sin duda", "Cuenta con ello"  
Neutrales: "Pregunta de nuevo más tarde", "No es el momento de decirlo", "Difícil de predecir"  
Negativas: "No cuentes con ello", "Mis fuentes dicen que no", "Muy dudoso"

## Encuestas

| Comando | Descripción |
|---|---|
| `/poll pregunta [duración]` | Encuesta con botones Sí/No. Muestra resultados al finalizar |
| `/poll multiple pregunta opcion1 opcion2...` | Encuesta con múltiples opciones (hasta 10) |
| `/poll end ID` | Termina una encuesta antes de tiempo | 
| `/poll results ID` | Muestra los resultados actuales de una encuesta activa |

### Embed de encuesta múltiple

```
📊 ENCUESTA · Finaliza en 1h

¿Cuál es tu género favorito de videojuegos?

[A] RPG          ████░░░░░░  35% (42 votos)
[B] FPS          ██░░░░░░░░  18% (21 votos)
[C] Estrategia   ███░░░░░░░  28% (34 votos)
[D] Aventura     ██░░░░░░░░  19% (23 votos)

Total: 120 votos
```

Las barras de progreso se actualizan en tiempo real con cada voto.

## Estructura de archivos

```
src/commands/fun/
├── trivia/
│   ├── trivia.js
│   ├── battle.js
│   └── stats.js
├── games/
│   ├── connect4.js
│   ├── tictactoe.js
│   ├── rps.js
│   ├── wordle.js
│   └── hangman.js
├── reactions/
│   ├── slap.js
│   ├── hug.js
│   ├── pat.js
│   ├── kiss.js
│   ├── cry.js
│   └── dance.js
├── misc/
│   ├── 8ball.js
│   ├── coinflip.js
│   ├── dice.js
│   ├── choose.js
│   ├── rate.js
│   ├── ship.js
│   ├── meme.js
│   ├── cat.js
│   ├── dog.js
│   └── fox.js
└── poll.js

src/data/
├── trivia.json        # Banco de preguntas de trivia (1000+ preguntas)
└── wordle_words.json  # Palabras válidas para Wordle

src/models/
├── TriviaStats.js     # Stats de trivia por usuario
├── Poll.js            # Encuestas activas
└── WordleGame.js      # Estado del juego Wordle por usuario/día
```
