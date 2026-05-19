import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ANALYTICS_API, EXAM_API, STUDENT_API } from '../../../core/api/api.tokens';
import { Exam, Student, StudentAnalytics } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { BarChartComponent } from '../../../shared/ui/chart/bar-chart.component';
import { LineChartComponent } from '../../../shared/ui/chart/line-chart.component';
import { LoggerService } from '../../../core/logging/logger.service';

/**
 * Per-student analytics dashboard.
 *
 * Auto-generated from existing marks + attendance: subject-wise %, exam comparison,
 * 6-month attendance trend, section rank.
 *
 * TODO: Replace mock service with real API integration later — backend should
 * expose /api/analytics/students/{id} returning this exact shape.
 */
@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [PageHeaderComponent, BarChartComponent, LineChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-profile.component.html'
})
export class StudentProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentApi = inject(STUDENT_API);
  private readonly examApi = inject(EXAM_API);
  private readonly analyticsApi = inject(ANALYTICS_API);
  private readonly logger = inject(LoggerService);

  readonly student = signal<Student | null>(null);
  readonly analytics = signal<StudentAnalytics | null>(null);
  readonly exams = signal<Exam[]>([]);
  readonly loading = signal(true);

  readonly subjectChartData = computed(() =>
    (this.analytics()?.bySubject ?? []).map(s => ({ label: s.subjectName.slice(0, 4), value: s.percentage }))
  );
  readonly examChartData = computed(() =>
    (this.analytics()?.byExam ?? []).map(e => ({ label: e.examName, value: e.percentage }))
  );
  readonly attendanceChartData = computed(() =>
    (this.analytics()?.attendanceTrend ?? []).map(t => ({ label: t.month, value: t.presentPct }))
  );

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.router.navigate(['/teacher/students']);
      return;
    }
    forkJoin({
      student: this.studentApi.get(id),
      analytics: this.analyticsApi.forStudent(id),
      exams: this.examApi.list()
    }).subscribe({
      next: ({ student, analytics, exams }) => {
        this.student.set(student);
        this.analytics.set(analytics);
        this.exams.set(exams);
        this.loading.set(false);
      },
      error: err => {
        this.logger.error('Failed to load student profile', { error: String(err) });
        this.loading.set(false);
      }
    });
  }

  back() { this.router.navigate(['/teacher/students']); }

  openReportCard(examId: number) {
    const s = this.student();
    if (!s) return;
    this.router.navigate(['/teacher/students', s.id, 'report-card', examId]);
  }
}
