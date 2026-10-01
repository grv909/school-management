import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { STUDENT_API } from '../../../core/api/api.tokens';
import { SchoolClass, Section, Student } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SelectComponent, SelectOption, GENDER_OPTIONS_WITH_OTHER } from '../../../shared/ui/select/select.component';
import { TeacherScopeService } from '../../../core/auth/teacher-scope.service';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

// Root-provided (not route-provided) so the picked class/section — and the
// last-loaded roster for that section — survive the component being
// destroyed and recreated when navigating to a student profile and back.
// Without this, returning from a profile re-fetched classes/sections/roster
// from the API every time even though nothing had changed.
@Injectable({ providedIn: 'root' })
class TeacherStudentsFilterState {
  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);

  // Keyed by sectionId so switching between two previously-viewed sections
  // (not just returning from a profile) also skips a redundant re-fetch.
  rosterCache = new Map<number, Student[]>();
}

interface StudentEditDraft {
  firstName: string;
  lastName: string;
  rollNo: number | null;
  gender: string;
  dob: string;
}

/**
 * Teacher-facing student directory.
 *
 * - Teacher picks one of their assigned classes, then one of its sections —
 *   students load for that section only, rather than flattening every
 *   assigned section into a single list (which became unusable once a
 *   teacher had more than a handful of sections).
 * - Supports search across name + admission number within the loaded section.
 * - Inline edit for basic profile fields (name / roll / gender / dob).
 *
 * TODO: Replace mock service with real API integration later — server should authorise
 * the edit via JWT + assignment rules; here we trust the scope service to scope the list.
 */
@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent, ModalComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-students.component.html'
})
export class TeacherStudentsComponent {
  private readonly scope = inject(TeacherScopeService);
  private readonly studentApi = inject(STUDENT_API);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);
  private readonly filterState = inject(TeacherStudentsFilterState);

  readonly query = signal('');
  readonly loading = signal(false);
  readonly scopeLoading = signal(true);
  readonly students = signal<Student[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly draft = signal<StudentEditDraft>({ firstName: '', lastName: '', rollNo: null, gender: '', dob: '' });

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly selectedClassId = this.filterState.selectedClassId;
  readonly selectedSectionId = this.filterState.selectedSectionId;

  readonly genderOptions = GENDER_OPTIONS_WITH_OTHER;

  readonly classOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select class' },
    ...this.classes().map(c => ({ value: c.id, label: c.name }))
  ]);

  readonly sectionOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select section' },
    ...this.sections().map(s => ({ value: s.id, label: `Section ${s.name}` }))
  ]);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.students();
    if (!q) return list;
    return list.filter(s =>
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.scope.load().subscribe(() => {
      this.scope.allowedClasses().subscribe(rows => {
        this.classes.set(rows);
        this.scopeLoading.set(false);

        // Restore sections/roster for a class+section picked before navigating
        // away (e.g. into a student profile) — filterState survives the
        // component recreation, but the derived lists below don't.
        const classId = this.selectedClassId();
        if (classId) {
          this.scope.allowedSectionsFor(classId).subscribe(s => {
            this.sections.set(s);
            const sectionId = this.selectedSectionId();
            if (sectionId) this.loadStudents(sectionId);
          });
        }
      });
    });
  }

  onClassChange(classId: number): void {
    this.selectedClassId.set(classId);
    this.selectedSectionId.set(null);
    this.sections.set([]);
    this.students.set([]);
    if (classId) {
      this.scope.allowedSectionsFor(classId).subscribe(s => this.sections.set(s));
    }
  }

  onSectionChange(sectionId: number): void {
    this.selectedSectionId.set(sectionId);
    this.students.set([]);
    if (!sectionId) return;
    this.loadStudents(sectionId);
  }

  private loadStudents(sectionId: number): void {
    const cached = this.filterState.rosterCache.get(sectionId);
    if (cached) {
      this.students.set(cached);
      return;
    }
    this.loading.set(true);
    this.studentApi.listBySection(sectionId).subscribe({
      next: rows => {
        const sorted = rows.slice().sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999));
        this.filterState.rosterCache.set(sectionId, sorted);
        this.students.set(sorted);
        this.loading.set(false);
      },
      error: err => {
        this.logger.error('Failed to load teacher students', { error: String(err) });
        this.toast.error('Failed to load students');
        this.loading.set(false);
      }
    });
  }

  startEdit(s: Student) {
    this.editingId.set(s.id);
    this.draft.set({
      firstName: s.firstName,
      lastName: s.lastName,
      rollNo: s.rollNo,
      gender: s.gender ?? '',
      dob: s.dob ?? ''
    });
  }

  cancelEdit() { this.editingId.set(null); }

  studentById(id: number): Student | undefined {
    return this.students().find(s => s.id === id);
  }

  patchDraft<K extends keyof StudentEditDraft>(key: K, value: StudentEditDraft[K]) {
    this.draft.update(d => ({ ...d, [key]: value }));
  }

  saveEdit(original: Student) {
    const d = this.draft();
    if (!d.firstName.trim() || !d.lastName.trim()) return;
    this.studentApi.update(original.id, {
      sectionId: original.sectionId,
      admissionNo: original.admissionNo,
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      rollNo: d.rollNo,
      gender: d.gender || null,
      dob: d.dob || null
    }).subscribe({
      next: updated => {
        const next = this.students().map(s => s.id === updated.id ? updated : s);
        this.students.set(next);
        this.filterState.rosterCache.set(updated.sectionId, next);
        this.toast.success(`Updated ${updated.firstName} ${updated.lastName}`);
        this.editingId.set(null);
      },
      error: err => {
        this.logger.error('Failed to update student', { error: String(err) });
        this.toast.error('Failed to update student');
      }
    });
  }

  openProfile(s: Student) {
    this.router.navigate(['/teacher/students', s.id]);
  }

  canEdit(s: Student): boolean {
    return this.scope.isClassTeacherOf(s.sectionId);
  }
}
