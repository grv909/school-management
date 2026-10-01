import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
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
  School,
  SchoolClass,
  Section,
  Student,
  StudentAnalytics,
  Subject,
  Teacher,
  TeacherAssignment
} from '../models';

/**
 * One InjectionToken per resource.
 *
 * Two implementations live in core/mocks (used now) and core/api/*.http.api.ts (stubs,
 * to be wired when the backend is fronted by AWS API Gateway). Components depend on
 * the token, never on the concrete class — Dependency Inversion.
 */

export interface AuthApi {
  login(username: string, password: string): Observable<{ accessToken: string; role: Role; expiresIn: number }>;
  me(): Observable<CurrentUser>;
}

export interface ClassApi {
  list(): Observable<SchoolClass[]>;
  create(input: { name: string }): Observable<SchoolClass>;
  update(id: number, input: { name: string }): Observable<SchoolClass>;
  // Fails (409) server-side if the class still has sections — remove those first.
  remove(id: number): Observable<void>;
  // Replaces the full set of subjects taught in this class. ADMIN only (enforced server-side).
  assignSubjects(id: number, subjectIds: number[]): Observable<void>;
}

export interface SectionApi {
  listByClass(classId: number): Observable<Section[]>;
  create(input: { classId: number; academicYearId: number; name: string }): Observable<Section>;
}

export interface SubjectApi {
  list(classId?: number): Observable<Subject[]>;
  create(input: { name: string; code: string; maxMarks: number }): Observable<Subject>;
  update(id: number, input: { name: string; code: string; maxMarks: number }): Observable<Subject>;
  // Fails (409) server-side if the subject is still assigned to a class.
  remove(id: number): Observable<void>;
}

export interface AcademicYearApi {
  list(): Observable<AcademicYear[]>;
  create(input: Omit<AcademicYear, 'id'>): Observable<AcademicYear>;
  update(id: number, input: Omit<AcademicYear, 'id'>): Observable<AcademicYear>;
  // Fails (409) server-side if the academic year still has sections.
  remove(id: number): Observable<void>;
}

export interface StudentApi {
  listBySection(sectionId: number): Observable<Student[]>;
  get(id: number): Observable<Student>;
  create(input: Omit<Student, 'id'>): Observable<Student>;
  update(id: number, input: Omit<Student, 'id'>): Observable<Student>;
  remove(id: number): Observable<void>;
}

export interface TeacherApi {
  list(): Observable<Teacher[]>;
  create(input: { firstName: string; lastName: string; employeeNo: string; username: string; password: string }): Observable<Teacher>;
  update(id: number, input: { firstName: string; lastName: string; employeeNo: string }): Observable<Teacher>;
  // Fails (409) server-side if the teacher still has active class/section assignments.
  remove(id: number): Observable<void>;
}

export interface ExamApi {
  list(classId?: number): Observable<Exam[]>;
  create(input: Omit<Exam, 'id'>): Observable<Exam>;
  update(id: number, input: Omit<Exam, 'id'>): Observable<Exam>;
  // Fails (409) server-side if marks have already been entered for this exam.
  remove(id: number): Observable<void>;
}

export interface MarksApi {
  list(examId: number, sectionId: number, subjectId: number): Observable<MarkRow[]>;
  bulkSave(req: BulkMarksRequest): Observable<{ upserted: number }>;
}

export interface ReportApi {
  // Legacy: returns a sample static PDF (kept for backwards compatibility).
  reportCardUrl(studentId: number, examId: number): string;
  // In-app auto-generated report card payload — used by the new report card viewer.
  buildReportCard(studentId: number, examId: number): Observable<ReportCard>;
}

export interface AttendanceApi {
  list(sectionId: number, date: string): Observable<AttendanceRow[]>;
  bulkSave(req: BulkAttendanceRequest): Observable<{ upserted: number }>;
  // Last N days of attendance % for a section, for the teacher dashboard chart.
  sectionTrend(sectionId: number, days: number): Observable<Array<{ date: string; presentPct: number }>>;
}

export interface TeacherAssignmentApi {
  // Sections the given teacher username is allowed to teach.
  listForTeacherUsername(username: string): Observable<TeacherAssignment[]>;
  list(): Observable<TeacherAssignment[]>;
  create(input: Omit<TeacherAssignment, 'id'>): Observable<TeacherAssignment>;
  remove(id: number): Observable<void>;
}

export interface SchoolApi {
  // The caller's own school (tenant) — available to any authenticated user.
  get(): Observable<School>;
  // ADMIN only (enforced server-side); the school's unique code cannot be changed here.
  update(input: { name: string; address: string | null; phone: string | null; logoUrl: string | null; principalName: string | null }): Observable<School>;
}

export interface AnalyticsApi {
  forStudent(studentId: number): Observable<StudentAnalytics>;
  schoolOverview(): Observable<{
    enrolmentByClass: Array<{ className: string; count: number }>;
    avgScoreBySubject: Array<{ subjectName: string; avg: number }>;
    attendanceTrend: Array<{ month: string; presentPct: number }>;
    genderDistribution: { male: number; female: number; other: number };
  }>;
}

export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');
export const CLASS_API = new InjectionToken<ClassApi>('CLASS_API');
export const SECTION_API = new InjectionToken<SectionApi>('SECTION_API');
export const SUBJECT_API = new InjectionToken<SubjectApi>('SUBJECT_API');
export const ACADEMIC_YEAR_API = new InjectionToken<AcademicYearApi>('ACADEMIC_YEAR_API');
export const STUDENT_API = new InjectionToken<StudentApi>('STUDENT_API');
export const TEACHER_API = new InjectionToken<TeacherApi>('TEACHER_API');
export const EXAM_API = new InjectionToken<ExamApi>('EXAM_API');
export const MARKS_API = new InjectionToken<MarksApi>('MARKS_API');
export const REPORT_API = new InjectionToken<ReportApi>('REPORT_API');
export const ATTENDANCE_API = new InjectionToken<AttendanceApi>('ATTENDANCE_API');
export const TEACHER_ASSIGNMENT_API = new InjectionToken<TeacherAssignmentApi>('TEACHER_ASSIGNMENT_API');
export const ANALYTICS_API = new InjectionToken<AnalyticsApi>('ANALYTICS_API');
export const SCHOOL_API = new InjectionToken<SchoolApi>('SCHOOL_API');
