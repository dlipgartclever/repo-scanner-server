import winston from 'winston';
import { LogContext } from '../types/index.js';

const SENSITIVE_KEYS = ['token', 'password', 'secret', 'authorization', 'apikey', 'api_key'];

const sanitizeContext = (context?: LogContext): LogContext | undefined => {
  if (!context) return undefined;

  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

const createWinstonLogger = (serviceName: string, level: string): winston.Logger => {
  return winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
    ],
  });
};

const winstonLogger = createWinstonLogger(
  process.env.SERVICE_NAME || 'github-scanner',
  process.env.LOG_LEVEL?.toLowerCase() || 'info'
);

export class Logger {
  private readonly winstonInstance: winston.Logger;

  constructor(winstonInstance: winston.Logger = winstonLogger) {
    this.winstonInstance = winstonInstance;
  }

  debug(message: string, context?: LogContext): void {
    this.winstonInstance.debug(message, sanitizeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.winstonInstance.info(message, sanitizeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.winstonInstance.warn(message, sanitizeContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const meta = {
      ...sanitizeContext(context),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };
    this.winstonInstance.error(message, meta);
  }
}

export const logger = new Logger();
