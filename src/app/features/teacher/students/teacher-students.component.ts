import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { STUDENT_API } from '../../../core/api/api.tokens';
import { Student } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { TeacherScopeService } from '../../../core/auth/teacher-scope.service';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

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
 * - Lists only students in sections the teacher is assigned to.
 * - Supports search across name + admission number.
 * - Inline edit for basic profile fields (name / roll / gender / dob).
 *
 * TODO: Replace mock service with real API integration later — server should authorise
 * the edit via JWT + assignment rules; here we trust the scope service to scope the list.
 */
@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-students.component.html'
})
export class TeacherStudentsComponent {
  private readonly scope = inject(TeacherScopeService);
  private readonly studentApi = inject(STUDENT_API);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly query = signal('');
  readonly loading = signal(true);
  readonly students = signal<Student[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly draft = signal<StudentEditDraft>({ firstName: '', lastName: '', rollNo: null, gender: '', dob: '' });

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
      const sectionIds = Array.from(this.scope.allowedSectionIds());
      if (sectionIds.length === 0) {
        this.loading.set(false);
        this.students.set([]);
        return;
      }
      forkJoin(sectionIds.map(id => this.studentApi.listBySection(id))).subscribe({
        next: lists => {
          const flat = lists.flat().sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999));
          this.students.set(flat);
          this.loading.set(false);
        },
        error: err => {
          this.logger.error('Failed to load teacher students', { error: String(err) });
          this.toast.error('Failed to load students');
          this.loading.set(false);
        }
      });
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
        this.students.update(arr => arr.map(s => s.id === updated.id ? updated : s));
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
