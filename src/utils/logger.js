const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const ts = () => new Date().toLocaleTimeString('es-ES');

export const logger = {
  info:    (msg) => console.log(`${C.cyan}[${ts()}] INFO${C.reset}  ${msg}`),
  success: (msg) => console.log(`${C.green}[${ts()}] OK${C.reset}    ${msg}`),
  warn:    (msg) => console.warn(`${C.yellow}[${ts()}] WARN${C.reset}  ${msg}`),
  error:   (msg, err = '') => console.error(`${C.red}[${ts()}] ERROR${C.reset} ${msg}`, err),
  debug:   (msg) => { if (process.env.DEBUG === 'true') console.log(`${C.magenta}[${ts()}] DEBUG${C.reset} ${msg}`); },
};
