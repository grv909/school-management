import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ACADEMIC_YEAR_API, CLASS_API, EXAM_API } from '../../../core/api/api.tokens';
import { AcademicYear, Exam, SchoolClass } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-exams-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exams-page.component.html'
})
export class ExamsPageComponent {
  private readonly examApi = inject(EXAM_API);
  private readonly yearApi = inject(ACADEMIC_YEAR_API);
  private readonly classApi = inject(CLASS_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly exams = signal<Exam[]>([]);
  readonly years = signal<AcademicYear[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly loading = signal(true);

  // Which class's exams the table is currently showing.
  readonly selectedClassId = signal<number | null>(null);

  readonly formOpen = signal(false);
  readonly form = signal<{ name: string; academicYearId: number | null; classId: number | null; maxMarks: number | null; startDate: string; endDate: string }>({
    name: '', academicYearId: null, classId: null, maxMarks: 100, startDate: '', endDate: ''
  });

  constructor() {
    this.yearApi.list().subscribe(rows => {
      this.years.set(rows);
      const current = rows.find(y => y.current) ?? rows[0];
      if (current) this.form.update(f => ({ ...f, academicYearId: current.id }));
    });
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);
      const first = rows[0] ?? null;
      if (first) {
        this.selectedClassId.set(first.id);
        this.form.update(f => ({ ...f, classId: first.id }));
      }
      this.loadExams();
    });
  }

  onClassChange(classId: number): void {
    this.selectedClassId.set(classId);
    this.loadExams();
  }

  private loadExams(): void {
    const classId = this.selectedClassId();
    if (classId == null) { this.exams.set([]); this.loading.set(false); return; }
    this.loading.set(true);
    this.examApi.list(classId).subscribe({
      next: rows => { this.exams.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load exams', { error: String(err) });
        this.toast.error('Failed to load exams');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    const yearId = this.years().find(y => y.current)?.id ?? this.years()[0]?.id ?? null;
    this.form.set({ name: '', academicYearId: yearId, classId: this.selectedClassId(), maxMarks: 100, startDate: '', endDate: '' });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit() {
    const f = this.form();
    if (!f.name.trim() || !f.academicYearId || !f.classId || !f.maxMarks) return;
    this.examApi.create({
      name: f.name.trim(),
      academicYearId: f.academicYearId,
      classId: f.classId,
      maxMarks: f.maxMarks,
      startDate: f.startDate || null,
      endDate: f.endDate || null
    }).subscribe({
      next: (created) => {
        if (created.classId === this.selectedClassId()) {
          this.exams.update(arr => [created, ...arr]);
        }
        this.toast.success(`Created exam "${created.name}"`);
        this.toggleForm();
      },
      error: err => {
        this.logger.error('Failed to create exam', { error: String(err) });
        this.toast.error('Failed to create exam');
      }
    });
  }

  yearName(id: number): string {
    return this.years().find(y => y.id === id)?.name ?? '—';
  }

  className(id: number): string {
    return this.classes().find(c => c.id === id)?.name ?? '—';
  }
}
