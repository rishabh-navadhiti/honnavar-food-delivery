type Level = 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

function serialiseError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: Level, message: string, context: Context = {}): void {
  const entry: Record<string, unknown> = { time: new Date().toISOString(), level, message };
  for (const [key, value] of Object.entries(context)) entry[key] = serialiseError(value);
  const line = JSON.stringify(entry);
  if (level === 'info') console.log(line);
  else console.error(line);
}

export const log = {
  info: (message: string, context?: Context) => write('info', message, context),
  warn: (message: string, context?: Context) => write('warn', message, context),
  error: (message: string, context?: Context) => write('error', message, context),
};
