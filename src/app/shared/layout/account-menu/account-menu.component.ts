import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, Output, EventEmitter, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Presentational account-area disclosure widget for the topbar: avatar-initials
 * trigger + dropdown (username, role badge, sign-out). No injected services —
 * the parent (topbar) owns auth state and just passes username/role in, logout out.
 */
@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-menu.component.html',
  styleUrl: './account-menu.component.scss'
})
export class AccountMenuComponent {
  @Input() username = '';
  @Input() role = '';
  @Output() logout = new EventEmitter<void>();

  private readonly elementRef = inject(ElementRef);

  readonly open = signal(false);

  readonly initials = computed(() => {
    const parts = this.username.trim().split(/[.\s_-]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  toggle(): void {
    this.open.update(o => !o);
  }

  close(): void {
    this.open.set(false);
  }

  onLogout(): void {
    this.close();
    this.logout.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
