import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EXAM_API, MARKS_API } from '../../../core/api/api.tokens';
import { TeacherScopeService } from '../../../core/auth/teacher-scope.service';
import {
  BulkMarksRequest,
  Exam,
  MarkRow,
  SchoolClass,
  Section,
  Subject
} from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

/**
 * Bulk marks entry grid.
 *
 * UX requirement (drives the demo): tab-key navigation across the marks inputs so a
 * teacher can rip through 30 students quickly. The component holds an in-memory copy
 * of the rows so edits don't ping the API per-keystroke; a single "Save all" issues
 * one bulk request.
 */
@Component({
  selector: 'app-marks-entry',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marks-entry.component.html'
})
export class MarksEntryComponent {
  private readonly scope = inject(TeacherScopeService);
  private readonly examApi = inject(EXAM_API);
  private readonly marksApi = inject(MARKS_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly exams = signal<Exam[]>([]);

  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedExamId = signal<number | null>(null);

  readonly rows = signal<MarkRow[]>([]);
  readonly saving = signal(false);

  readonly canLoad = computed(() =>
    !!this.selectedSectionId() && !!this.selectedSubjectId() && !!this.selectedExamId()
  );

  readonly maxMarks = computed(() => {
    const id = this.selectedSubjectId();
    return id ? (this.subjects().find(s => s.id === id)?.maxMarks ?? 100) : 100;
  });

  constructor() {
    // Only teacher-scoped classes/sections/subjects — depends on TeacherAssignment rows.
    this.scope.load().subscribe(() => {
      this.scope.allowedClasses().subscribe(r => this.classes.set(r));
    });
    this.examApi.list().subscribe(r => this.exams.set(r));
  }

  onClassChange(id: number) {
    this.selectedClassId.set(id);
    this.selectedSectionId.set(null);
    this.selectedSubjectId.set(null);
    this.subjects.set([]);
    this.rows.set([]);
    if (id) this.scope.allowedSectionsFor(id).subscribe(s => this.sections.set(s));
  }

  onSectionChange(id: number) {
    this.selectedSectionId.set(id);
    this.selectedSubjectId.set(null);
    this.rows.set([]);
    if (id) this.scope.allowedSubjectsFor(id).subscribe(s => this.subjects.set(s));
    else this.subjects.set([]);
  }

  loadGrid() {
    if (!this.canLoad()) return;
    this.marksApi.list(this.selectedExamId()!, this.selectedSectionId()!, this.selectedSubjectId()!)
      .subscribe({
        next: rows => {
          this.rows.set(rows);
          this.logger.info('Loaded marks grid', {
            examId: this.selectedExamId(),
            sectionId: this.selectedSectionId(),
            subjectId: this.selectedSubjectId(),
            rowCount: rows.length
          });
        },
        error: err => {
          this.logger.error('Failed to load marks', { error: String(err) });
          this.toast.error('Failed to load marks');
        }
      });
  }

  updateMark(studentId: number, value: number | null) {
    this.rows.update(arr => arr.map(r => r.studentId === studentId ? { ...r, marksObtained: value } : r));
  }

  save() {
    if (this.saving()) return;
    const entries = this.rows()
      .filter(r => r.marksObtained !== null && r.marksObtained !== undefined)
      .map(r => ({ studentId: r.studentId, marksObtained: Number(r.marksObtained) }));
    if (entries.length === 0) {
      this.toast.warn('Enter at least one mark before saving');
      return;
    }
    const req: BulkMarksRequest = {
      examId: this.selectedExamId()!,
      sectionId: this.selectedSectionId()!,
      subjectId: this.selectedSubjectId()!,
      entries
    };
    this.saving.set(true);
    this.marksApi.bulkSave(req).subscribe({
      next: ({ upserted }) => {
        this.saving.set(false);
        this.toast.success(`Saved ${upserted} entries`);
      },
      error: err => {
        this.saving.set(false);
        this.logger.error('Failed to save marks', { error: String(err) });
        this.toast.error('Failed to save marks');
      }
    });
  }
}
