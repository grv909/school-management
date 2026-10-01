import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { CHART_COLOR_SCHEME } from './chart-colors';
import { useResponsiveChartSize } from './responsive-chart-size';

/**
 * Bar chart — wraps ngx-charts-bar-vertical behind the same public API the old
 * hand-rolled inline-SVG component exposed, so consumer pages (admin-dashboard,
 * teacher-dashboard, student-profile) need zero template/binding changes.
 *
 * Micro-interactions: gradient-filled, rounded bars; the hovered bar is tracked
 * via activeEntries so its tooltip-anchor pairing is obvious, and ngx-charts'
 * built-in bar grow-in animates on first render/data change.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [NgxChartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0) {
      <div class="empty-state">
        <div class="empty-state__title">{{ emptyLabel() }}</div>
      </div>
    } @else {
      <ngx-charts-bar-vertical
        [view]="view()"
        [results]="chartData()"
        [scheme]="colorScheme"
        [gradient]="true"
        [roundEdges]="true"
        [roundDomains]="true"
        [xAxis]="true"
        [yAxis]="true"
        [showYAxisLabel]="false"
        [showXAxisLabel]="false"
        [yScaleMax]="maxScale()"
        [activeEntries]="activeEntries()"
        (activate)="onActivate($event)"
        (deactivate)="onDeactivate()"
        [attr.aria-label]="ariaLabel()"
        role="img">
      </ngx-charts-bar-vertical>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    ::ng-deep ngx-charts-bar-vertical {
      .ngx-charts text { fill: var(--muted-foreground); font-size: 11px; }
      .gridline-path { stroke: var(--border); }
      .tooltip-anchor { fill: var(--accent); }

      /* Bars already lift via the library's built-in enter animation; a quick
         brighten + lift on hover gives direct feedback beyond the tooltip. */
      .bar {
        transition: filter 0.15s ease, transform 0.15s ease;
        transform-origin: bottom center;
      }
      .bar:hover {
        filter: brightness(1.08);
        transform: scaleY(1.015);
      }
    }
  `]
})
export class BarChartComponent {
  readonly data = input.required<Array<{ label: string; value: number }>>();
  readonly maxValue = input<number | null>(null);
  readonly ariaLabel = input<string>('Bar chart');
  readonly emptyLabel = input<string>('No data available yet');
  readonly height = input<number>(220);

  private readonly elementRef = inject(ElementRef);
  readonly view = useResponsiveChartSize(this.elementRef, this.height());

  readonly colorScheme = CHART_COLOR_SCHEME;

  readonly chartData = computed(() =>
    this.data().map(d => ({ name: d.label, value: d.value }))
  );

  readonly maxScale = computed(() => {
    const override = this.maxValue();
    if (override != null) return override;
    const max = Math.max(0, ...this.data().map(d => d.value));
    return max <= 0 ? 100 : Math.ceil(max / 10) * 10;
  });

  readonly activeEntries = signal<Array<{ name: string; value: number }>>([]);
  onActivate(event: { name: string; value: number }): void { this.activeEntries.set([event]); }
  onDeactivate(): void { this.activeEntries.set([]); }
}
