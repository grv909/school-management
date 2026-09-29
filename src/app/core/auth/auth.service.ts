import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

import { AUTH_API } from '../api/api.tokens';
import { CurrentUser, Role } from '../models';
import { LoggerService } from '../logging/logger.service';
import { TeacherScopeService } from './teacher-scope.service';

const STORAGE_KEY = 'erp.auth.session.v1';

interface StoredSession {
  accessToken: string;
  role: Role;
  username: string;
  expiresAt: number;
  userId: number;
  schoolId: number;
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
  // Resolved lazily (not injected in the constructor) — TeacherScopeService injects
  // AuthService itself, so a direct constructor injection here would be circular.
  private readonly injector = inject(Injector);

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
      userId: s.userId,
      username: s.username,
      role: s.role,
      schoolId: s.schoolId
    };
  });

  login(username: string, password: string): Observable<void> {
    return new Observable<void>((subscriber) => {
      // Drop any previous teacher's cached assignments/sections before this session's
      // session signal is populated, so the new teacher never sees a stale scope.
      this.injector.get(TeacherScopeService).reset();
      this.api.login(username, password).subscribe({
        next: (resp) => {
          // Stash the token first so the /auth/me call below goes out authenticated
          // (the jwt interceptor reads it from this same session signal).
          const partialSession: StoredSession = {
            accessToken: resp.accessToken,
            role: resp.role,
            username,
            expiresAt: Date.now() + resp.expiresIn * 1000,
            userId: 0,
            schoolId: 0
          };
          this._session.set(partialSession);
          this.api.me().subscribe({
            next: (me) => {
              const session: StoredSession = { ...partialSession, userId: me.userId, schoolId: me.schoolId };
              this.writeToStorage(session);
              this._session.set(session);
              this.logger.info('Login succeeded', { username, role: resp.role });
              subscriber.next();
              subscriber.complete();
            },
            error: (err) => {
              this._session.set(null);
              this.logger.warn('Failed to resolve current user after login', { username });
              subscriber.error(err);
            }
          });
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
    this.injector.get(TeacherScopeService).reset();
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
      if (parsed.expiresAt <= Date.now() || typeof parsed.userId !== 'number' || typeof parsed.schoolId !== 'number') {
        // Also drops sessions stored before userId/schoolId were added to the shape.
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
