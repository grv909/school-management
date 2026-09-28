import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';

import { CLASS_API, SECTION_API, SUBJECT_API, TEACHER_ASSIGNMENT_API } from '../api/api.tokens';
import { SchoolClass, Section, Subject, TeacherAssignment } from '../models';
import { AuthService } from './auth.service';

/**
 * Resolves which classes / sections / subjects the currently logged-in teacher
 * may access, based on their TeacherAssignment rows.
 *
 * Components inject this service (NOT the raw class/section/subject APIs) on the
 * teacher side so the dropdowns only ever show what the teacher is allowed to teach.
 *
 * TODO: Replace mock service with real API integration later — in production the
 * backend should authoritatively filter based on the JWT subject, and the UI just
 * displays whatever the server returns.
 */
@Injectable({ providedIn: 'root' })
export class TeacherScopeService {
  private readonly auth = inject(AuthService);
  private readonly assignmentApi = inject(TEACHER_ASSIGNMENT_API);
  private readonly classApi = inject(CLASS_API);
  private readonly sectionApi = inject(SECTION_API);
  private readonly subjectApi = inject(SUBJECT_API);

  private readonly _assignments = signal<TeacherAssignment[]>([]);
  readonly assignments = this._assignments.asReadonly();

  readonly allowedSectionIds = computed(() =>
    new Set(this._assignments().map(a => a.sectionId))
  );

  // Cached per-session: every teacher page calls load() on init, but the assignment
  // list rarely changes within a session, so share one in-flight/completed request
  // instead of re-fetching /api/teacher-assignments on every navigation.
  private loadRequest: Observable<TeacherAssignment[]> | null = null;

  // Cached per-session for the same reason: allowedClasses()/allowedSectionsFor() both
  // used to call sectionApi.listByClass() independently, fetching each class's sections
  // twice on pages that need both (e.g. the teacher dashboard). This caches one
  // classId -> sections request so both call sites share it.
  private readonly sectionsByClassCache = new Map<number, Observable<Section[]>>();

  load(): Observable<TeacherAssignment[]> {
    if (!this.loadRequest) {
      const username = this.auth.session()?.username ?? '';
      this.loadRequest = this.assignmentApi.listForTeacherUsername(username).pipe(
        tap(rows => this._assignments.set(rows)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.loadRequest;
  }

  private sectionsForClass(classId: number): Observable<Section[]> {
    let cached = this.sectionsByClassCache.get(classId);
    if (!cached) {
      cached = this.sectionApi.listByClass(classId).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.sectionsByClassCache.set(classId, cached);
    }
    return cached;
  }

  // Classes that contain at least one allowed section.
  allowedClasses(): Observable<SchoolClass[]> {
    return new Observable<SchoolClass[]>(subscriber => {
      this.classApi.list().subscribe(allClasses => {
        // Resolve section→class membership. The API only lets us list sections per class,
        // so we walk classes and check overlap with allowedSectionIds.
        const allowedSections = this.allowedSectionIds();
        if (allowedSections.size === 0) {
          subscriber.next([]); subscriber.complete(); return;
        }
        let remaining = allClasses.length;
        // Keep the server's own ordering (GET /api/classes is already sorted by displayOrder) —
        // record each class's original index so results stay in that order despite resolving
        // section membership out of order below.
        const indexById = new Map(allClasses.map((c, i) => [c.id, i]));
        const out: SchoolClass[] = [];
        if (remaining === 0) { subscriber.next([]); subscriber.complete(); return; }
        allClasses.forEach(c => {
          this.sectionsForClass(c.id).subscribe(sections => {
            if (sections.some(s => allowedSections.has(s.id))) {
              out.push(c);
            }
            remaining -= 1;
            if (remaining === 0) {
              out.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
              subscriber.next(out);
              subscriber.complete();
            }
          });
        });
      });
    });
  }

  allowedSectionsFor(classId: number): Observable<Section[]> {
    return this.sectionsForClass(classId).pipe(
      map(sections => sections.filter(s => this.allowedSectionIds().has(s.id)))
    );
  }

  // Subjects allowed for a particular section.
  // A class-teacher row (subjectId null) implies all subjects.
  allowedSubjectsFor(sectionId: number): Observable<Subject[]> {
    return this.subjectApi.list().pipe(
      map(allSubjects => {
        const sectionRows = this._assignments().filter(a => a.sectionId === sectionId);
        if (sectionRows.length === 0) return [];
        if (sectionRows.some(r => r.isClassTeacher)) return allSubjects;
        const ids = new Set(sectionRows.map(r => r.subjectId).filter((x): x is number => x !== null));
        return allSubjects.filter(s => ids.has(s.id));
      })
    );
  }

  isClassTeacherOf(sectionId: number): boolean {
    return this._assignments().some(a => a.sectionId === sectionId && a.isClassTeacher);
  }
}
