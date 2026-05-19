import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { ATTENDANCE_API, STUDENT_API } from '../../../core/api/api.tokens';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { BarChartComponent } from '../../../shared/ui/chart/bar-chart.component';
import { LineChartComponent } from '../../../shared/ui/chart/line-chart.component';
import { AuthService } from '../../../core/auth/auth.service';
import { TeacherScopeService } from '../../../core/auth/teacher-scope.service';

interface SectionTile {
  sectionId: number;
  label: string;
  studentCount: number;
  isClassTeacher: boolean;
}

/**
 * Teacher landing page. Shows quick KPIs across the teacher's assigned sections plus
 * a 14-day attendance trend for the class-teacher section.
 *
 * TODO: Replace mock service with real API integration later — every observable here
 * already goes through an InjectionToken, so the swap is provider-only.
 */
@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [PageHeaderComponent, BarChartComponent, LineChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teacher-dashboard.component.html'
})
export class TeacherDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly scope = inject(TeacherScopeService);
  private readonly studentApi = inject(STUDENT_API);
  private readonly attendanceApi = inject(ATTENDANCE_API);
  private readonly router = inject(Router);

  readonly username = this.auth.session()?.username ?? '';

  readonly tiles = signal<SectionTile[]>([]);
  readonly attendanceTrend = signal<Array<{ label: string; value: number }>>([]);
  readonly loading = signal(true);

  readonly tileChartData = computed(() =>
    this.tiles().map(t => ({ label: t.label, value: t.studentCount }))
  );

  readonly classTeacherSections = computed(() => this.tiles().filter(t => t.isClassTeacher));
  readonly totalStudents = computed(() => this.tiles().reduce((acc, t) => acc + t.studentCount, 0));

  constructor() {
    this.scope.load().subscribe(assignments => {
      const sectionIds = Array.from(new Set(assignments.map(a => a.sectionId)));
      if (sectionIds.length === 0) {
        this.loading.set(false);
        return;
      }
      // Build section tiles + load student counts.
      forkJoin(sectionIds.map(id => this.studentApi.listBySection(id))).subscribe(lists => {
        const sectionMeta = new Map<number, SectionTile>();
        sectionIds.forEach((id, i) => {
          const isCT = assignments.some(a => a.sectionId === id && a.isClassTeacher);
          sectionMeta.set(id, {
            sectionId: id,
            label: `Section ${id}`, // overridden below if we know the section name
            studentCount: lists[i].length,
            isClassTeacher: isCT
          });
        });
        // Look up nicer section labels via the assignments + class/section data.
        // The scope service already loaded; for simplicity, just label by class/section.
        this.scope.allowedClasses().subscribe(classes => {
          // For each class, resolve which of our sectionIds belong, set proper labels.
          const work = classes.map(c => this.scope.allowedSectionsFor(c.id).pipe());
          if (work.length === 0) {
            this.tiles.set(Array.from(sectionMeta.values()));
            this.loading.set(false);
            return;
          }
          forkJoin(work).subscribe(secLists => {
            classes.forEach((c, idx) => {
              for (const sec of secLists[idx]) {
                const tile = sectionMeta.get(sec.id);
                if (tile) tile.label = `${c.name}-${sec.name}`;
              }
            });
            this.tiles.set(Array.from(sectionMeta.values()));

            // Load attendance trend for the first class-teacher section (the most useful chart).
            const ct = Array.from(sectionMeta.values()).find(t => t.isClassTeacher);
            if (ct) {
              this.attendanceApi.sectionTrend(ct.sectionId, 14).subscribe(rows => {
                this.attendanceTrend.set(rows.map(r => ({
                  // Use last two characters of the date as a short month-day label.
                  label: r.date.slice(8, 10),
                  value: r.presentPct
                })));
                this.loading.set(false);
              });
            } else {
              this.loading.set(false);
            }
          });
        });
      });
    });
  }

  goAttendance() { this.router.navigate(['/teacher/attendance']); }
  goMarks() { this.router.navigate(['/teacher/marks']); }
  goStudents() { this.router.navigate(['/teacher/students']); }
}
