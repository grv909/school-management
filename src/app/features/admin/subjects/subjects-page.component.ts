import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CLASS_API, SUBJECT_API } from '../../../core/api/api.tokens';
import { SchoolClass, Subject } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-subjects-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subjects-page.component.html'
})
export class SubjectsPageComponent {
  private readonly api = inject(SUBJECT_API);
  private readonly classApi = inject(CLASS_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly subjects = signal<Subject[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly form = signal({ name: '', code: '', maxMarks: 100 });

  // Which class's subjects the table is currently showing.
  readonly selectedClassId = signal<number | null>(null);

  constructor() {
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);
      const first = rows[0] ?? null;
      if (first) this.selectedClassId.set(first.id);
      this.loadSubjects();
    });
  }

  onClassChange(classId: number): void {
    this.selectedClassId.set(classId);
    this.loadSubjects();
  }

  private loadSubjects(): void {
    const classId = this.selectedClassId();
    if (classId == null) { this.subjects.set([]); this.loading.set(false); return; }
    this.loading.set(true);
    this.api.list(classId).subscribe({
      next: rows => { this.subjects.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load subjects', { error: String(err) });
        this.toast.error('Failed to load subjects');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ name: '', code: '', maxMarks: 100 });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit() {
    const f = this.form();
    if (!f.name.trim() || !f.code.trim()) return;
    this.api.create({ name: f.name.trim(), code: f.code.trim().toUpperCase(), maxMarks: f.maxMarks })
      .subscribe({
        next: (created) => {
          this.toast.success(`Added subject "${created.name}". Assign it to a class from the Classes page.`);
          this.toggleForm();
        },
        error: err => {
          this.logger.error('Failed to create subject', { error: String(err) });
          this.toast.error('Failed to add subject');
        }
      });
  }
}
