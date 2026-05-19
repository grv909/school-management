import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Lightweight inline-SVG bar chart. Zero deps so the bundle stays small.
 *
 * Why not Chart.js / ApexCharts: pulling either in for this scope would add ~200KB
 * to the lazy chunks and conflict with the existing strict bundle budget. The SVG
 * approach is also crisper for marketing screenshots.
 *
 * TODO: If the project ever needs interactive zoom / tooltips / large datasets,
 * swap this for a real charting lib via a feature flag.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" class="chart chart--bar" role="img" [attr.aria-label]="ariaLabel()">
      <!-- Y-axis grid lines -->
      @for (g of grid(); track g.y) {
        <line [attr.x1]="padX" [attr.y1]="g.y" [attr.x2]="width() - padX" [attr.y2]="g.y" class="chart__grid"></line>
        <text [attr.x]="padX - 6" [attr.y]="g.y + 3" class="chart__axis-text" text-anchor="end">{{ g.value }}</text>
      }
      <!-- Bars -->
      @for (b of bars(); track b.label) {
        <g>
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" class="chart__bar" rx="2"></rect>
          <text [attr.x]="b.x + b.w / 2" [attr.y]="b.y - 4" class="chart__bar-value" text-anchor="middle">{{ b.value }}</text>
          <text [attr.x]="b.x + b.w / 2" [attr.y]="height() - padY + 16" class="chart__axis-text" text-anchor="middle">{{ b.label }}</text>
        </g>
      }
    </svg>
  `,
  styles: [`
    .chart { width: 100%; height: auto; display: block; }
    .chart__grid { stroke: #E1E4EA; stroke-width: 1; stroke-dasharray: 2 3; }
    .chart__axis-text { fill: #5B6373; font-size: 10px; font-family: inherit; }
    .chart__bar { fill: #2D5F8B; transition: fill 180ms ease; }
    .chart__bar:hover { fill: #234B6E; }
    .chart__bar-value { fill: #1F2430; font-size: 10px; font-weight: 600; font-family: inherit; }
  `]
})
export class BarChartComponent {
  readonly data = input.required<Array<{ label: string; value: number }>>();
  readonly maxValue = input<number | null>(null);
  readonly ariaLabel = input<string>('Bar chart');
  readonly width = input<number>(560);
  readonly height = input<number>(220);

  readonly padX = 36;
  readonly padY = 28;

  readonly maxScale = computed(() => {
    const override = this.maxValue();
    if (override != null) return override;
    const max = Math.max(0, ...this.data().map(d => d.value));
    if (max <= 0) return 100;
    return Math.ceil(max / 10) * 10;
  });

  readonly bars = computed(() => {
    const items = this.data();
    if (items.length === 0) return [];
    const innerW = this.width() - this.padX * 2;
    const innerH = this.height() - this.padY * 2;
    const slot = innerW / items.length;
    const barW = Math.max(6, slot * 0.62);
    const max = this.maxScale();
    return items.map((d, i) => {
      const h = max === 0 ? 0 : (d.value / max) * innerH;
      const x = this.padX + slot * i + (slot - barW) / 2;
      const y = this.padY + innerH - h;
      return { x, y, w: barW, h, label: d.label, value: d.value };
    });
  });

  readonly grid = computed(() => {
    const max = this.maxScale();
    const innerH = this.height() - this.padY * 2;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round((max / steps) * (steps - i));
      const y = this.padY + (innerH / steps) * i;
      return { y, value };
    });
  });
}
