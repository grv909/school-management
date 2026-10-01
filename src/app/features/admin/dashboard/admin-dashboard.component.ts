import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ANALYTICS_API,
  CLASS_API,
  EXAM_API,
  STUDENT_API,
  SUBJECT_API,
  TEACHER_API
} from '../../../core/api/api.tokens';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { BarChartComponent } from '../../../shared/ui/chart/bar-chart.component';
import { LineChartComponent } from '../../../shared/ui/chart/line-chart.component';
import { DonutChartComponent } from '../../../shared/ui/chart/donut-chart.component';
import { StatCardComponent } from '../../../shared/ui/stat-card/stat-card.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { MOCK_SECTIONS } from '../../../core/mocks/mock-data';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    PageHeaderComponent, BarChartComponent, LineChartComponent, DonutChartComponent,
    StatCardComponent, SkeletonComponent, EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent {
  private readonly classApi = inject(CLASS_API);
  private readonly subjectApi = inject(SUBJECT_API);
  private readonly studentApi = inject(STUDENT_API);
  private readonly teacherApi = inject(TEACHER_API);
  private readonly examApi = inject(EXAM_API);
  private readonly analyticsApi = inject(ANALYTICS_API);
  private readonly router = inject(Router);

  readonly stats = signal({ classes: 0, subjects: 0, students: 0, teachers: 0, exams: 0 });
  readonly loading = signal(true);
  readonly enrolmentByClass = signal<Array<{ label: string; value: number }>>([]);
  readonly avgScoreBySubject = signal<Array<{ label: string; value: number }>>([]);
  readonly attendanceTrend = signal<Array<{ label: string; value: number }>>([]);
  readonly genderDistribution = signal<Array<{ label: string; value: number; color?: string }>>([]);

  constructor() {
    const studentRequests = MOCK_SECTIONS.map(s => this.studentApi.listBySection(s.id));
    forkJoin({
      classes:  this.classApi.list(),
      subjects: this.subjectApi.list(),
      teachers: this.teacherApi.list(),
      exams:    this.examApi.list(),
      studentsByList: forkJoin(studentRequests),
      overview: this.analyticsApi.schoolOverview()
    }).subscribe(({ classes, subjects, teachers, exams, studentsByList, overview }) => {
      this.stats.set({
        classes: classes.length,
        subjects: subjects.length,
        teachers: teachers.length,
        exams: exams.length,
        students: studentsByList.flat().length
      });
      this.enrolmentByClass.set(overview.enrolmentByClass.map(e => ({ label: e.className.replace('Class ', ''), value: e.count })));
      this.avgScoreBySubject.set(overview.avgScoreBySubject.map(s => ({ label: s.subjectName.slice(0, 4), value: s.avg })));
      this.attendanceTrend.set(overview.attendanceTrend.map(t => ({ label: t.month, value: t.presentPct })));
      // No explicit `color` per segment — DonutChartComponent's own token-based
      // default palette (var(--accent), etc.) applies, so this picks up theme
      // changes automatically instead of duplicating hardcoded hex values here.
      this.genderDistribution.set([
        { label: 'Male',   value: overview.genderDistribution.male },
        { label: 'Female', value: overview.genderDistribution.female },
        { label: 'Other',  value: overview.genderDistribution.other }
      ]);
      this.loading.set(false);
    });
  }

  readonly isEmpty = computed(() => {
    const s = this.stats();
    return s.classes === 0 && s.students === 0 && s.teachers === 0;
  });

  go(path: string) { this.router.navigate([path]); }
}
