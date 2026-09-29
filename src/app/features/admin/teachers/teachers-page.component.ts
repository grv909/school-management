import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CLASS_API, SECTION_API, SUBJECT_API, TEACHER_API, TEACHER_ASSIGNMENT_API } from '../../../core/api/api.tokens';
import { apiErrorMessage } from '../../../core/api/api-error';
import { SchoolClass, Section, Subject, Teacher, TeacherAssignment } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-teachers-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teachers-page.component.html'
})
export class TeachersPageComponent {
  private readonly api = inject(TEACHER_API);
  private readonly classApi = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly subjectApi = inject(SUBJECT_API);
  private readonly assignmentApi = inject(TEACHER_ASSIGNMENT_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly teachers = signal<Teacher[]>([]);
  readonly loading = signal(true);

  readonly formOpen = signal(false);
  readonly form = signal({ firstName: '', lastName: '', employeeNo: '', username: '', password: '' });

  // Teacher currently being edited, if any — drives the inline edit form below its row.
  readonly editingId = signal<number | null>(null);
  readonly editForm = signal({ firstName: '', lastName: '', employeeNo: '' });

  // Teacher whose class/section assignments panel is currently open, if any.
  readonly assigningId = signal<number | null>(null);
  readonly assignments = signal<TeacherAssignment[]>([]);
  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly subjects = signal<Subject[]>([]);
  // All sections across all classes, keyed for label lookups (see constructor).
  private readonly allSections = signal<Section[]>([]);
  // All subjects, keyed for label lookups (see constructor).
  private readonly allSubjects = signal<Subject[]>([]);
  readonly assignForm = signal<{ classId: number | null; sectionId: number | null; subjectId: number | null; isClassTeacher: boolean }>({
    classId: null, sectionId: null, subjectId: null, isClassTeacher: false
  });

  constructor() {
    this.load();
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);
      // Load every class's sections up front so existing assignments can always be
      // labelled (e.g. "Class 8 - A"), not just the ones for whatever class is
      // currently picked in the add-assignment form.
      rows.forEach(c => this.sectionApi.listByClass(c.id).subscribe(secs => {
        this.allSections.update(arr => [...arr.filter(s => s.classId !== c.id), ...secs]);
      }));
    });
    this.subjectApi.list().subscribe(rows => this.allSubjects.set(rows));
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: rows => { this.teachers.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load teachers', { error: String(err) });
        this.toast.error('Failed to load teachers');
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ firstName: '', lastName: '', employeeNo: '', username: '', password: '' });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit(): void {
    const f = this.form();
    if (!f.firstName.trim() || !f.lastName.trim() || !f.username.trim() || !f.password) return;
    this.api.create({
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      employeeNo: f.employeeNo.trim(),
      username: f.username.trim(),
      password: f.password
    }).subscribe({
      next: (created) => {
        this.teachers.update(arr => [...arr, created]);
        this.toast.success(`Added ${created.firstName} ${created.lastName}`);
        this.toggleForm();
      },
      error: err => {
        this.logger.error('Failed to create teacher', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to add teacher'));
      }
    });
  }

  startEdit(t: Teacher): void {
    this.editingId.set(t.id);
    this.editForm.set({ firstName: t.firstName, lastName: t.lastName, employeeNo: t.employeeNo ?? '' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  patchEdit<K extends keyof ReturnType<typeof this.editForm>>(key: K, value: ReturnType<typeof this.editForm>[K]) {
    this.editForm.update(f => ({ ...f, [key]: value }));
  }

  saveEdit(id: number): void {
    const f = this.editForm();
    if (!f.firstName.trim() || !f.lastName.trim()) return;
    this.api.update(id, {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      employeeNo: f.employeeNo.trim()
    }).subscribe({
      next: (updated) => {
        this.teachers.update(arr => arr.map(t => t.id === id ? updated : t));
        this.toast.success(`Updated ${updated.firstName} ${updated.lastName}`);
        this.editingId.set(null);
      },
      error: err => {
        this.logger.error('Failed to update teacher', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to update teacher'));
      }
    });
  }

  toggleAssignments(t: Teacher): void {
    if (this.assigningId() === t.id) {
      this.assigningId.set(null);
      return;
    }
    this.assigningId.set(t.id);
    this.assignForm.set({ classId: null, sectionId: null, subjectId: null, isClassTeacher: false });
    this.sections.set([]);
    this.subjects.set([]);
    this.loadAssignments(t.id);
  }

  private loadAssignments(teacherId: number): void {
    this.assignmentApi.list().subscribe({
      next: rows => this.assignments.set(rows.filter(a => a.teacherId === teacherId)),
      error: err => {
        this.logger.error('Failed to load teacher assignments', { error: String(err) });
        this.toast.error('Failed to load assignments');
      }
    });
  }

  onAssignClassChange(classId: number): void {
    this.assignForm.update(f => ({ ...f, classId, sectionId: null, subjectId: null }));
    if (classId) {
      this.sectionApi.listByClass(classId).subscribe(rows => this.sections.set(rows));
      this.subjectApi.list(classId).subscribe(rows => this.subjects.set(rows));
    } else {
      this.sections.set([]);
      this.subjects.set([]);
    }
  }

  patchAssignForm<K extends keyof ReturnType<typeof this.assignForm>>(key: K, value: ReturnType<typeof this.assignForm>[K]) {
    this.assignForm.update(f => ({ ...f, [key]: value }));
  }

  addAssignment(teacherId: number): void {
    const f = this.assignForm();
    if (!f.sectionId) return;
    if (!f.isClassTeacher && !f.subjectId) return;
    this.assignmentApi.create({
      teacherId,
      sectionId: f.sectionId,
      subjectId: f.isClassTeacher ? null : f.subjectId,
      isClassTeacher: f.isClassTeacher
    }).subscribe({
      next: (created) => {
        this.assignments.update(arr => [...arr, created]);
        this.assignForm.set({ classId: null, sectionId: null, subjectId: null, isClassTeacher: false });
        this.sections.set([]);
        this.subjects.set([]);
        this.toast.success('Assignment added');
      },
      error: err => {
        this.logger.error('Failed to add teacher assignment', { error: String(err) });
        this.toast.error(apiErrorMessage(err, 'Failed to add assignment'));
      }
    });
  }

  removeAssignment(assignmentId: number): void {
    this.assignmentApi.remove(assignmentId).subscribe({
      next: () => {
        this.assignments.update(arr => arr.filter(a => a.id !== assignmentId));
        this.toast.success('Assignment removed');
      },
      error: err => {
        this.logger.error('Failed to remove teacher assignment', { error: String(err) });
        this.toast.error('Failed to remove assignment');
      }
    });
  }

  className(id: number): string {
    return this.classes().find(c => c.id === id)?.name ?? '—';
  }

  sectionLabel(sectionId: number): string {
    const s = this.allSections().find(sec => sec.id === sectionId);
    return s ? `${this.className(s.classId)} - ${s.name}` : `Section #${sectionId}`;
  }

  subjectLabel(subjectId: number | null): string {
    if (subjectId == null) return 'All subjects';
    return this.allSubjects().find(sub => sub.id === subjectId)?.name ?? `Subject #${subjectId}`;
  }
}
