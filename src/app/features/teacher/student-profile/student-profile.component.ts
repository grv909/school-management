import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ANALYTICS_API, EXAM_API, STUDENT_API } from '../../../core/api/api.tokens';
import { Exam, Student, StudentAnalytics } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { BarChartComponent } from '../../../shared/ui/chart/bar-chart.component';
import { LineChartComponent } from '../../../shared/ui/chart/line-chart.component';
import { StatCardComponent } from '../../../shared/ui/stat-card/stat-card.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { GradeBadgeComponent } from '../../../shared/ui/grade-badge/grade-badge.component';
import { TeacherScopeService } from '../../../core/auth/teacher-scope.service';
import { AuthService } from '../../../core/auth/auth.service';
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
  imports: [
    PageHeaderComponent, BarChartComponent, LineChartComponent,
    StatCardComponent, SkeletonComponent, EmptyStateComponent, GradeBadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-profile.component.html'
})
export class StudentProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentApi = inject(STUDENT_API);
  private readonly examApi = inject(EXAM_API);
  private readonly analyticsApi = inject(ANALYTICS_API);
  private readonly scope = inject(TeacherScopeService);
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  // This component is mounted under both /teacher/students/:id and
  // /admin/students/:id — navigation must stay within whichever role's route
  // tree the profile is currently reached from.
  private get studentsListPath(): string {
    return this.auth.role() === 'ADMIN' ? '/admin/students' : '/teacher/students';
  }

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
      this.router.navigate([this.studentsListPath]);
      return;
    }
    forkJoin({
      student: this.studentApi.get(id),
      analytics: this.analyticsApi.forStudent(id)
    }).subscribe({
      next: ({ student, analytics }) => {
        this.student.set(student);
        this.analytics.set(analytics);
        this.loading.set(false);
        // Report cards should only list exams for the student's own class —
        // resolve classId from their sectionId before fetching exams.
        this.scope.classIdForSection(student.sectionId).subscribe(classId => {
          if (classId != null) {
            this.examApi.list(classId).subscribe(exams => this.exams.set(exams));
          }
        });
      },
      error: err => {
        this.logger.error('Failed to load student profile', { error: String(err) });
        this.loading.set(false);
      }
    });
  }

  back() { this.router.navigate([this.studentsListPath]); }

  openReportCard(examId: number) {
    const s = this.student();
    if (!s) return;
    this.router.navigate([this.studentsListPath, s.id, 'report-card', examId]);
  }
}
