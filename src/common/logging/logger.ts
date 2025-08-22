type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
  const line = {
    level,
    ts: new Date().toISOString(),
    msg: message,
    ...meta,
  };
  // Railway utilise stdout pour le logging (7 Jours plan gratuit, 30 Jours premier plan payant)
  console.log(JSON.stringify(line));
}

export const logInfo  = (msg: string, meta?: Record<string, any>) => log('info', msg, meta);
export const logWarn  = (msg: string, meta?: Record<string, any>) => log('warn', msg, meta);
export const logError = (msg: string, meta?: Record<string, any>) => log('error', msg, meta);
