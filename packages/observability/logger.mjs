const SENSITIVE = /authorization|cookie|token|secret|key|signature|password|private/i;

const redact = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE.test(key) ? '[REDACTED]' : redact(item)]));
};

export function createLogger({ service = 'unknown', level = 'info', sink = console } = {}) {
  const write = (severity, message, fields = {}) => sink[severity]?.(JSON.stringify({ level: severity, service, message, ...redact(fields) }));
  return Object.freeze({ level, debug: (m, f) => write('debug', m, f), info: (m, f) => write('info', m, f), warn: (m, f) => write('warn', m, f), error: (m, f) => write('error', m, f) });
}

export { redact };
