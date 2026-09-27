import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ATTENDANCE_API } from '../../../core/api/api.tokens';
import {
  AttendanceRow,
  AttendanceStatus,
  BulkAttendanceRequest,
  SchoolClass,
  Section
} from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { TeacherScopeService } from '../../../core/auth/teacher-scope.service';
import { ToastService } from '../../../core/ui/toast.service';
import { LoggerService } from '../../../core/logging/logger.service';

/**
 * Daily attendance marking grid for teachers.
 *
 * Class & section dropdowns are filtered through TeacherScopeService so each teacher
 * only sees classes/sections they're assigned to. Only the class teacher can mark
 * attendance — non-class teachers see an empty allowed list.
 *
 * TODO: Replace mock service with real API integration later and edit the project
 * accordingly by analysing the current code structure and ui.
 */
@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance.component.html'
})
export class AttendanceComponent {
  private readonly scope = inject(TeacherScopeService);
  private readonly attendanceApi = inject(ATTENDANCE_API);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly selectedClassId = signal<number | null>(null);
  readonly selectedSectionId = signal<number | null>(null);
  readonly date = signal<string>(new Date().toISOString().slice(0, 10));

  readonly rows = signal<AttendanceRow[]>([]);
  readonly saving = signal(false);
  readonly loadedKey = signal<string>('');

  // Attendance can only be marked/changed for today or yesterday — mirrors the backend restriction
  // in AttendanceService.bulkUpsert. Exposed as ISO date strings for the date input's min/max.
  readonly minDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  readonly maxDate = new Date().toISOString().slice(0, 10);

  readonly isDateEditable = computed(() => {
    const d = this.date();
    return d >= this.minDate && d <= this.maxDate;
  });

  readonly isClassTeacher = computed(() => {
    const sec = this.selectedSectionId();
    return sec !== null && this.scope.isClassTeacherOf(sec);
  });

  readonly canMark = computed(() => this.isClassTeacher() && this.isDateEditable());

  readonly summary = computed(() => {
    const rs = this.rows();
    return {
      present: rs.filter(r => r.status === 'PRESENT').length,
      absent: rs.filter(r => r.status === 'ABSENT').length,
      late: rs.filter(r => r.status === 'LATE').length,
      total: rs.length
    };
  });

  constructor() {
    // Load teacher scope, then derive class list.
    this.scope.load().subscribe(() => {
      this.scope.allowedClasses().subscribe(c => this.classes.set(c));
    });
  }

  onClassChange(id: number) {
    this.selectedClassId.set(id);
    this.selectedSectionId.set(null);
    this.rows.set([]);
    if (id) this.scope.allowedSectionsFor(id).subscribe(s => this.sections.set(s));
    else this.sections.set([]);
  }

  onSectionChange(id: number) {
    this.selectedSectionId.set(id);
    this.rows.set([]);
    this.loadedKey.set('');
  }

  load() {
    const sectionId = this.selectedSectionId();
    const date = this.date();
    if (!sectionId || !date) return;
    this.attendanceApi.list(sectionId, date).subscribe({
      next: rows => {
        this.rows.set(rows);
        this.loadedKey.set(`${sectionId}|${date}`);
      },
      error: err => {
        this.logger.error('Failed to load attendance', { error: String(err) });
        this.toast.error('Failed to load attendance');
      }
    });
  }

  setStatus(studentId: number, status: AttendanceStatus) {
    if (!this.canMark()) return;
    this.rows.update(rs => rs.map(r => r.studentId === studentId ? { ...r, status } : r));
  }

  markAll(status: AttendanceStatus) {
    if (!this.canMark()) return;
    this.rows.update(rs => rs.map(r => ({ ...r, status })));
  }

  save() {
    if (this.saving() || !this.canMark()) return;
    const req: BulkAttendanceRequest = {
      sectionId: this.selectedSectionId()!,
      date: this.date(),
      entries: this.rows().map(r => ({ studentId: r.studentId, status: r.status }))
    };
    this.saving.set(true);
    this.attendanceApi.bulkSave(req).subscribe({
      next: ({ upserted }) => {
        this.saving.set(false);
        this.toast.success(`Saved attendance for ${upserted} students`);
      },
      error: err => {
        this.saving.set(false);
        this.logger.error('Failed to save attendance', { error: String(err) });
        this.toast.error('Failed to save attendance');
      }
    });
  }
}
