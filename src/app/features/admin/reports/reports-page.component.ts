import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CLASS_API, EXAM_API, SECTION_API, STUDENT_API } from '../../../core/api/api.tokens';
import { Exam, SchoolClass, Section, Student } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

// Root-provided so the picked class/section/student/exam survive the
// component being destroyed and recreated when navigating into a student's
// report card (a separate route) and back.
@Injectable({ providedIn: 'root' })
class ReportsFilterState {
  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);
  readonly selectedStudentId = signal<number | null>(null);
  readonly selectedExamId = signal<number | null>(null);
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports-page.component.html'
})
export class ReportsPageComponent {
  private readonly classApi = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly studentApi = inject(STUDENT_API);
  private readonly examApi = inject(EXAM_API);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);
  private readonly filterState = inject(ReportsFilterState);

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly students = signal<Student[]>([]);
  readonly exams = signal<Exam[]>([]);

  readonly selectedClassId = this.filterState.selectedClassId;
  readonly selectedSectionId = this.filterState.selectedSectionId;
  readonly selectedStudentId = this.filterState.selectedStudentId;
  readonly selectedExamId = this.filterState.selectedExamId;

  constructor() {
    this.classApi.list().subscribe(rows => {
      this.classes.set(rows);

      // Restore sections/students/exams for selections made before navigating
      // into a report card and back — filterState survives the component
      // recreation, but the derived lists below don't.
      const classId = this.selectedClassId();
      if (classId) {
        this.sectionApi.listByClass(classId).subscribe(s => {
          this.sections.set(s);
          const sectionId = this.selectedSectionId();
          if (sectionId) {
            this.studentApi.listBySection(sectionId).subscribe(st => this.students.set(st));
          }
        });
        this.examApi.list(classId).subscribe(rows => this.exams.set(rows));
      }
    });
  }

  onClassChange(id: number) {
    this.selectedClassId.set(id);
    this.selectedSectionId.set(null);
    this.selectedStudentId.set(null);
    this.selectedExamId.set(null);
    this.students.set([]);
    this.exams.set([]);
    if (id) {
      this.sectionApi.listByClass(id).subscribe(s => this.sections.set(s));
      this.examApi.list(id).subscribe(rows => this.exams.set(rows));
    }
  }

  onSectionChange(id: number) {
    this.selectedSectionId.set(id);
    this.selectedStudentId.set(null);
    if (id) this.studentApi.listBySection(id).subscribe(s => this.students.set(s));
  }

  generate() {
    const studentId = this.selectedStudentId();
    const examId = this.selectedExamId();
    if (!studentId || !examId) return;
    this.logger.info('Opening report card', { studentId, examId });
    // Navigate to the in-app viewer (authenticated HttpClient fetch) rather than
    // window.open()'ing the raw backend PDF URL directly — a plain browser
    // navigation can't carry the Authorization bearer header, so that always
    // 403'd regardless of role; the teacher side already uses this same
    // in-app pattern successfully.
    this.router.navigate(['/admin/students', studentId, 'report-card', examId]);
  }

  readonly classOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select' },
    ...this.classes().map(c => ({ value: c.id, label: c.name }))
  ]);

  readonly sectionOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select' },
    ...this.sections().map(s => ({ value: s.id, label: `Section ${s.name}` }))
  ]);

  readonly studentOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select' },
    ...this.students().map(s => ({ value: s.id, label: `${s.rollNo ?? '—'} · ${s.firstName} ${s.lastName}` }))
  ]);

  readonly examOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Select' },
    ...this.exams().map(e => ({ value: e.id, label: e.name }))
  ]);
}
