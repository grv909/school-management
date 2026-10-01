import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type SkeletonVariant = 'table' | 'kpi-row' | 'card';

/**
 * Loading placeholder shaped like the content it precedes — replaces bare
 * "Loading X…" strings that were reusing .empty-state (a true-empty-data
 * pattern) for a mid-fetch state, which the redesign audit flagged as
 * visually indistinguishable and semantically wrong.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (variant) {
      @case ('table') {
        <div class="skeleton-block skeleton-block--card">
          @for (row of rowsArray; track row) {
            <div class="skeleton-row">
              <span class="skeleton-pulse skeleton-pulse--sm"></span>
              <span class="skeleton-pulse skeleton-pulse--lg"></span>
              <span class="skeleton-pulse skeleton-pulse--md"></span>
            </div>
          }
        </div>
      }
      @case ('kpi-row') {
        <div class="skeleton-kpi-row">
          @for (tile of rowsArray; track tile) {
            <div class="skeleton-block skeleton-kpi-tile">
              <span class="skeleton-pulse skeleton-pulse--xs"></span>
              <span class="skeleton-pulse skeleton-pulse--lg skeleton-pulse--tall"></span>
            </div>
          }
        </div>
      }
      @case ('card') {
        <div class="skeleton-block skeleton-block--card">
          <span class="skeleton-pulse skeleton-pulse--xs"></span>
          <span class="skeleton-pulse skeleton-pulse--full skeleton-pulse--tall"></span>
        </div>
      }
    }
  `
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'card';
  @Input() rows = 4;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
