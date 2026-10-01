import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Single "KPI tile" implementation, replacing three divergent ad hoc markups
 * that existed across admin-dashboard (.dashboard-card), teacher-dashboard, and
 * student-profile (.kpi-card / .kpi-card--action). Renders the existing
 * .kpi-card/.kpi-card--action CSS (styles/components/_analytics.scss) rather
 * than introducing new class names, so no shared stylesheet churn.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (clickable) {
      <button type="button" class="kpi-card kpi-card--action" (click)="action.emit()">
        <div class="kpi-card__label">{{ label }}</div>
        <div class="kpi-card__value">{{ value }}@if (suffix) {<span class="kpi-card__suffix">{{ suffix }}</span>}</div>
      </button>
    } @else {
      <div class="kpi-card">
        <div class="kpi-card__label">{{ label }}</div>
        <div class="kpi-card__value">{{ value }}@if (suffix) {<span class="kpi-card__suffix">{{ suffix }}</span>}</div>
      </div>
    }
  `
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() suffix = '';
  @Input() clickable = false;
  @Output() action = new EventEmitter<void>();
}
