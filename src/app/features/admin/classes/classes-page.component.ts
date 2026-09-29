import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ACADEMIC_YEAR_API, CLASS_API, SECTION_API, SUBJECT_API } from '../../../core/api/api.tokens';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AcademicYear, SchoolClass, Section, Subject } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-classes-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './classes-page.component.html'
})
export class ClassesPageComponent {
  private readonly api = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly academicYearApi = inject(ACADEMIC_YEAR_API);
  private readonly subjectApi = inject(SUBJECT_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly loading = signal(true);

  readonly formOpen = signal(false);
  readonly newName = signal('');

  readonly academicYears = signal<AcademicYear[]>([]);

  // Class currently being renamed, if any.
  readonly editingId = signal<number | null>(null);
  readonly editName = signal('');

  // Class whose sections panel is currently open, if any.
  readonly sectionsClassId = signal<number | null>(null);
  readonly sections = signal<Section[]>([]);
  readonly sectionForm = signal<{ academicYearId: number | null; name: string }>({ academicYearId: null, name: '' });

  // Class whose subject-assignment panel is currently open, if any.
  readonly subjectsClassId = signal<number | null>(null);
  readonly allSubjects = signal<Subject[]>([]);
  readonly selectedSubjectIds = signal<Set<number>>(new Set());
  readonly savingSubjects = signal(false);

  constructor() {
    this.load();
    this.academicYearApi.list().subscribe(rows => {
      this.academicYears.set(rows);
      const current = rows.find(y => y.current) ?? rows[0] ?? null;
      if (current) this.sectionForm.update(f => ({ ...f, academicYearId: current.id }));
    });
    this.subjectApi.list().subscribe(rows => this.allSubjects.set(rows));
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (rows) => { this.classes.set(rows); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.logger.error('Failed to load classes', { error: String(err) });
        this.toast.error('Failed to load classes');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.newName.set('');
  }

  submit(): void {
    const name = this.newName().trim();
    if (!name) return;
    this.api.create({ name }).subscribe({
      next: (created) => {
        // The server orders GET /api/classes by displayOrder; simplest to just refetch
        // rather than guess where this new row belongs relative to existing ones.
        this.load();
        this.toast.success(`Class "${created.name}" added`);
        this.toggleForm();
      },
      error: (err) => {
        this.logger.error('Failed to create class', { error: String(err) });
        this.toast.error('Failed to create class');
      }
    });
  }

  toggleSections(c: SchoolClass): void {
    if (this.sectionsClassId() === c.id) {
      this.sectionsClassId.set(null);
      return;
    }
    this.sectionsClassId.set(c.id);
    this.sectionForm.update(f => ({ ...f, name: '' }));
    this.loadSections(c.id);
  }

  private loadSections(classId: number): void {
    this.sectionApi.listByClass(classId).subscribe({
      next: rows => this.sections.set(rows),
      error: err => {
        this.logger.error('Failed to load sections', { error: String(err) });
        this.toast.error('Failed to load sections');
      }
    });
  }

  patchSectionForm<K extends keyof ReturnType<typeof this.sectionForm>>(key: K, value: ReturnType<typeof this.sectionForm>[K]) {
    this.sectionForm.update(f => ({ ...f, [key]: value }));
  }

  addSection(classId: number): void {
    const f = this.sectionForm();
    if (!f.academicYearId || !f.name.trim()) return;
    this.sectionApi.create({ classId, academicYearId: f.academicYearId, name: f.name.trim() }).subscribe({
      next: created => {
        this.sections.update(arr => [...arr, created]);
        this.sectionForm.update(cur => ({ ...cur, name: '' }));
        this.toast.success(`Section "${created.name}" added`);
      },
      error: err => {
        this.logger.error('Failed to add section', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to add section'));
      }
    });
  }

  academicYearLabel(id: number): string {
    return this.academicYears().find(y => y.id === id)?.name ?? `Year #${id}`;
  }

  startEdit(c: SchoolClass): void {
    this.editingId.set(c.id);
    this.editName.set(c.name);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(id: number): void {
    const name = this.editName().trim();
    if (!name) return;
    this.api.update(id, { name }).subscribe({
      next: () => {
        // Refetch: the update response doesn't re-enrich classTeacherName/studentCount
        // (same simplification as create()), so pull the fully-enriched row from list().
        this.load();
        this.editingId.set(null);
        this.toast.success(`Class renamed to "${name}"`);
      },
      error: err => {
        this.logger.error('Failed to update class', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update class'));
      }
    });
  }

  toggleSubjects(c: SchoolClass): void {
    if (this.subjectsClassId() === c.id) {
      this.subjectsClassId.set(null);
      return;
    }
    this.subjectsClassId.set(c.id);
    this.subjectApi.list(c.id).subscribe({
      next: rows => this.selectedSubjectIds.set(new Set(rows.map(s => s.id))),
      error: err => {
        this.logger.error('Failed to load class subjects', { error: String(err) });
        this.toast.error('Failed to load subjects for this class');
      }
    });
  }

  toggleSubjectSelection(subjectId: number, checked: boolean): void {
    this.selectedSubjectIds.update(ids => {
      const next = new Set(ids);
      if (checked) next.add(subjectId); else next.delete(subjectId);
      return next;
    });
  }

  saveSubjects(classId: number): void {
    this.savingSubjects.set(true);
    this.api.assignSubjects(classId, Array.from(this.selectedSubjectIds())).subscribe({
      next: () => {
        this.savingSubjects.set(false);
        this.toast.success('Subjects updated');
      },
      error: err => {
        this.savingSubjects.set(false);
        this.logger.error('Failed to assign subjects', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update subjects'));
      }
    });
  }
}
