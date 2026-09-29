// Domain models. Keep these aligned with backend DTOs (com.pm.erp.*.api.*Dto).
export type Role = 'ADMIN' | 'TEACHER';

export interface CurrentUser {
  userId: number;
  username: string;
  role: Role;
  schoolId: number;
}

export interface School {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  principalName: string | null;
}

export interface SchoolClass {
  id: number;
  name: string;
  classTeacherName: string | null;
  studentCount: number;
}

export interface Section {
  id: number;
  classId: number;
  academicYearId: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  maxMarks: number;
}

export interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface Student {
  id: number;
  sectionId: number;
  admissionNo: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  rollNo: number | null;
}

export interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  employeeNo: string | null;
  username: string | null;
}

export interface Exam {
  id: number;
  name: string;
  academicYearId: number;
  classId: number;
  maxMarks: number;
  startDate: string | null;
  endDate: string | null;
}

export interface MarkRow {
  studentId: number;
  firstName: string;
  lastName: string;
  rollNo: number | null;
  marksObtained: number | null;
  maxMarks: number;
}

export interface BulkMarksRequest {
  examId: number;
  sectionId: number;
  subjectId: number;
  entries: Array<{ studentId: number; marksObtained: number }>;
}

// Maps a teacher to the sections (and optionally subjects) they may teach.
// Drives class-level access control on the teacher side.
export interface TeacherAssignment {
  id: number;
  teacherId: number;
  sectionId: number;
  subjectId: number | null;        // null = class teacher (all subjects)
  isClassTeacher: boolean;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface AttendanceEntry {
  studentId: number;
  status: AttendanceStatus;
  remark?: string | null;
}

export interface AttendanceRecord {
  id: number;
  sectionId: number;
  date: string;                    // ISO yyyy-MM-dd
  entries: AttendanceEntry[];
}

export interface AttendanceRow {
  studentId: number;
  firstName: string;
  lastName: string;
  rollNo: number | null;
  status: AttendanceStatus;
  remark?: string | null;
}

export interface BulkAttendanceRequest {
  sectionId: number;
  date: string;
  entries: AttendanceEntry[];
}

// Per-student analytics roll-up used by the student profile + analytics page.
export interface StudentAnalytics {
  studentId: number;
  overallPercentage: number;
  attendancePercentage: number;
  bySubject: Array<{ subjectId: number; subjectName: string; percentage: number; grade: string }>;
  byExam: Array<{ examId: number; examName: string; percentage: number }>;
  attendanceTrend: Array<{ month: string; presentPct: number }>;
  rankInSection: number;
  sectionSize: number;
}

// Auto-generated report card payload (shape used by the report card viewer).
export interface ReportCard {
  student: Student;
  exam: Exam;
  className: string;
  sectionName: string;
  schoolName: string;
  academicYear: string;
  rows: Array<{
    subjectId: number;
    subjectName: string;
    maxMarks: number;
    marksObtained: number | null;
    grade: string;
  }>;
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string;
  attendancePercentage: number;
  remarks: string;
  rankInSection: number;
  sectionSize: number;
}
