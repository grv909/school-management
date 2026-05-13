import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Lightweight SVG donut chart. Used for things like gender distribution.
 * Renders proportional arcs around a centred hole; total label sits in the middle.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut">
      <svg viewBox="0 0 120 120" class="donut__svg" role="img" [attr.aria-label]="ariaLabel()">
        @for (seg of segments(); track seg.label) {
          <path [attr.d]="seg.d" [attr.fill]="seg.color"></path>
        }
        <circle cx="60" cy="60" r="32" fill="#FFFFFF"></circle>
        <text x="60" y="58" text-anchor="middle" class="donut__total">{{ total() }}</text>
        <text x="60" y="72" text-anchor="middle" class="donut__caption">{{ caption() }}</text>
      </svg>
      <ul class="donut__legend">
        @for (seg of segments(); track seg.label) {
          <li>
            <span class="donut__swatch" [style.background]="seg.color"></span>
            <span class="donut__legend-label">{{ seg.label }}</span>
            <span class="donut__legend-value">{{ seg.value }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .donut { display: flex; gap: 16px; align-items: center; }
    .donut__svg { width: 140px; height: 140px; flex-shrink: 0; }
    .donut__total { font-size: 18px; font-weight: 700; fill: #1F2430; font-family: inherit; }
    .donut__caption { font-size: 10px; fill: #5B6373; font-family: inherit; }
    .donut__legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .donut__legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .donut__swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
    .donut__legend-label { color: #1F2430; }
    .donut__legend-value { margin-left: auto; color: #5B6373; font-variant-numeric: tabular-nums; }
  `]
})
export class DonutChartComponent {
  readonly data = input.required<Array<{ label: string; value: number; color?: string }>>();
  readonly caption = input<string>('Total');
  readonly ariaLabel = input<string>('Donut chart');

  private readonly defaultColors = ['#2D5F8B', '#5C8FB5', '#9AB7CF', '#C8CDD7'];

  readonly total = computed(() => this.data().reduce((a, b) => a + b.value, 0));

  readonly segments = computed(() => {
    const items = this.data();
    const total = this.total();
    if (total === 0) return [];
    let cumulative = 0;
    return items.map((item, i) => {
      const startAngle = (cumulative / total) * Math.PI * 2;
      cumulative += item.value;
      const endAngle = (cumulative / total) * Math.PI * 2;
      const color = item.color ?? this.defaultColors[i % this.defaultColors.length];
      return {
        label: item.label,
        value: item.value,
        color,
        d: this.arcPath(60, 60, 50, startAngle, endAngle)
      };
    });
  });

  private arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
    // Edge: full circle.
    if (Math.abs(end - start) >= Math.PI * 2 - 0.0001) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
    }
    const sx = cx + r * Math.sin(start);
    const sy = cy - r * Math.cos(start);
    const ex = cx + r * Math.sin(end);
    const ey = cy - r * Math.cos(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
  }
}
