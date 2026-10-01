import { Routes } from '@angular/router';

import { authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'admin' },

      // Admin area
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN'])],
        children: [
          { path: '', loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
          { path: 'academic-years', loadComponent: () => import('./features/admin/academic-years/academic-years-page.component').then(m => m.AcademicYearsPageComponent) },
          { path: 'classes',  loadComponent: () => import('./features/admin/classes/classes-page.component').then(m => m.ClassesPageComponent) },
          { path: 'students', loadComponent: () => import('./features/admin/students/students-page.component').then(m => m.StudentsPageComponent) },
          { path: 'students/:id', loadComponent: () => import('./features/teacher/student-profile/student-profile.component').then(m => m.StudentProfileComponent) },
          { path: 'students/:id/report-card/:examId', loadComponent: () => import('./features/teacher/report-card/report-card.component').then(m => m.ReportCardComponent) },
          { path: 'teachers', loadComponent: () => import('./features/admin/teachers/teachers-page.component').then(m => m.TeachersPageComponent) },
          { path: 'subjects', loadComponent: () => import('./features/admin/subjects/subjects-page.component').then(m => m.SubjectsPageComponent) },
          { path: 'exams',    loadComponent: () => import('./features/admin/exams/exams-page.component').then(m => m.ExamsPageComponent) },
          { path: 'reports',  loadComponent: () => import('./features/admin/reports/reports-page.component').then(m => m.ReportsPageComponent) },
          { path: 'school',   loadComponent: () => import('./features/school-details/school-details.component').then(m => m.SchoolDetailsComponent) }
        ]
      },

      // Teacher area
      {
        path: 'teacher',
        canActivate: [roleGuard(['TEACHER'])],
        children: [
          { path: '',              loadComponent: () => import('./features/teacher/dashboard/teacher-dashboard.component').then(m => m.TeacherDashboardComponent) },
          { path: 'attendance',    loadComponent: () => import('./features/teacher/attendance/attendance.component').then(m => m.AttendanceComponent) },
          { path: 'marks',         loadComponent: () => import('./features/teacher/marks-entry/marks-entry.component').then(m => m.MarksEntryComponent) },
          { path: 'students',      loadComponent: () => import('./features/teacher/students/teacher-students.component').then(m => m.TeacherStudentsComponent) },
          { path: 'students/:id',  loadComponent: () => import('./features/teacher/student-profile/student-profile.component').then(m => m.StudentProfileComponent) },
          { path: 'students/:id/report-card/:examId', loadComponent: () => import('./features/teacher/report-card/report-card.component').then(m => m.ReportCardComponent) },
          { path: 'school',        loadComponent: () => import('./features/school-details/school-details.component').then(m => m.SchoolDetailsComponent) }
        ]
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
