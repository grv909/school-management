import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

import { AUTH_API } from '../api/api.tokens';
import { CurrentUser, Role } from '../models';
import { LoggerService } from '../logging/logger.service';

const STORAGE_KEY = 'erp.auth.session.v1';

interface StoredSession {
  accessToken: string;
  role: Role;
  username: string;
  expiresAt: number;
}

/**
 * Single source of truth for "who is logged in". Components and guards read the signals;
 * they never read localStorage directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AUTH_API);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  private readonly _session = signal<StoredSession | null>(this.readFromStorage());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this._session();
    return !!s && s.expiresAt > Date.now();
  });
  readonly role = computed<Role | null>(() => this._session()?.role ?? null);
  readonly currentUser = computed<CurrentUser | null>(() => {
    const s = this._session();
    if (!s) return null;
    return {
      // FUTURE: when real auth is wired, userId + schoolId come from /auth/me response.
      // For mock mode we don't need them server-side; placeholders are safe.
      userId: 0,
      username: s.username,
      role: s.role,
      schoolId: 1
    };
  });

  login(username: string, password: string): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.api.login(username, password).subscribe({
        next: (resp) => {
          const session: StoredSession = {
            accessToken: resp.accessToken,
            role: resp.role,
            username,
            expiresAt: Date.now() + resp.expiresIn * 1000
          };
          this.writeToStorage(session);
          this._session.set(session);
          this.logger.info('Login succeeded', { username, role: resp.role });
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => {
          this.logger.warn('Login failed', { username });
          subscriber.error(err);
        }
      });
    });
  }

  logout(): void {
    const username = this._session()?.username;
    this._session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.logger.info('Logout', { username });
    this.router.navigate(['/login']);
  }

  accessToken(): string | null {
    return this._session()?.accessToken ?? null;
  }

  private readFromStorage(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      // Corrupt entry — drop it.
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private writeToStorage(s: StoredSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
}
