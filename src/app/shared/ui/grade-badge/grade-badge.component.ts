import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Replaces the verbatim-duplicated `grade grade--{{ grade.toLowerCase().replace('+','plus') }}`
 * inline class-string logic that previously lived independently in report-card and
 * student-profile templates.
 */
@Component({
  selector: 'app-grade-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="grade" [class]="gradeClass()">{{ grade() }}</span>`
})
export class GradeBadgeComponent {
  readonly grade = input.required<string>();
  readonly gradeClass = computed(() => `grade--${this.grade().toLowerCase().replace('+', 'plus')}`);
}
