import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<string, number> = {
  silent: 100,
  error: 40,
  warn: 30,
  info: 20,
  debug: 10
};

/**
 * Centralised app logger.
 *
 * Why a wrapper around console:
 *  - level gating from environment.logLevel so prod can be quieter,
 *  - one place to enforce "never log tokens, passwords, or full payloads",
 *  - future: ship logs to a backend collector without touching call sites.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly threshold: number;

  constructor() {
    this.threshold = LEVEL_PRIORITY[environment.logLevel] ?? LEVEL_PRIORITY['info'];
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  private log(level: Level, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < this.threshold) {
      return;
    }
    // Strip obviously sensitive keys before printing. Callers should not pass these,
    // but this is a defence-in-depth filter so a careless caller doesn't leak secrets.
    const safe = context ? this.redact(context) : undefined;
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    if (safe) {
      // eslint-disable-next-line no-console
      console[level](prefix, message, safe);
    } else {
      // eslint-disable-next-line no-console
      console[level](prefix, message);
    }
  }

  private redact(ctx: Record<string, unknown>): Record<string, unknown> {
    const blocked = new Set(['password', 'passwordHash', 'token', 'accessToken', 'authorization']);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ctx)) {
      out[k] = blocked.has(k.toLowerCase()) ? '[redacted]' : v;
    }
    return out;
  }
}
