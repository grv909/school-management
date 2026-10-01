import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { CHART_COLOR_SCHEME } from './chart-colors';
import { useResponsiveChartSize } from './responsive-chart-size';

/**
 * Line chart — wraps ngx-charts-line-chart behind the same public API the old
 * hand-rolled inline-SVG component exposed, so consumer pages need zero
 * template/binding changes.
 *
 * NOTE: ngx-charts-area-chart (gradient fill beneath the line) was tried here
 * for a more modern look, but it throws `scale.nice is not a function` at
 * runtime with this ngx-charts version when yScaleMin/yScaleMax are both set
 * — reverted to the plain line chart, which doesn't hit that code path.
 * Micro-interaction is CSS-only: hovering a data point enlarges its dot.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [NgxChartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0) {
      <div class="empty-state">
        <div class="empty-state__title">{{ emptyLabel() }}</div>
      </div>
    } @else {
      <ngx-charts-line-chart
        [view]="view()"
        [results]="chartData()"
        [scheme]="colorScheme"
        [xAxis]="true"
        [yAxis]="true"
        [showYAxisLabel]="false"
        [showXAxisLabel]="false"
        [yScaleMax]="maxScale()"
        [yScaleMin]="minScale()"
        [roundDomains]="true"
        [attr.aria-label]="ariaLabel()"
        role="img">
      </ngx-charts-line-chart>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    ::ng-deep ngx-charts-line-chart {
      .ngx-charts text { fill: var(--muted-foreground); font-size: 11px; }
      .gridline-path { stroke: var(--border); }
      .line-series path { stroke-width: 2.5px; }

      .circle {
        transition: r 0.15s ease, fill-opacity 0.15s ease;
      }
      .circle:hover {
        r: 6;
      }
    }
  `]
})
export class LineChartComponent {
  readonly data = input.required<Array<{ label: string; value: number }>>();
  readonly maxValue = input<number | null>(null);
  readonly minValue = input<number | null>(null);
  readonly ariaLabel = input<string>('Line chart');
  readonly emptyLabel = input<string>('No data available yet');
  readonly height = input<number>(220);

  private readonly elementRef = inject(ElementRef);
  readonly view = useResponsiveChartSize(this.elementRef, this.height());

  readonly colorScheme = CHART_COLOR_SCHEME;

  readonly chartData = computed(() => [
    {
      name: this.ariaLabel(),
      series: this.data().map(d => ({ name: d.label, value: d.value }))
    }
  ]);

  readonly maxScale = computed(() => {
    const override = this.maxValue();
    if (override != null) return override;
    const max = Math.max(...this.data().map(d => d.value), 0);
    return max <= 0 ? 100 : Math.ceil(max / 10) * 10;
  });

  readonly minScale = computed(() => this.minValue() ?? 0);
}
