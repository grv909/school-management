import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  LucideAngularModule,
  LayoutDashboard,
  CalendarRange,
  GraduationCap,
  Users,
  UserRound,
  BookOpen,
  ClipboardList,
  FileText,
  School,
  CalendarCheck,
  PencilLine,
  ChevronDown,
  LogOut,
  X,
  Inbox,
  FileQuestion,
  Check
} from 'lucide-angular';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/auth/jwt.interceptor';

import {
  ACADEMIC_YEAR_API,
  ANALYTICS_API,
  ATTENDANCE_API,
  AUTH_API,
  CLASS_API,
  EXAM_API,
  MARKS_API,
  REPORT_API,
  SCHOOL_API,
  SECTION_API,
  STUDENT_API,
  SUBJECT_API,
  TEACHER_API,
  TEACHER_ASSIGNMENT_API
} from './core/api/api.tokens';
import {
  AcademicYearHttpApi,
  AnalyticsHttpApi,
  AttendanceHttpApi,
  AuthHttpApi,
  ClassHttpApi,
  ExamHttpApi,
  MarksHttpApi,
  ReportHttpApi,
  SchoolHttpApi,
  SectionHttpApi,
  StudentHttpApi,
  SubjectHttpApi,
  TeacherAssignmentHttpApi,
  TeacherHttpApi
} from './core/api/http.apis';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimationsAsync(),
    importProvidersFrom(LucideAngularModule.pick({
      LayoutDashboard, CalendarRange, GraduationCap, Users, UserRound,
      BookOpen, ClipboardList, FileText, School, CalendarCheck, PencilLine,
      ChevronDown, LogOut, X, Inbox, FileQuestion, Check
    })),

    { provide: AUTH_API,           useClass: AuthHttpApi },
    { provide: CLASS_API,          useClass: ClassHttpApi },
    { provide: SECTION_API,        useClass: SectionHttpApi },
    { provide: SUBJECT_API,        useClass: SubjectHttpApi },
    { provide: ACADEMIC_YEAR_API,  useClass: AcademicYearHttpApi },
    { provide: STUDENT_API,        useClass: StudentHttpApi },
    { provide: TEACHER_API,        useClass: TeacherHttpApi },
    { provide: EXAM_API,           useClass: ExamHttpApi },
    { provide: MARKS_API,          useClass: MarksHttpApi },
    { provide: REPORT_API,         useClass: ReportHttpApi },
    { provide: ATTENDANCE_API,     useClass: AttendanceHttpApi },
    { provide: TEACHER_ASSIGNMENT_API, useClass: TeacherAssignmentHttpApi },
    { provide: ANALYTICS_API,      useClass: AnalyticsHttpApi },
    { provide: SCHOOL_API,         useClass: SchoolHttpApi }
  ]
};
