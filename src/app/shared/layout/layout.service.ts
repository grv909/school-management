import { Injectable, signal } from '@angular/core';

/**
 * Holds cross-component layout state. Currently just the mobile navigation
 * drawer: the topbar toggles it, the app-shell renders the backdrop, and the
 * sidebar closes it on navigation. Desktop ignores this entirely (the sidebar
 * is always visible via CSS at >= 960px).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Whether the off-canvas mobile sidebar drawer is open. */
  readonly mobileNavOpen = signal(false);

  toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
