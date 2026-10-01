import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CLASS_API, SECTION_API, STUDENT_API } from '../../../core/api/api.tokens';
import { SchoolClass, Section, Student } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SelectComponent, SelectOption, GENDER_OPTIONS } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

// Root-provided so the picked class/section survives the component being
// destroyed and recreated when navigating to a student profile and back.
@Injectable({ providedIn: 'root' })
class AdminStudentsFilterState {
  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);
}

@Component({
  selector: 'app-students-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent, ModalComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './students-page.component.html'
})
export class StudentsPageComponent {
  private readonly classApi = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly studentApi = inject(STUDENT_API);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);
  private readonly filterState = inject(AdminStudentsFilterState);

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly students = signal<Student[]>([]);
  readonly loading = signal(false);

  readonly selectedClassId = this.filterState.selectedClassId;
  readonly selectedSectionId = this.filterState.selectedSectionId;

  readonly formOpen = signal(false);
  readonly form = signal<{ admissionNo: string; firstName: string; lastName: string; rollNo: number | null; gender: string }>({
    admissionNo: '', firstName: '', lastName: '', rollNo: null, gender: ''
  });
  readonly submitted = signal(false);

  // Student currently being edited, if any — drives the inline edit row in place of its row.
  readonly editingId = signal<number | null>(null);
  readonly editForm = signal<{ admissionNo: string; firstName: string; lastName: string; rollNo: number | null; gender: string; dob: string }>({
    admissionNo: '', firstName: '', lastName: '', rollNo: null, gender: '', dob: ''
  });
  readonly editSubmitted = signal(false);

  readonly canShowStudents = computed(() => this.selectedSectionId() !== null);

  readonly genderOptions = GENDER_OPTIONS;

  readonly classOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select class' },
    ...this.classes().map(c => ({ value: c.id, label: c.name }))
  ]);

  readonly sectionOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select section' },
    ...this.sections().map(s => ({ value: s.id, label: `Section ${s.name}` }))
  ]);

  constructor() {
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);

      // Restore sections/roster for a class+section picked before navigating
      // away (e.g. into a student profile) — filterState survives the
      // component recreation, but the derived lists below don't.
      const classId = this.selectedClassId();
      if (classId) {
        this.sectionApi.listByClass(classId).subscribe(s => {
          this.sections.set(s);
          const sectionId = this.selectedSectionId();
          if (sectionId) this.loadStudents(sectionId);
        });
      }
    });
  }

  onClassChange(classId: number): void {
    this.selectedClassId.set(classId);
    this.selectedSectionId.set(null);
    this.students.set([]);
    if (classId) {
      this.sectionApi.listByClass(classId).subscribe(s => this.sections.set(s));
    } else {
      this.sections.set([]);
    }
  }

  onSectionChange(sectionId: number): void {
    this.selectedSectionId.set(sectionId);
    if (sectionId) {
      this.loadStudents(sectionId);
    } else {
      this.students.set([]);
    }
  }

  private loadStudents(sectionId: number): void {
    this.loading.set(true);
    this.studentApi.listBySection(sectionId).subscribe({
      next: rows => { this.students.set(rows); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.logger.error('Failed to load students', { error: String(err) });
      }
    });
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ admissionNo: '', firstName: '', lastName: '', rollNo: null, gender: '' });
    this.submitted.set(false);
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId) return;
    this.submitted.set(true);
    const f = this.form();
    if (!f.admissionNo.trim() || !f.firstName.trim() || !f.lastName.trim()) return;

    this.studentApi.create({
      sectionId,
      admissionNo: f.admissionNo.trim(),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      rollNo: f.rollNo,
      gender: f.gender || null,
      dob: null
    }).subscribe({
      next: (created) => {
        this.students.update(arr => [...arr, created].sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999)));
        this.toast.success(`Added ${created.firstName} ${created.lastName}`);
        this.toggleForm();
      },
      error: err => {
        this.logger.error('Failed to create student', { error: String(err) });
        this.toast.error('Failed to add student');
      }
    });
  }

  remove(student: Student): void {
    this.studentApi.remove(student.id).subscribe({
      next: () => {
        this.students.update(arr => arr.filter(s => s.id !== student.id));
        this.toast.success(`Removed ${student.firstName} ${student.lastName}`);
      },
      error: err => {
        this.logger.error('Failed to delete student', { error: String(err) });
        this.toast.error('Failed to delete student');
      }
    });
  }

  startEdit(s: Student): void {
    this.editingId.set(s.id);
    this.editSubmitted.set(false);
    this.editForm.set({
      admissionNo: s.admissionNo,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNo: s.rollNo,
      gender: s.gender ?? '',
      dob: s.dob ?? ''
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  studentById(id: number): Student | undefined {
    return this.students().find(s => s.id === id);
  }

  openProfile(s: Student): void {
    this.router.navigate(['/admin/students', s.id]);
  }

  patchEdit<K extends keyof ReturnType<typeof this.editForm>>(key: K, value: ReturnType<typeof this.editForm>[K]) {
    this.editForm.update(f => ({ ...f, [key]: value }));
  }

  saveEdit(original: Student): void {
    this.editSubmitted.set(true);
    const f = this.editForm();
    if (!f.admissionNo.trim() || !f.firstName.trim() || !f.lastName.trim()) return;
    this.studentApi.update(original.id, {
      sectionId: original.sectionId,
      admissionNo: f.admissionNo.trim(),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      rollNo: f.rollNo,
      gender: f.gender || null,
      dob: f.dob || null
    }).subscribe({
      next: (updated) => {
        this.students.update(arr => arr.map(s => s.id === updated.id ? updated : s)
          .sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999)));
        this.toast.success(`Updated ${updated.firstName} ${updated.lastName}`);
        this.editingId.set(null);
      },
      error: err => {
        this.logger.error('Failed to update student', { error: String(err) });
        this.toast.error('Failed to update student');
      }
    });
  }
}
