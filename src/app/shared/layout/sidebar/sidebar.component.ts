import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { MOCK_SCHOOL } from '../../../core/mocks/mock-data';

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
  // FUTURE: replace MOCK_SCHOOL with a SchoolService that loads from /api/me/school.
  readonly schoolName = MOCK_SCHOOL.name;

  private readonly auth = inject(AuthService);

  readonly nav = computed<NavGroup[]>(() => {
    if (this.auth.role() === 'ADMIN') {
      return [
        {
          label: 'Manage',
          items: [
            { label: 'Dashboard', path: '/admin' },
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
          { label: 'Students',    path: '/teacher/students' }
        ]
      }
    ];
  });
}
