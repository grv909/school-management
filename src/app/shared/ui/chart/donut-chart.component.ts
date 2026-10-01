import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { CHART_COLOR_SCHEME } from './chart-colors';

/**
 * Donut chart — wraps ngx-charts-pie-chart (doughnut mode) with a custom legend
 * built to match this app's design system, rather than ngx-charts-advanced-pie-chart's
 * built-in ring+list layout (which renders as two visually disconnected pieces —
 * a thin ring with a lot of empty space inside its bounding box, plus a separate
 * breakdown list — at the compact sizes this app uses it at).
 *
 * Micro-interactions: hovering a legend row highlights its ring slice (and vice
 * versa, via activeEntries), and the slices themselves lift slightly on hover.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [NgxChartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0 || total() === 0) {
      <div class="empty-state">
        <div class="empty-state__title">No data available yet</div>
      </div>
    } @else {
      <div class="donut-chart">
        <div class="donut-chart__ring">
          <ngx-charts-pie-chart
            [view]="[140, 140]"
            [results]="chartData()"
            [scheme]="colorScheme"
            [doughnut]="true"
            [arcWidth]="0.3"
            [labels]="false"
            [legend]="false"
            [tooltipDisabled]="false"
            [activeEntries]="activeEntries()"
            (activate)="onActivate($event)"
            (deactivate)="onDeactivate()"
            [attr.aria-label]="ariaLabel()"
            role="img">
          </ngx-charts-pie-chart>
          <div class="donut-chart__center">
            <div class="donut-chart__total">{{ total() }}</div>
            <div class="donut-chart__caption">{{ caption() }}</div>
          </div>
        </div>
        <ul class="donut-chart__legend">
          @for (seg of segments(); track seg.label) {
            <li (mouseenter)="onActivate({ name: seg.label })" (mouseleave)="onDeactivate()">
              <span class="donut-chart__swatch" [style.background]="seg.color"></span>
              <span class="donut-chart__legend-value">{{ seg.value }}</span>
              <span class="donut-chart__legend-label">{{ seg.label }}</span>
              <span class="donut-chart__legend-pct">{{ seg.pct }}%</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .donut-chart {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .donut-chart__ring {
      position: relative;
      width: 140px;
      height: 140px;
      flex-shrink: 0;
    }

    .donut-chart__center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .donut-chart__total {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 600;
      color: var(--foreground);
      line-height: 1.1;
    }

    .donut-chart__caption {
      font-size: 11px;
      color: var(--muted-foreground);
    }

    .donut-chart__legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .donut-chart__legend li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      border-radius: 6px;
      padding: 4px 6px;
      margin: 0 -6px;
      transition: background-color 0.15s ease, transform 0.15s ease;
      cursor: default;

      &:hover {
        background-color: var(--muted);
        transform: translateX(2px);
      }
    }

    .donut-chart__swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .donut-chart__legend-value {
      font-weight: 600;
      color: var(--foreground);
      font-variant-numeric: tabular-nums;
    }

    .donut-chart__legend-label {
      color: var(--muted-foreground);
    }

    .donut-chart__legend-pct {
      margin-left: auto;
      color: var(--muted-foreground);
      font-variant-numeric: tabular-nums;
    }

    ::ng-deep ngx-charts-pie-chart {
      .ngx-charts text { fill: var(--muted-foreground); font-size: 11px; }
      .arc {
        transition: transform 0.15s ease, opacity 0.15s ease;
        transform-origin: center;
      }
      .arc:hover { transform: scale(1.03); }
    }
  `]
})
export class DonutChartComponent {
  readonly data = input.required<Array<{ label: string; value: number; color?: string }>>();
  readonly caption = input<string>('Total');
  readonly ariaLabel = input<string>('Donut chart');

  readonly colorScheme = CHART_COLOR_SCHEME;

  readonly total = computed(() => this.data().reduce((a, b) => a + b.value, 0));

  readonly chartData = computed(() =>
    this.data().map(d => ({ name: d.label, value: d.value }))
  );

  readonly segments = computed(() => {
    const items = this.data();
    const total = this.total();
    const colors = this.colorScheme.domain;
    return items.map((item, i) => ({
      label: item.label,
      value: item.value,
      color: item.color ?? colors[i % colors.length],
      pct: total === 0 ? 0 : Math.round((item.value / total) * 1000) / 10
    }));
  });

  readonly activeEntries = signal<Array<{ name: string }>>([]);
  onActivate(event: { name: string }): void { this.activeEntries.set([event]); }
  onDeactivate(): void { this.activeEntries.set([]); }
}
