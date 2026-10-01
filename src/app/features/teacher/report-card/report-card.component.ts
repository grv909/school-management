import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';

import { REPORT_API } from '../../../core/api/api.tokens';
import { ReportCard } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { GradeBadgeComponent } from '../../../shared/ui/grade-badge/grade-badge.component';
import { AuthService } from '../../../core/auth/auth.service';
import { LoggerService } from '../../../core/logging/logger.service';

/**
 * Auto-generated report card viewer.
 *
 * Pulls a fully-resolved ReportCard payload from the API and renders it as a
 * print-friendly document. The "Print" button triggers window.print(); the
 * @media print styles strip chrome so the report card itself fills the page.
 *
 * TODO: Replace mock service with real API integration later — backend can return
 * the same shape, or pre-rendered PDF served from a CDN.
 */
@Component({
  selector: 'app-report-card',
  standalone: true,
  imports: [PageHeaderComponent, DecimalPipe, SkeletonComponent, EmptyStateComponent, GradeBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-card.component.html'
})
export class ReportCardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reportApi = inject(REPORT_API);
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  readonly card = signal<ReportCard | null>(null);
  readonly loading = signal(true);

  // This component is mounted under both /teacher/students/:id/report-card/:examId
  // and /admin/students/:id/report-card/:examId — navigation must stay within
  // whichever role's route tree the viewer is currently reached from.
  private get studentsListPath(): string {
    return this.auth.role() === 'ADMIN' ? '/admin/students' : '/teacher/students';
  }

  constructor() {
    const studentId = Number(this.route.snapshot.paramMap.get('id'));
    const examId = Number(this.route.snapshot.paramMap.get('examId'));
    if (!Number.isFinite(studentId) || !Number.isFinite(examId)) {
      this.router.navigate([this.studentsListPath]);
      return;
    }
    this.reportApi.buildReportCard(studentId, examId).subscribe({
      next: c => { this.card.set(c); this.loading.set(false); },
      error: err => {
        this.logger.error('Failed to build report card', { error: String(err) });
        this.loading.set(false);
      }
    });
  }

  back() { window.history.back(); }
  print() { window.print(); }
}
