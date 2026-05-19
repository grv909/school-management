/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  AcademicYear,
  BulkMarksRequest,
  CurrentUser,
  Exam,
  MarkRow,
  ReportCard,
  Role,
  SchoolClass,
  Section,
  Student,
  Subject,
  Teacher
} from '../models';
import {
  AcademicYearApi,
  AuthApi,
  ClassApi,
  ExamApi,
  MarksApi,
  ReportApi,
  SectionApi,
  StudentApi,
  SubjectApi,
  TeacherApi
} from './api.tokens';

/**
 * FUTURE: real implementations to be wired when the backend is reachable via AWS API Gateway.
 *
 * Each method below shows the intended endpoint. The bodies throw deliberately so that
 * any attempt to use them while mocks are still active fails loudly rather than silently
 * making a network request that 404s.
 *
 * To switch over:
 *   1. Build & deploy backend behind AWS API Gateway.
 *   2. Set environment.apiBaseUrl and environment.useMocks = false.
 *   3. In app.config.ts replace `useClass: *MockApi` with `useClass: *HttpApi`.
 *   4. Replace each `throw NOT_WIRED` below with the corresponding this.http.* call shown in the comment.
 */
const NOT_WIRED = 'HTTP API not yet wired — see api/http.apis.ts and switch providers in app.config.ts';
function notWired<T>(): Observable<T> {
  return throwError(() => new Error(NOT_WIRED));
}

@Injectable({ providedIn: 'root' })
export class AuthHttpApi implements AuthApi {
  private readonly http = inject(HttpClient);

  login(username: string, password: string) {
    // FUTURE: return this.http.post<{accessToken:string; role:Role; expiresIn:number}>(
    //   `${environment.apiBaseUrl}/auth/login`, { username, password });
    return notWired<{ accessToken: string; role: Role; expiresIn: number }>();
  }

  me() {
    // FUTURE: return this.http.get<CurrentUser>(`${environment.apiBaseUrl}/auth/me`);
    return notWired<CurrentUser>();
  }
}

@Injectable({ providedIn: 'root' })
export class ClassHttpApi implements ClassApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET /api/classes ; POST /api/classes
  list() { return notWired<SchoolClass[]>(); }
  create(_input: { name: string; displayOrder: number }) { return notWired<SchoolClass>(); }
}

@Injectable({ providedIn: 'root' })
export class SectionHttpApi implements SectionApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET /api/sections?classId= ; POST /api/sections
  listByClass(_classId: number) { return notWired<Section[]>(); }
  create(_input: { classId: number; academicYearId: number; name: string }) { return notWired<Section>(); }
}

@Injectable({ providedIn: 'root' })
export class SubjectHttpApi implements SubjectApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET/POST /api/subjects
  list() { return notWired<Subject[]>(); }
  create(_input: { name: string; code: string; maxMarks: number }) { return notWired<Subject>(); }
}

@Injectable({ providedIn: 'root' })
export class AcademicYearHttpApi implements AcademicYearApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET/POST /api/academic-years
  list() { return notWired<AcademicYear[]>(); }
  create(_input: Omit<AcademicYear, 'id'>) { return notWired<AcademicYear>(); }
}

@Injectable({ providedIn: 'root' })
export class StudentHttpApi implements StudentApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET /api/students?sectionId=, GET /api/students/{id}, POST/PUT/DELETE /api/students/{id}
  listBySection(_sectionId: number) { return notWired<Student[]>(); }
  get(_id: number) { return notWired<Student>(); }
  create(_input: Omit<Student, 'id'>) { return notWired<Student>(); }
  update(_id: number, _input: Omit<Student, 'id'>) { return notWired<Student>(); }
  remove(_id: number) { return notWired<void>(); }
}

@Injectable({ providedIn: 'root' })
export class TeacherHttpApi implements TeacherApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET/POST /api/teachers
  list() { return notWired<Teacher[]>(); }
  create(_input: { firstName: string; lastName: string; employeeNo: string; username: string; password: string }) {
    return notWired<Teacher>();
  }
}

@Injectable({ providedIn: 'root' })
export class ExamHttpApi implements ExamApi {
  private readonly http = inject(HttpClient);
  // FUTURE: GET/POST /api/exams
  list() { return notWired<Exam[]>(); }
  create(_input: Omit<Exam, 'id'>) { return notWired<Exam>(); }
}

@Injectable({ providedIn: 'root' })
export class MarksHttpApi implements MarksApi {
  private readonly http = inject(HttpClient);
  // FUTURE:
  //  GET /api/marks?examId=&sectionId=&subjectId=
  //  POST /api/marks/bulk
  list(_examId: number, _sectionId: number, _subjectId: number) { return notWired<MarkRow[]>(); }
  bulkSave(_req: BulkMarksRequest) { return notWired<{ upserted: number }>(); }
}

@Injectable({ providedIn: 'root' })
export class ReportHttpApi implements ReportApi {
  // FUTURE: returns a direct backend URL; browser will GET and render the PDF.
  reportCardUrl(studentId: number, examId: number): string {
    return `${environment.apiBaseUrl}/api/reports/student/${studentId}/exam/${examId}`;
  }
  // FUTURE: GET /api/reports/student/{studentId}/exam/{examId}/data → ReportCard JSON
  buildReportCard(_studentId: number, _examId: number): Observable<ReportCard> {
    return notWired<ReportCard>();
  }
}
