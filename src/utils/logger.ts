/**
 * Secure logger that only outputs in development mode
 * Prevents sensitive information from being logged in production
 */

const isDev = __DEV__;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Errors are always logged, but sanitize sensitive data in production
    if (isDev) {
      console.error(...args);
    } else {
      // In production, only log error messages without sensitive details
      const sanitizedArgs = args.map((arg) => {
        if (arg instanceof Error) {
          return arg.message;
        }
        if (typeof arg === 'object' && arg !== null) {
          // Remove potentially sensitive fields
          const sanitized = { ...arg } as Record<string, unknown>;
          delete sanitized.email;
          delete sanitized.password;
          delete sanitized.token;
          delete sanitized.session;
          return sanitized;
        }
        return arg;
      });
      console.error('[Error]', ...sanitizedArgs);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
