import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CLASS_API, EXAM_API, REPORT_API, SECTION_API, STUDENT_API } from '../../../core/api/api.tokens';
import { Exam, SchoolClass, Section, Student } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports-page.component.html'
})
export class ReportsPageComponent {
  private readonly classApi = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly studentApi = inject(STUDENT_API);
  private readonly examApi = inject(EXAM_API);
  private readonly reportApi = inject(REPORT_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly students = signal<Student[]>([]);
  readonly exams = signal<Exam[]>([]);

  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);
  readonly selectedStudentId = signal<number | null>(null);
  readonly selectedExamId = signal<number | null>(null);

  constructor() {
    this.classApi.list().subscribe(rows => this.classes.set(rows));
    this.examApi.list().subscribe(rows => this.exams.set(rows));
  }

  onClassChange(id: number) {
    this.selectedClassId.set(id);
    this.selectedSectionId.set(null);
    this.selectedStudentId.set(null);
    this.students.set([]);
    if (id) this.sectionApi.listByClass(id).subscribe(s => this.sections.set(s));
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
    const url = this.reportApi.reportCardUrl(studentId, examId);
    this.logger.info('Opening report card', { studentId, examId });
    // FUTURE: when real backend is wired, this URL hits /api/reports/... and the browser renders the PDF.
    window.open(url, '_blank', 'noopener');
    this.toast.success('Report card opened in a new tab');
  }
}
