export function parseEnv(schema, source = process.env) {
  const result = {};
  const errors = [];
  for (const [key, validate] of Object.entries(schema)) {
    const value = source[key];
    try {
      result[key] = validate(value, source);
    } catch (error) {
      errors.push(`${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (errors.length) throw new Error(`Invalid environment:\n${errors.join('\n')}`);
  return Object.freeze(result);
}

export const required = (name) => (value) => {
  if (!value) throw new Error(`${name} is required`);
  return value;
};

export const optional =
  (fallback = undefined) =>
  (value) =>
    value ?? fallback;

export const asPublicEnv = (env, keys) =>
  Object.freeze(Object.fromEntries(keys.filter((key) => key in env).map((key) => [key, env[key]])));
