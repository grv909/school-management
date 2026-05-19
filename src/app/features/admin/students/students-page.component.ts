import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { CLASS_API, SECTION_API, STUDENT_API } from '../../../core/api/api.tokens';
import { SchoolClass, Section, Student } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-students-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './students-page.component.html'
})
export class StudentsPageComponent {
  private readonly classApi = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly studentApi = inject(STUDENT_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly students = signal<Student[]>([]);

  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);

  readonly formOpen = signal(false);
  readonly form = signal<{ admissionNo: string; firstName: string; lastName: string; rollNo: number | null; gender: string }>({
    admissionNo: '', firstName: '', lastName: '', rollNo: null, gender: ''
  });

  readonly canShowStudents = computed(() => this.selectedSectionId() !== null);

  constructor() {
    this.classApi.list().subscribe(rows => this.classes.set(rows));
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
      this.studentApi.listBySection(sectionId).subscribe({
        next: rows => this.students.set(rows),
        error: err => this.logger.error('Failed to load students', { error: String(err) })
      });
    } else {
      this.students.set([]);
    }
  }

  toggleForm() {
    this.formOpen.update(o => !o);
    this.form.set({ admissionNo: '', firstName: '', lastName: '', rollNo: null, gender: '' });
  }

  patch<K extends keyof ReturnType<typeof this.form>>(key: K, value: ReturnType<typeof this.form>[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  submit(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId) return;
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
}
