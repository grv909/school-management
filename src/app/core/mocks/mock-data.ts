// FUTURE: this file is deleted once *HttpApi implementations are wired and pointed at AWS API Gateway.
// Mirrors V900__demo_seed.sql on the backend so swap is friction-free.

import { AcademicYear, Exam, SchoolClass, Section, Student, Subject, Teacher, TeacherAssignment } from '../models';

export const MOCK_SCHOOL = {
  id: 1,
  name: 'Sunrise Public School',
  code: 'SPS-001',
  address: 'M.G. Road, Pune, Maharashtra 411001',
  phone: '+91-20-1234-5678',
  principalName: 'Mrs. Sunita Verma'
};

export const MOCK_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 1, name: '2026-27', startDate: '2026-04-01', endDate: '2027-03-31', current: true }
];

export const MOCK_CLASSES: SchoolClass[] = [
  { id: 1, name: 'Class 6', displayOrder: 6 },
  { id: 2, name: 'Class 7', displayOrder: 7 },
  { id: 3, name: 'Class 8', displayOrder: 8 }
];

export const MOCK_SECTIONS: Section[] = [
  { id: 1, classId: 1, academicYearId: 1, name: 'A' },
  { id: 2, classId: 1, academicYearId: 1, name: 'B' },
  { id: 3, classId: 2, academicYearId: 1, name: 'A' },
  { id: 4, classId: 2, academicYearId: 1, name: 'B' },
  { id: 5, classId: 3, academicYearId: 1, name: 'A' },
  { id: 6, classId: 3, academicYearId: 1, name: 'B' }
];

export const MOCK_SUBJECTS: Subject[] = [
  { id: 1, name: 'English',        code: 'ENG', maxMarks: 100 },
  { id: 2, name: 'Hindi',          code: 'HIN', maxMarks: 100 },
  { id: 3, name: 'Mathematics',    code: 'MAT', maxMarks: 100 },
  { id: 4, name: 'Science',        code: 'SCI', maxMarks: 100 },
  { id: 5, name: 'Social Science', code: 'SST', maxMarks: 100 },
  { id: 6, name: 'Computer',       code: 'CMP', maxMarks: 100 }
];

export const MOCK_TEACHERS: Teacher[] = [
  { id: 1, firstName: 'Meera',   lastName: 'Sharma',    employeeNo: 'EMP-101', username: 'teacher1' },
  { id: 2, firstName: 'Rajesh',  lastName: 'Kulkarni',  employeeNo: 'EMP-102', username: 'teacher2' }
];

// Realistic Indian names. Class 8-A and Class 8-B.
export const MOCK_STUDENTS: Student[] = [
  { id: 1,  sectionId: 5, admissionNo: 'A-8A-001', firstName: 'Aarav',    lastName: 'Sharma', dob: '2011-04-15', gender: 'M', rollNo: 1 },
  { id: 2,  sectionId: 5, admissionNo: 'A-8A-002', firstName: 'Diya',     lastName: 'Patel',  dob: '2011-06-21', gender: 'F', rollNo: 2 },
  { id: 3,  sectionId: 5, admissionNo: 'A-8A-003', firstName: 'Kabir',    lastName: 'Singh',  dob: '2011-02-09', gender: 'M', rollNo: 3 },
  { id: 4,  sectionId: 5, admissionNo: 'A-8A-004', firstName: 'Ananya',   lastName: 'Reddy',  dob: '2011-09-30', gender: 'F', rollNo: 4 },
  { id: 5,  sectionId: 5, admissionNo: 'A-8A-005', firstName: 'Mohammed', lastName: 'Khan',   dob: '2011-12-11', gender: 'M', rollNo: 5 },
  { id: 6,  sectionId: 6, admissionNo: 'A-8B-001', firstName: 'Ishaan',   lastName: 'Verma',  dob: '2011-03-18', gender: 'M', rollNo: 1 },
  { id: 7,  sectionId: 6, admissionNo: 'A-8B-002', firstName: 'Saanvi',   lastName: 'Joshi',  dob: '2011-07-02', gender: 'F', rollNo: 2 },
  { id: 8,  sectionId: 6, admissionNo: 'A-8B-003', firstName: 'Arjun',    lastName: 'Menon',  dob: '2011-11-05', gender: 'M', rollNo: 3 },
  { id: 9,  sectionId: 6, admissionNo: 'A-8B-004', firstName: 'Riya',     lastName: 'Nair',   dob: '2011-05-23', gender: 'F', rollNo: 4 },
  { id: 10, sectionId: 6, admissionNo: 'A-8B-005', firstName: 'Vihaan',   lastName: 'Iyer',   dob: '2011-01-30', gender: 'M', rollNo: 5 }
];

export const MOCK_EXAMS: Exam[] = [
  { id: 1, name: 'Unit Test 1',  academicYearId: 1, startDate: '2026-07-15', endDate: '2026-07-22' },
  { id: 2, name: 'Half-Yearly',  academicYearId: 1, startDate: '2026-09-20', endDate: '2026-09-30' }
];

/**
 * Teacher → section/subject assignments.
 * teacher1 = class teacher for 8A + Math for 8A & 8B.
 * teacher2 = class teacher for 8B + Science for 8A & 8B.
 *
 * The teacher app filters every list using these rows, so different teachers see different
 * classes and subjects. The admin "Teachers" page can edit these in a future iteration.
 */
export const MOCK_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  { id: 1, teacherId: 1, sectionId: 5, subjectId: null, isClassTeacher: true },  // teacher1 → 8A class teacher
  { id: 2, teacherId: 1, sectionId: 5, subjectId: 3, isClassTeacher: false },    // teacher1 → 8A Maths
  { id: 3, teacherId: 1, sectionId: 6, subjectId: 3, isClassTeacher: false },    // teacher1 → 8B Maths
  { id: 4, teacherId: 2, sectionId: 6, subjectId: null, isClassTeacher: true },  // teacher2 → 8B class teacher
  { id: 5, teacherId: 2, sectionId: 5, subjectId: 4, isClassTeacher: false },    // teacher2 → 8A Science
  { id: 6, teacherId: 2, sectionId: 6, subjectId: 4, isClassTeacher: false }     // teacher2 → 8B Science
];

/**
 * Deterministic seeded marks so analytics + report cards have real numbers without random churn.
 * Map: [studentId][examId][subjectId] = marksObtained.
 *
 * Numbers chosen to look realistic — a top student in 80s/90s, mid students 60s/70s,
 * a struggling student in 40s/50s — so charts look plausible in screenshots.
 */
export const MOCK_SEED_MARKS: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  // Per-student baseline (out of 100). Higher baseline → consistently better marks.
  const baseline: Record<number, number> = {
    1: 88, 2: 76, 3: 65, 4: 91, 5: 54,
    6: 82, 7: 78, 8: 69, 9: 85, 10: 48
  };
  const subjectIds = [1, 2, 3, 4, 5, 6];
  const examIds = [1, 2];
  for (const sid of Object.keys(baseline)) {
    const studentId = Number(sid);
    const base = baseline[studentId];
    for (const examId of examIds) {
      // Half-yearly slightly higher on average.
      const examShift = examId === 2 ? 3 : 0;
      for (const subjectId of subjectIds) {
        // Subject variation (deterministic): each subject offsets the baseline a touch.
        const offset = ((subjectId * 7 + studentId * 3) % 11) - 5;
        const v = Math.max(20, Math.min(100, base + examShift + offset));
        out[`${examId}|${subjectId}|${studentId}`] = v;
      }
    }
  }
  return out;
})();

// Per-student daily attendance % for a 6-month rolling trend.
// Deterministic so charts look stable across reloads.
export function mockMonthlyAttendance(studentId: number): Array<{ month: string; presentPct: number }> {
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const baseline: Record<number, number> = {
    1: 95, 2: 92, 3: 88, 4: 97, 5: 78,
    6: 94, 7: 90, 8: 86, 9: 96, 10: 75
  };
  const base = baseline[studentId] ?? 88;
  return months.map((m, i) => ({
    month: m,
    presentPct: Math.max(60, Math.min(100, base + ((i * 5 + studentId) % 9) - 4))
  }));
}
