import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Lightweight inline-SVG line chart with area fill. Zero-dep companion to BarChartComponent.
 *
 * TODO: Replace mock service with real API integration later — chart consumes already-aggregated
 * data so backend changes won't touch this component.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" class="chart chart--line" role="img" [attr.aria-label]="ariaLabel()">
      <!-- Grid -->
      @for (g of grid(); track g.y) {
        <line [attr.x1]="padX" [attr.y1]="g.y" [attr.x2]="width() - padX" [attr.y2]="g.y" class="chart__grid"></line>
        <text [attr.x]="padX - 6" [attr.y]="g.y + 3" class="chart__axis-text" text-anchor="end">{{ g.value }}</text>
      }
      <!-- Area fill -->
      <path [attr.d]="areaPath()" class="chart__area"></path>
      <!-- Line -->
      <path [attr.d]="linePath()" class="chart__line"></path>
      <!-- Points + labels -->
      @for (p of points(); track p.label) {
        <g>
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" class="chart__point"></circle>
          <text [attr.x]="p.x" [attr.y]="height() - padY + 16" class="chart__axis-text" text-anchor="middle">{{ p.label }}</text>
        </g>
      }
    </svg>
  `,
  styles: [`
    .chart { width: 100%; height: auto; display: block; }
    .chart__grid { stroke: #E1E4EA; stroke-width: 1; stroke-dasharray: 2 3; }
    .chart__axis-text { fill: #5B6373; font-size: 10px; font-family: inherit; }
    .chart__line { fill: none; stroke: #2D5F8B; stroke-width: 2; }
    .chart__area { fill: rgba(45, 95, 139, 0.10); stroke: none; }
    .chart__point { fill: #FFFFFF; stroke: #2D5F8B; stroke-width: 2; }
  `]
})
export class LineChartComponent {
  readonly data = input.required<Array<{ label: string; value: number }>>();
  readonly maxValue = input<number | null>(null);
  readonly minValue = input<number | null>(null);
  readonly ariaLabel = input<string>('Line chart');
  readonly width = input<number>(560);
  readonly height = input<number>(220);

  readonly padX = 36;
  readonly padY = 24;

  readonly maxScale = computed(() => {
    const override = this.maxValue();
    if (override != null) return override;
    const max = Math.max(...this.data().map(d => d.value), 0);
    return max <= 0 ? 100 : Math.ceil(max / 10) * 10;
  });

  readonly minScale = computed(() => this.minValue() ?? 0);

  readonly points = computed(() => {
    const items = this.data();
    if (items.length === 0) return [];
    const innerW = this.width() - this.padX * 2;
    const innerH = this.height() - this.padY * 2;
    const step = items.length === 1 ? 0 : innerW / (items.length - 1);
    const max = this.maxScale();
    const min = this.minScale();
    const range = Math.max(1, max - min);
    return items.map((d, i) => {
      const x = this.padX + step * i;
      const y = this.padY + innerH - ((d.value - min) / range) * innerH;
      return { x, y, label: d.label, value: d.value };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const innerH = this.height() - this.padY;
    const open = `M ${pts[0].x} ${innerH}`;
    const line = pts.map(p => `L ${p.x} ${p.y}`).join(' ');
    const close = `L ${pts[pts.length - 1].x} ${innerH} Z`;
    return `${open} ${line} ${close}`;
  });

  readonly grid = computed(() => {
    const max = this.maxScale();
    const min = this.minScale();
    const innerH = this.height() - this.padY * 2;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round(min + ((max - min) / steps) * (steps - i));
      const y = this.padY + (innerH / steps) * i;
      return { y, value };
    });
  });
}
