import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SCHOOL_API } from '../../core/api/api.tokens';
import { apiErrorMessage } from '../../core/api/api-error';
import { School } from '../../core/models';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast.service';
import { LoggerService } from '../../core/logging/logger.service';

/**
 * Shared by both /admin/school and /teacher/school. The edit form only renders for
 * ADMIN — this is a UX affordance only, NOT the access-control boundary: the backend
 * (PUT /api/school) enforces ADMIN-only via @PreAuthorize independent of this check,
 * so a teacher can never actually change the data regardless of what this component shows.
 */
@Component({
  selector: 'app-school-details',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './school-details.component.html'
})
export class SchoolDetailsComponent {
  private readonly api = inject(SCHOOL_API);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly isAdmin = this.auth.role() === 'ADMIN';

  readonly school = signal<School | null>(null);
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly form = signal({ name: '', address: '', phone: '', principalName: '', logoUrl: '' });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.get().subscribe({
      next: s => { this.school.set(s); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load school details', { error: String(err) });
        this.toast.error('Failed to load school details');
      }
    });
  }

  startEdit(): void {
    const s = this.school();
    if (!s) return;
    this.form.set({
      name: s.name,
      address: s.address ?? '',
      phone: s.phone ?? '',
      principalName: s.principalName ?? '',
      logoUrl: s.logoUrl ?? ''
    });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  save(): void {
    const f = this.form();
    if (!f.name.trim()) return;
    this.saving.set(true);
    this.api.update({
      name: f.name.trim(),
      address: f.address.trim() || null,
      phone: f.phone.trim() || null,
      logoUrl: f.logoUrl.trim() || null,
      principalName: f.principalName.trim() || null
    }).subscribe({
      next: updated => {
        this.school.set(updated);
        this.saving.set(false);
        this.editing.set(false);
        this.toast.success('School details updated');
      },
      error: err => {
        this.saving.set(false);
        this.logger.error('Failed to update school details', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update school details'));
      }
    });
  }
}
