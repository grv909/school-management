import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { SCHOOL_API } from '../../../core/api/api.tokens';
import { LayoutService } from '../layout.service';

interface NavItem {
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly layout = inject(LayoutService);
  private readonly schoolApi = inject(SCHOOL_API);

  readonly schoolName = signal('School ERP');

  constructor() {
    this.schoolApi.get().subscribe({
      next: s => this.schoolName.set(s.name),
      error: () => { /* keep fallback label — sidebar shouldn't break the app on this */ }
    });
  }

  /** Dismiss the mobile drawer after the user picks a destination. */
  onNavigate(): void {
    this.layout.closeMobileNav();
  }

  readonly nav = computed<NavGroup[]>(() => {
    if (this.auth.role() === 'ADMIN') {
      return [
        {
          label: 'Manage',
          items: [
            { label: 'Dashboard', path: '/admin' },
            { label: 'Academic Years', path: '/admin/academic-years' },
            { label: 'Classes',   path: '/admin/classes' },
            { label: 'Students',  path: '/admin/students' },
            { label: 'Teachers',  path: '/admin/teachers' },
            { label: 'Subjects',  path: '/admin/subjects' },
            { label: 'Exams',     path: '/admin/exams' }
          ]
        },
        {
          label: 'Output',
          items: [{ label: 'Report Cards', path: '/admin/reports' }]
        },
        {
          label: 'Settings',
          items: [{ label: 'School Details', path: '/admin/school' }]
        }
      ];
    }
    return [
      {
        label: 'Teach',
        items: [
          { label: 'Dashboard',   path: '/teacher' },
          { label: 'Attendance',  path: '/teacher/attendance' },
          { label: 'Marks Entry', path: '/teacher/marks' },
          { label: 'Students',    path: '/teacher/students' },
          { label: 'School Details', path: '/teacher/school' }
        ]
      }
    ];
  });
}
