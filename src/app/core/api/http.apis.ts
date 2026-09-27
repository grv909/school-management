import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  AcademicYear,
  AttendanceRow,
  BulkAttendanceRequest,
  BulkMarksRequest,
  CurrentUser,
  Exam,
  MarkRow,
  ReportCard,
  Role,
  SchoolClass,
  Section,
  Student,
  StudentAnalytics,
  Subject,
  Teacher,
  TeacherAssignment
} from '../models';
import {
  AcademicYearApi,
  AnalyticsApi,
  AttendanceApi,
  AuthApi,
  ClassApi,
  ExamApi,
  MarksApi,
  ReportApi,
  SectionApi,
  StudentApi,
  SubjectApi,
  TeacherApi,
  TeacherAssignmentApi
} from './api.tokens';

const BASE = () => environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AuthHttpApi implements AuthApi {
  private readonly http = inject(HttpClient);

  login(username: string, password: string) {
    return this.http.post<{ accessToken: string; role: Role; expiresIn: number }>(
      `${BASE()}/auth/login`, { username, password });
  }

  me() {
    return this.http.get<CurrentUser>(`${BASE()}/auth/me`);
  }
}

@Injectable({ providedIn: 'root' })
export class ClassHttpApi implements ClassApi {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<SchoolClass[]>(`${BASE()}/api/classes`); }
  create(input: { name: string; displayOrder: number }) {
    return this.http.post<SchoolClass>(`${BASE()}/api/classes`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class SectionHttpApi implements SectionApi {
  private readonly http = inject(HttpClient);
  listByClass(classId: number) {
    return this.http.get<Section[]>(`${BASE()}/api/sections`, { params: { classId } });
  }
  create(input: { classId: number; academicYearId: number; name: string }) {
    return this.http.post<Section>(`${BASE()}/api/sections`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class SubjectHttpApi implements SubjectApi {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<Subject[]>(`${BASE()}/api/subjects`); }
  create(input: { name: string; code: string; maxMarks: number }) {
    return this.http.post<Subject>(`${BASE()}/api/subjects`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class AcademicYearHttpApi implements AcademicYearApi {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<AcademicYear[]>(`${BASE()}/api/academic-years`); }
  create(input: Omit<AcademicYear, 'id'>) {
    return this.http.post<AcademicYear>(`${BASE()}/api/academic-years`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class StudentHttpApi implements StudentApi {
  private readonly http = inject(HttpClient);
  listBySection(sectionId: number) {
    return this.http.get<Student[]>(`${BASE()}/api/students`, { params: { sectionId } });
  }
  get(id: number) {
    return this.http.get<Student>(`${BASE()}/api/students/${id}`);
  }
  create(input: Omit<Student, 'id'>) {
    return this.http.post<Student>(`${BASE()}/api/students`, input);
  }
  update(id: number, input: Omit<Student, 'id'>) {
    return this.http.put<Student>(`${BASE()}/api/students/${id}`, input);
  }
  remove(id: number) {
    return this.http.delete<void>(`${BASE()}/api/students/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class TeacherHttpApi implements TeacherApi {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<Teacher[]>(`${BASE()}/api/teachers`); }
  create(input: { firstName: string; lastName: string; employeeNo: string; username: string; password: string }) {
    return this.http.post<Teacher>(`${BASE()}/api/teachers`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class ExamHttpApi implements ExamApi {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<Exam[]>(`${BASE()}/api/exams`); }
  create(input: Omit<Exam, 'id'>) {
    return this.http.post<Exam>(`${BASE()}/api/exams`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class MarksHttpApi implements MarksApi {
  private readonly http = inject(HttpClient);
  list(examId: number, sectionId: number, subjectId: number) {
    return this.http.get<MarkRow[]>(`${BASE()}/api/marks`, { params: { examId, sectionId, subjectId } });
  }
  bulkSave(req: BulkMarksRequest) {
    return this.http.post<{ upserted: number }>(`${BASE()}/api/marks/bulk`, req);
  }
}

@Injectable({ providedIn: 'root' })
export class ReportHttpApi implements ReportApi {
  reportCardUrl(studentId: number, examId: number): string {
    return `${BASE()}/api/reports/student/${studentId}/exam/${examId}`;
  }

  private readonly http = inject(HttpClient);
  buildReportCard(studentId: number, examId: number): Observable<ReportCard> {
    return this.http.get<ReportCard>(`${BASE()}/api/reports/student/${studentId}/exam/${examId}/data`);
  }
}

@Injectable({ providedIn: 'root' })
export class AttendanceHttpApi implements AttendanceApi {
  private readonly http = inject(HttpClient);
  list(sectionId: number, date: string) {
    return this.http.get<AttendanceRow[]>(`${BASE()}/api/attendance`, { params: { sectionId, date } });
  }
  bulkSave(req: BulkAttendanceRequest) {
    return this.http.post<{ upserted: number }>(`${BASE()}/api/attendance/bulk`, req);
  }
  sectionTrend(sectionId: number, days: number) {
    return this.http.get<Array<{ date: string; presentPct: number }>>(
      `${BASE()}/api/attendance/trend`, { params: { sectionId, days } });
  }
}

@Injectable({ providedIn: 'root' })
export class TeacherAssignmentHttpApi implements TeacherAssignmentApi {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<TeacherAssignment[]>(`${BASE()}/api/teacher-assignments`);
  }
  listForTeacherUsername(username: string) {
    return this.http.get<TeacherAssignment[]>(`${BASE()}/api/teacher-assignments`, { params: { username } });
  }
  create(input: Omit<TeacherAssignment, 'id'>) {
    return this.http.post<TeacherAssignment>(`${BASE()}/api/teacher-assignments`, input);
  }
  remove(id: number) {
    return this.http.delete<void>(`${BASE()}/api/teacher-assignments/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsHttpApi implements AnalyticsApi {
  private readonly http = inject(HttpClient);
  forStudent(studentId: number): Observable<StudentAnalytics> {
    return this.http.get<StudentAnalytics>(`${BASE()}/api/analytics/students/${studentId}`);
  }
  schoolOverview() {
    return this.http.get<{
      enrolmentByClass: Array<{ className: string; count: number }>;
      avgScoreBySubject: Array<{ subjectName: string; avg: number }>;
      attendanceTrend: Array<{ month: string; presentPct: number }>;
      genderDistribution: { male: number; female: number; other: number };
    }>(`${BASE()}/api/analytics/school-overview`);
  }
}
