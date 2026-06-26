import axios from 'axios';
import { logger } from './logger.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_HISTORY = 20;
const SYSTEM_PROMPT = `Eres Jarvis, un asistente virtual integrado en un bot de Discord para comunidades de gaming y entretenimiento. Eres útil, directo y amigable. Respondes siempre en el mismo idioma que el usuario. Tus respuestas son concisas (máx. 3-4 párrafos). No uses listas con bullets a menos que sea necesario para claridad.`;

const history = new Map(); // channelId → {role, content}[]

export function getHistory(channelId) {
  return history.get(channelId) ?? [];
}

export function clearHistory(channelId) {
  history.delete(channelId);
}

function pushHistory(channelId, role, content) {
  const h = history.get(channelId) ?? [];
  h.push({ role, content });
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
  history.set(channelId, h);
}

export async function askAI(prompt, channelId = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model  = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada en .env');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(channelId ? getHistory(channelId) : []),
    { role: 'user', content: prompt },
  ];

  const { data } = await axios.post(
    OPENROUTER_URL,
    { model, messages, max_tokens: 1024 },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/jarvis-favbot',
        'X-Title': 'Jarvis-FavBot',
      },
      timeout: 30000,
    },
  );

  const reply = data.choices?.[0]?.message?.content?.trim() ?? 'Sin respuesta.';
  if (channelId) {
    pushHistory(channelId, 'user', prompt);
    pushHistory(channelId, 'assistant', reply);
  }
  return reply;
}
