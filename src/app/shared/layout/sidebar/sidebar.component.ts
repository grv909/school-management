import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { SCHOOL_API } from '../../../core/api/api.tokens';
import { LayoutService } from '../layout.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
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
            { label: 'Dashboard', path: '/admin', icon: 'layout-dashboard' },
            { label: 'Academic Years', path: '/admin/academic-years', icon: 'calendar-range' },
            { label: 'Classes',   path: '/admin/classes', icon: 'graduation-cap' },
            { label: 'Students',  path: '/admin/students', icon: 'users' },
            { label: 'Teachers',  path: '/admin/teachers', icon: 'user-round' },
            { label: 'Subjects',  path: '/admin/subjects', icon: 'book-open' },
            { label: 'Exams',     path: '/admin/exams', icon: 'clipboard-list' }
          ]
        },
        {
          label: 'Output',
          items: [{ label: 'Report Cards', path: '/admin/reports', icon: 'file-text' }]
        },
        {
          label: 'Settings',
          items: [{ label: 'School Details', path: '/admin/school', icon: 'school' }]
        }
      ];
    }
    return [
      {
        label: 'Teach',
        items: [
          { label: 'Dashboard',   path: '/teacher', icon: 'layout-dashboard' },
          { label: 'Attendance',  path: '/teacher/attendance', icon: 'calendar-check' },
          { label: 'Marks Entry', path: '/teacher/marks', icon: 'pencil-line' },
          { label: 'Students',    path: '/teacher/students', icon: 'users' },
          { label: 'School Details', path: '/teacher/school', icon: 'school' }
        ]
      }
    ];
  });
}
