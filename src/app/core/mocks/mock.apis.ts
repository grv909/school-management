import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import {
  AcademicYear,
  AttendanceRow,
  AttendanceStatus,
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
} from '../api/api.tokens';
import {
  MOCK_ACADEMIC_YEARS,
  MOCK_CLASSES,
  MOCK_CLASS_SUBJECTS,
  MOCK_EXAMS,
  MOCK_SCHOOL,
  MOCK_SECTIONS,
  MOCK_SEED_MARKS,
  MOCK_STUDENTS,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
  MOCK_TEACHER_ASSIGNMENTS,
  mockMonthlyAttendance
} from './mock-data';

// Tiny helper to simulate network latency without making the demo feel sluggish.
const NETWORK_DELAY_MS = 120;
function wrap<T>(value: T): Observable<T> {
  return of(value).pipe(delay(NETWORK_DELAY_MS));
}

/**
 * FUTURE: replace these mock services with the *HttpApi classes once the backend is exposed
 * via AWS API Gateway. The provider wiring in app.config.ts is the single place that changes.
 */

@Injectable({ providedIn: 'root' })
export class AuthMockApi implements AuthApi {
  // Demo behaviour: any non-empty password works; the role is inferred from a fixed mapping.
  private static readonly USERS: Array<{ id: number; username: string; role: Role; schoolId: number }> = [
    { id: 1, username: 'admin',    role: 'ADMIN',   schoolId: 1 },
    { id: 2, username: 'teacher1', role: 'TEACHER', schoolId: 1 },
    { id: 3, username: 'teacher2', role: 'TEACHER', schoolId: 1 }
  ];

  // Tracks whichever user most recently logged in, so me() (which — like the real
  // backend's JWT-derived /auth/me — takes no arguments) can resolve the right identity.
  private lastLoggedInUserId: number | null = null;

  login(username: string, password: string) {
    if (!username || !password) {
      return throwError(() => new Error('Username and password are required'));
    }
    const user = AuthMockApi.USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return throwError(() => new Error('Invalid credentials'));
    }
    this.lastLoggedInUserId = user.id;
    // FUTURE: real JWT comes from backend. For now we mint a fake token marker — the
    // app never trusts the token contents, only its presence.
    const accessToken = `mock-token-${user.id}-${Date.now()}`;
    return wrap({ accessToken, role: user.role, expiresIn: 28800 });
  }

  me(): Observable<CurrentUser> {
    const user = AuthMockApi.USERS.find(u => u.id === this.lastLoggedInUserId);
    if (!user) {
      return throwError(() => new Error('No logged-in user'));
    }
    return wrap({ userId: user.id, username: user.username, role: user.role, schoolId: user.schoolId });
  }
}

@Injectable({ providedIn: 'root' })
export class ClassMockApi implements ClassApi {
  private readonly data = signal<SchoolClass[]>([...MOCK_CLASSES]);
  private readonly order = new Map<number, number>(MOCK_CLASSES.map((c, i) => [c.id, (i + 1) * 10]));
  list() {
    return wrap([...this.data()].sort((a, b) => (this.order.get(a.id) ?? 0) - (this.order.get(b.id) ?? 0)));
  }
  create(input: { name: string }) {
    const id = this.nextId();
    // Mirrors the backend: new classes go to the end (max existing order + 10).
    const nextOrder = Math.max(0, ...Array.from(this.order.values())) + 10;
    this.order.set(id, nextOrder);
    const next: SchoolClass = { id, name: input.name, classTeacherName: null, studentCount: 0 };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  update(id: number, input: { name: string }) {
    this.data.update(arr => arr.map(c => c.id === id ? { ...c, name: input.name } : c));
    const updated = this.data().find(c => c.id === id);
    return updated ? wrap(updated) : throwError(() => new Error(`Class not found: ${id}`));
  }
  remove(id: number) {
    this.data.update(arr => arr.filter(c => c.id !== id));
    return wrap<void>(undefined);
  }
  assignSubjects(_id: number, _subjectIds: number[]) {
    return wrap(undefined as void);
  }
  private nextId() { return Math.max(0, ...this.data().map(c => c.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class SectionMockApi implements SectionApi {
  private readonly data = signal<Section[]>([...MOCK_SECTIONS]);
  listByClass(classId: number) {
    return wrap(this.data().filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name)));
  }
  create(input: { classId: number; academicYearId: number; name: string }) {
    const next: Section = { id: this.nextId(), ...input };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  private nextId() { return Math.max(0, ...this.data().map(s => s.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class SubjectMockApi implements SubjectApi {
  private readonly data = signal<Subject[]>([...MOCK_SUBJECTS]);
  list(classId?: number) {
    if (classId == null) return wrap([...this.data()]);
    const idsForClass = new Set(MOCK_CLASS_SUBJECTS.filter(cs => cs.classId === classId).map(cs => cs.subjectId));
    return wrap(this.data().filter(s => idsForClass.has(s.id)));
  }
  create(input: { name: string; code: string; maxMarks: number }) {
    const next: Subject = { id: this.nextId(), ...input };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  update(id: number, input: { name: string; code: string; maxMarks: number }) {
    this.data.update(arr => arr.map(s => s.id === id ? { ...s, ...input } : s));
    const updated = this.data().find(s => s.id === id);
    return updated ? wrap(updated) : throwError(() => new Error(`Subject not found: ${id}`));
  }
  remove(id: number) {
    this.data.update(arr => arr.filter(s => s.id !== id));
    return wrap<void>(undefined);
  }
  private nextId() { return Math.max(0, ...this.data().map(s => s.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class AcademicYearMockApi implements AcademicYearApi {
  private readonly data = signal<AcademicYear[]>([...MOCK_ACADEMIC_YEARS]);
  list() { return wrap([...this.data()]); }
  create(input: Omit<AcademicYear, 'id'>) {
    const next: AcademicYear = { id: this.nextId(), ...input };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  update(id: number, input: Omit<AcademicYear, 'id'>) {
    this.data.update(arr => arr.map(y => y.id === id ? { id, ...input } : y));
    const updated = this.data().find(y => y.id === id);
    return updated ? wrap(updated) : throwError(() => new Error(`Academic year not found: ${id}`));
  }
  remove(id: number) {
    this.data.update(arr => arr.filter(y => y.id !== id));
    return wrap<void>(undefined);
  }
  private nextId() { return Math.max(0, ...this.data().map(y => y.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class StudentMockApi implements StudentApi {
  private readonly data = signal<Student[]>([...MOCK_STUDENTS]);

  listBySection(sectionId: number) {
    return wrap(this.data().filter(s => s.sectionId === sectionId)
      .sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999)));
  }
  get(id: number) {
    const found = this.data().find(s => s.id === id);
    return found ? wrap(found) : throwError(() => new Error('Student not found'));
  }
  create(input: Omit<Student, 'id'>) {
    const next: Student = { id: this.nextId(), ...input };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  update(id: number, input: Omit<Student, 'id'>) {
    const idx = this.data().findIndex(s => s.id === id);
    if (idx < 0) return throwError(() => new Error('Student not found'));
    const updated: Student = { id, ...input };
    this.data.update(arr => { const c = [...arr]; c[idx] = updated; return c; });
    return wrap(updated);
  }
  remove(id: number) {
    this.data.update(arr => arr.filter(s => s.id !== id));
    return wrap<void>(undefined);
  }
  private nextId() { return Math.max(0, ...this.data().map(s => s.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class TeacherMockApi implements TeacherApi {
  private readonly data = signal<Teacher[]>([...MOCK_TEACHERS]);
  list() { return wrap([...this.data()]); }
  create(input: { firstName: string; lastName: string; employeeNo: string; username: string; password: string }) {
    // Password is ignored in mock; the username becomes the visible handle.
    const next: Teacher = {
      id: this.nextId(),
      firstName: input.firstName,
      lastName: input.lastName,
      employeeNo: input.employeeNo,
      username: input.username
    };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  update(id: number, input: { firstName: string; lastName: string; employeeNo: string }) {
    const idx = this.data().findIndex(t => t.id === id);
    if (idx < 0) return throwError(() => new Error('Teacher not found'));
    const updated: Teacher = { ...this.data()[idx], ...input };
    this.data.update(arr => { const c = [...arr]; c[idx] = updated; return c; });
    return wrap(updated);
  }
  remove(id: number) {
    this.data.update(arr => arr.filter(t => t.id !== id));
    return wrap<void>(undefined);
  }
  private nextId() { return Math.max(0, ...this.data().map(t => t.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class ExamMockApi implements ExamApi {
  private readonly data = signal<Exam[]>([...MOCK_EXAMS]);
  list(classId?: number) {
    const all = this.data();
    return wrap(classId == null ? [...all] : all.filter(e => e.classId === classId));
  }
  create(input: Omit<Exam, 'id'>) {
    const next: Exam = { id: this.nextId(), ...input };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }
  update(id: number, input: Omit<Exam, 'id'>) {
    this.data.update(arr => arr.map(e => e.id === id ? { id, ...input } : e));
    const updated = this.data().find(e => e.id === id);
    return updated ? wrap(updated) : throwError(() => new Error(`Exam not found: ${id}`));
  }
  remove(id: number) {
    this.data.update(arr => arr.filter(e => e.id !== id));
    return wrap<void>(undefined);
  }
  private nextId() { return Math.max(0, ...this.data().map(e => e.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class MarksMockApi implements MarksApi {
  // Storage shape: keyed by `${examId}|${subjectId}|${studentId}`.
  // Seeded with deterministic mock marks so analytics + report cards have data on first load.
  private readonly entries = signal<Record<string, number>>({ ...MOCK_SEED_MARKS });

  // Exposed for analytics/report APIs that need to read the same store.
  snapshot(): Record<string, number> { return { ...this.entries() }; }

  list(examId: number, sectionId: number, subjectId: number) {
    const studentsInSection = MOCK_STUDENTS.filter(s => s.sectionId === sectionId)
      .sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999));
    const subject = MOCK_SUBJECTS.find(s => s.id === subjectId);
    const max = subject?.maxMarks ?? 100;
    const map = this.entries();
    const rows: MarkRow[] = studentsInSection.map(s => ({
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNo: s.rollNo,
      marksObtained: map[`${examId}|${subjectId}|${s.id}`] ?? null,
      maxMarks: max
    }));
    return wrap(rows);
  }

  bulkSave(req: BulkMarksRequest) {
    this.entries.update(curr => {
      const next = { ...curr };
      for (const e of req.entries) {
        next[`${req.examId}|${req.subjectId}|${e.studentId}`] = e.marksObtained;
      }
      return next;
    });
    return wrap({ upserted: req.entries.length });
  }
}

// Letter grade rubric — single source of truth so report cards + analytics agree.
function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

@Injectable({ providedIn: 'root' })
export class ReportMockApi implements ReportApi {
  private readonly marks = inject(MarksMockApi);

  // Legacy method, kept for backwards compatibility. Prefer buildReportCard().
  reportCardUrl(studentId: number, _examId: number): string {
    return `sample-report-cards/student-${studentId}.pdf`;
  }

  // Auto-generates a report card from current mock marks + roll-ups.
  // TODO: Replace mock service with real API integration later — backend would render this server-side.
  buildReportCard(studentId: number, examId: number): Observable<ReportCard> {
    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    const exam = MOCK_EXAMS.find(e => e.id === examId);
    if (!student || !exam) {
      return throwError(() => new Error('Student or exam not found'));
    }
    const section = MOCK_SECTIONS.find(sec => sec.id === student.sectionId)!;
    const klass = MOCK_CLASSES.find(c => c.id === section.classId)!;
    const year = MOCK_ACADEMIC_YEARS.find(y => y.id === section.academicYearId)!;
    const marksSnap = this.marks.snapshot();

    const rows = MOCK_SUBJECTS.map(sub => {
      const obtained = marksSnap[`${examId}|${sub.id}|${studentId}`] ?? null;
      const pct = obtained == null ? 0 : (obtained / sub.maxMarks) * 100;
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        maxMarks: sub.maxMarks,
        marksObtained: obtained,
        grade: obtained == null ? '-' : gradeFor(pct)
      };
    });
    const totalMax = rows.reduce((s, r) => s + r.maxMarks, 0);
    const total = rows.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
    const pct = totalMax === 0 ? 0 : (total / totalMax) * 100;

    // Rank within the section for this exam (based on total %).
    const sectionStudents = MOCK_STUDENTS.filter(s => s.sectionId === student.sectionId);
    const ranked = sectionStudents.map(s => {
      const rs = MOCK_SUBJECTS.reduce((acc, sub) => {
        const obtained = marksSnap[`${examId}|${sub.id}|${s.id}`] ?? 0;
        return acc + obtained;
      }, 0);
      return { id: s.id, total: rs };
    }).sort((a, b) => b.total - a.total);
    const rank = ranked.findIndex(r => r.id === studentId) + 1;

    // Attendance % approximation: average of monthly trend.
    const trend = mockMonthlyAttendance(studentId);
    const attendance = trend.reduce((a, b) => a + b.presentPct, 0) / trend.length;

    return wrap<ReportCard>({
      student,
      exam,
      className: klass.name,
      sectionName: section.name,
      schoolName: MOCK_SCHOOL.name,
      academicYear: year.name,
      rows,
      totalMarks: total,
      totalMaxMarks: totalMax,
      percentage: Math.round(pct * 10) / 10,
      overallGrade: gradeFor(pct),
      attendancePercentage: Math.round(attendance * 10) / 10,
      rankInSection: rank,
      sectionSize: sectionStudents.length,
      remarks: pct >= 80
        ? 'Excellent performance. Keep up the consistent effort.'
        : pct >= 60
          ? 'Good progress overall. Focus on weaker subjects.'
          : 'Needs improvement. Recommend extra attention and parent-teacher discussion.'
    });
  }
}

@Injectable({ providedIn: 'root' })
export class AttendanceMockApi implements AttendanceApi {
  // Storage: `${sectionId}|${date}|${studentId}` → status.
  private readonly entries = signal<Record<string, AttendanceStatus>>(this.seed());

  list(sectionId: number, date: string): Observable<AttendanceRow[]> {
    const students = MOCK_STUDENTS.filter(s => s.sectionId === sectionId)
      .sort((a, b) => (a.rollNo ?? 999) - (b.rollNo ?? 999));
    const map = this.entries();
    const rows: AttendanceRow[] = students.map(s => ({
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNo: s.rollNo,
      status: map[`${sectionId}|${date}|${s.id}`] ?? 'PRESENT',
      remark: null
    }));
    return wrap(rows);
  }

  bulkSave(req: BulkAttendanceRequest): Observable<{ upserted: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (req.date !== today && req.date !== yesterday) {
      return throwError(() => new Error('Attendance can only be marked or changed for today or yesterday'));
    }
    this.entries.update(curr => {
      const next = { ...curr };
      for (const e of req.entries) {
        next[`${req.sectionId}|${req.date}|${e.studentId}`] = e.status;
      }
      return next;
    });
    return wrap({ upserted: req.entries.length });
  }

  sectionTrend(sectionId: number, days: number) {
    // Deterministic synthetic trend: small daily variation around 92%.
    const today = new Date();
    const rows: Array<{ date: string; presentPct: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const variance = ((d.getDate() * 7 + sectionId * 3) % 13) - 6;
      rows.push({
        date: d.toISOString().slice(0, 10),
        presentPct: Math.max(70, Math.min(100, 92 + variance))
      });
    }
    return wrap(rows);
  }

  private seed(): Record<string, AttendanceStatus> {
    // Pre-fill the last 30 days with mostly-present, a few absences, for realistic charts.
    const out: Record<string, AttendanceStatus> = {};
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      for (const s of MOCK_STUDENTS) {
        // Deterministic: every ~12th day a student is absent.
        const isAbsent = ((s.id * 17 + i) % 12) === 0;
        out[`${s.sectionId}|${date}|${s.id}`] = isAbsent ? 'ABSENT' : 'PRESENT';
      }
    }
    return out;
  }
}

@Injectable({ providedIn: 'root' })
export class TeacherAssignmentMockApi implements TeacherAssignmentApi {
  private readonly data = signal<TeacherAssignment[]>([...MOCK_TEACHER_ASSIGNMENTS]);

  list() { return wrap([...this.data()]); }

  listForTeacherUsername(username: string) {
    const teacher = MOCK_TEACHERS.find(t => t.username === username);
    if (!teacher) return wrap<TeacherAssignment[]>([]);
    return wrap(this.data().filter(a => a.teacherId === teacher.id));
  }

  create(input: Omit<TeacherAssignment, 'id'>) {
    const next: TeacherAssignment = { id: this.nextId(), ...input };
    this.data.update(arr => [...arr, next]);
    return wrap(next);
  }

  remove(id: number) {
    this.data.update(arr => arr.filter(a => a.id !== id));
    return wrap<void>(undefined);
  }

  private nextId() { return Math.max(0, ...this.data().map(a => a.id)) + 1; }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsMockApi implements AnalyticsApi {
  private readonly marks = inject(MarksMockApi);

  forStudent(studentId: number): Observable<StudentAnalytics> {
    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    if (!student) return throwError(() => new Error('Student not found'));
    const marksSnap = this.marks.snapshot();

    // Average per subject across all exams.
    const bySubject = MOCK_SUBJECTS.map(sub => {
      const scores: number[] = [];
      for (const exam of MOCK_EXAMS) {
        const v = marksSnap[`${exam.id}|${sub.id}|${studentId}`];
        if (v != null) scores.push((v / sub.maxMarks) * 100);
      }
      const avg = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;
      return { subjectId: sub.id, subjectName: sub.name, percentage: Math.round(avg * 10) / 10, grade: gradeFor(avg) };
    });

    // Overall % across all exams + subjects.
    const totals = MOCK_EXAMS.map(exam => {
      let total = 0, max = 0;
      for (const sub of MOCK_SUBJECTS) {
        const v = marksSnap[`${exam.id}|${sub.id}|${studentId}`];
        if (v != null) { total += v; max += sub.maxMarks; }
      }
      return { examId: exam.id, examName: exam.name, percentage: max === 0 ? 0 : Math.round((total / max) * 1000) / 10 };
    });
    const overall = totals.length === 0 ? 0 : totals.reduce((a, b) => a + b.percentage, 0) / totals.length;

    const trend = mockMonthlyAttendance(studentId);
    const attendance = trend.reduce((a, b) => a + b.presentPct, 0) / trend.length;

    // Section rank: overall % across all exams.
    const sectionStudents = MOCK_STUDENTS.filter(s => s.sectionId === student.sectionId);
    const ranked = sectionStudents.map(s => {
      const t = MOCK_EXAMS.reduce((acc, exam) => {
        for (const sub of MOCK_SUBJECTS) {
          acc += marksSnap[`${exam.id}|${sub.id}|${s.id}`] ?? 0;
        }
        return acc;
      }, 0);
      return { id: s.id, total: t };
    }).sort((a, b) => b.total - a.total);
    const rank = ranked.findIndex(r => r.id === studentId) + 1;

    return wrap<StudentAnalytics>({
      studentId,
      overallPercentage: Math.round(overall * 10) / 10,
      attendancePercentage: Math.round(attendance * 10) / 10,
      bySubject,
      byExam: totals,
      attendanceTrend: trend,
      rankInSection: rank,
      sectionSize: sectionStudents.length
    });
  }

  schoolOverview() {
    const enrolmentByClass = MOCK_CLASSES.map(c => {
      const sectionIds = MOCK_SECTIONS.filter(s => s.classId === c.id).map(s => s.id);
      const count = MOCK_STUDENTS.filter(st => sectionIds.includes(st.sectionId)).length;
      return { className: c.name, count };
    });

    const marksSnap = this.marks.snapshot();
    const avgScoreBySubject = MOCK_SUBJECTS.map(sub => {
      let total = 0, n = 0;
      for (const st of MOCK_STUDENTS) {
        for (const exam of MOCK_EXAMS) {
          const v = marksSnap[`${exam.id}|${sub.id}|${st.id}`];
          if (v != null) { total += (v / sub.maxMarks) * 100; n++; }
        }
      }
      return { subjectName: sub.name, avg: n === 0 ? 0 : Math.round((total / n) * 10) / 10 };
    });

    // Synthetic monthly attendance for the whole school.
    const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const attendanceTrend = months.map((m, i) => ({
      month: m,
      presentPct: 88 + ((i * 3) % 8)
    }));

    const gender = MOCK_STUDENTS.reduce((acc, s) => {
      if (s.gender === 'M') acc.male++;
      else if (s.gender === 'F') acc.female++;
      else acc.other++;
      return acc;
    }, { male: 0, female: 0, other: 0 });

    return wrap({
      enrolmentByClass,
      avgScoreBySubject,
      attendanceTrend,
      genderDistribution: gender
    });
  }
}
