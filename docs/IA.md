# 🤖 Inteligencia Artificial — OpenRouter

Integración con OpenRouter API para acceder a múltiples modelos de IA (GPT-4o, Claude, Llama, Mistral) desde una sola API key y con precios por uso.

## ¿Por qué OpenRouter?

| | OpenAI directo | OpenRouter |
|---|---|---|
| Modelos disponibles | Solo GPT | +100 modelos |
| Precio Llama 3 70B | No disponible | ~0.0009$/1K tokens |
| Precio GPT-4o | 0.005$/1K tokens | 0.005$/1K tokens |
| API key única | No | ✅ Sí |
| Fallback automático | No | ✅ Sí |

## Comandos

| Comando | Descripción |
|---|---|
| `/ai chat mensaje` | Conversa con la IA. Recuerda los últimos N mensajes del hilo |
| `/ai ask pregunta` | Pregunta puntual sin historial de contexto |
| `/ai model nombre` | Cambia el modelo activo para este servidor |
| `/ai models` | Lista todos los modelos disponibles con precio estimado |
| `/ai persona texto` | Configura la personalidad/system prompt del bot |
| `/ai persona reset` | Restaura la personalidad por defecto |
| `/ai reset` | Borra el contexto de conversación del canal actual |
| `/ai summary` | Resume los últimos 50 mensajes del canal |
| `/ai translate texto idioma` | Traduce a cualquier idioma |
| `/ai imagine prompt` | Genera una imagen a partir de texto |
| `/ai check @user` | Analiza mensajes recientes buscando toxicidad latente |
| `/ai config` | Panel de configuración del módulo de IA |

## Modelos disponibles

Configurables por servidor desde `/ai model` o el dashboard:

| Modelo | ID en OpenRouter | Precio/1K tokens | Calidad |
|---|---|---|---|
| Llama 3 70B | `meta-llama/llama-3-70b-instruct` | ~0.0009$ | ⭐⭐⭐⭐ |
| Mistral 7B | `mistralai/mistral-7b-instruct` | ~0.0002$ | ⭐⭐⭐ |
| GPT-4o Mini | `openai/gpt-4o-mini` | ~0.0002$ | ⭐⭐⭐⭐ |
| GPT-4o | `openai/gpt-4o` | ~0.005$ | ⭐⭐⭐⭐⭐ |
| Claude 3.5 Sonnet | `anthropic/claude-3-5-sonnet` | ~0.003$ | ⭐⭐⭐⭐⭐ |
| Gemini Flash | `google/gemini-flash-1.5` | ~0.0001$ | ⭐⭐⭐⭐ |

**Recomendación por defecto:** Llama 3 70B — excelente relación calidad/precio para un bot de comunidad.

## Chat contextual

El bot recuerda el historial de conversación por canal. El contexto se almacena en memoria (no en MongoDB) y se limpia automáticamente:

```javascript
// Configuración por defecto
AI_CONTEXT_MESSAGES = 10   // Últimos N mensajes recordados
AI_CONTEXT_TTL = 30        // Minutos sin actividad → limpiar contexto
```

### Flujo del chat

```
[Usuario]  ¿Cuál es la capital de Francia?
[Jarvis-FavBot]   La capital de Francia es París.

[Usuario]  ¿Y cuántos habitantes tiene?
[Jarvis-FavBot]   París tiene aproximadamente 2,1 millones de habitantes
           en la ciudad y más de 12 millones en el área metropolitana.
           (El bot recordó que se habla de París)
```

### Auto-respuesta en canales configurados

Se puede configurar un canal donde el bot responde automáticamente a cualquier mensaje sin necesidad de slash command:

```
/ai config autochannel #canal-ia
→ Cualquier mensaje en #canal-ia recibe respuesta de la IA
```

## Personalidad configurable

Cada servidor puede definir su propio system prompt:

```
/ai persona Eres Fav, el bot oficial de este servidor de gaming.
            Hablas de forma casual y usas emojis de vez en cuando.
            Conoces bien los videojuegos y eres fan de los FPS.
```

El system prompt se guarda por servidor en MongoDB y se inyecta en cada petición.

## Resumen de mensajes

```
/ai summary
→ El bot lee los últimos 50 mensajes del canal
→ Genera un resumen estructurado con los temas principales
→ Responde con un embed con secciones de resumen
```

Configurable: número de mensajes (10-100), idioma del resumen.

## Generación de imágenes

```
/ai imagine Un dragón de cristal volando sobre un castillo nevado
→ El bot llama a un modelo de imagen via OpenRouter
   (Stable Diffusion XL o DALL-E 3 según config)
→ Responde con la imagen generada como archivo adjunto
```

Modelos de imagen disponibles:
- `stability-ai/sdxl` — gratuito, buena calidad
- `openai/dall-e-3` — mejor calidad, pago

## Traducción con IA

```
/ai translate "Hello, how are you?" español
→ Hola, ¿cómo estás?
```

Ventaja sobre Google Translate: entiende contexto, jerga y modismos.

## Detector de toxicidad

```
/ai check @Days16
→ El bot analiza los últimos 20 mensajes del usuario en el servidor
→ Genera un informe de toxicidad:
   Usuario: @Days16
   Mensajes analizados: 20
   Nivel de toxicidad: Bajo (2/10)
   Patrones detectados: ninguno
   Recomendación: sin acción requerida
```

Útil para detectar evasión de filtros, insultos velados o comportamiento pasivo-agresivo.

## Filtro de contenido

El bot nunca genera:
- Contenido sexual o violento explícito
- Información peligrosa (armas, drogas, hacking malicioso)
- Doxing o información personal de terceros
- Propaganda política o de odio

Este filtro está a nivel de system prompt y no puede desactivarse.

## Costes estimados

Para un servidor de 500 miembros activos con uso moderado del chat de IA:

| Uso | Modelo | Coste mensual estimado |
|---|---|---|
| 500 mensajes/día | Llama 3 70B | ~1.35$/mes |
| 500 mensajes/día | GPT-4o Mini | ~0.30$/mes |
| 500 mensajes/día | GPT-4o | ~7.50$/mes |
| 100 imágenes/día | SDXL | ~0$/mes (gratis) |
| 100 imágenes/día | DALL-E 3 | ~4$/mes |

## Estructura de archivos

```
src/commands/ai/
├── chat.js
├── ask.js
├── model.js
├── models.js
├── persona.js
├── reset.js
├── summary.js
├── translate.js
├── imagine.js
├── check.js
└── config.js

src/utils/
├── openrouter.js      # Cliente HTTP para OpenRouter API
├── aiContext.js       # Gestión del historial de conversación en memoria
└── contentFilter.js   # Filtro de contenido antes de enviar a la API

src/models/
└── GuildAI.js         # Config de IA por servidor (modelo, persona, canales)
```

## Ejemplo de llamada a OpenRouter

```javascript
// src/utils/openrouter.js
const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: guild.aiModel || process.env.OPENROUTER_MODEL,
  messages: [
    { role: 'system', content: guild.aiPersona || 'Eres Jarvis-FavBot, un bot de Discord útil y amigable.' },
    ...contextHistory,
    { role: 'user', content: userMessage }
  ],
  max_tokens: 800,
}, {
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://Jarvis-FavBot.app',
    'X-Title': 'Jarvis-FavBot',
  }
});
```
