import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

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
  SECTION_API,
  STUDENT_API,
  SUBJECT_API,
  TEACHER_API,
  TEACHER_ASSIGNMENT_API
} from './core/api/api.tokens';
import {
  AcademicYearMockApi,
  AnalyticsMockApi,
  AttendanceMockApi,
  AuthMockApi,
  ClassMockApi,
  ExamMockApi,
  MarksMockApi,
  ReportMockApi,
  SectionMockApi,
  StudentMockApi,
  SubjectMockApi,
  TeacherAssignmentMockApi,
  TeacherMockApi
} from './core/mocks/mock.apis';
// FUTURE (real backend): swap the `useClass` below to *HttpApi.
// import { AcademicYearHttpApi, AuthHttpApi, ClassHttpApi, ExamHttpApi, MarksHttpApi,
//          ReportHttpApi, SectionHttpApi, StudentHttpApi, SubjectHttpApi, TeacherHttpApi } from './core/api/http.apis';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),

    // FUTURE: replace *MockApi with *HttpApi when the backend (behind AWS API Gateway) is live.
    { provide: AUTH_API,           useClass: AuthMockApi },
    { provide: CLASS_API,          useClass: ClassMockApi },
    { provide: SECTION_API,        useClass: SectionMockApi },
    { provide: SUBJECT_API,        useClass: SubjectMockApi },
    { provide: ACADEMIC_YEAR_API,  useClass: AcademicYearMockApi },
    { provide: STUDENT_API,        useClass: StudentMockApi },
    { provide: TEACHER_API,        useClass: TeacherMockApi },
    { provide: EXAM_API,           useClass: ExamMockApi },
    { provide: MARKS_API,          useClass: MarksMockApi },
    { provide: REPORT_API,         useClass: ReportMockApi },
    { provide: ATTENDANCE_API,     useClass: AttendanceMockApi },
    { provide: TEACHER_ASSIGNMENT_API, useClass: TeacherAssignmentMockApi },
    { provide: ANALYTICS_API,      useClass: AnalyticsMockApi }
  ]
};
