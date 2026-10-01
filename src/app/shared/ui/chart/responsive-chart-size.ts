import { DestroyRef, ElementRef, Signal, inject, signal } from '@angular/core';

/**
 * ngx-charts requires an explicit [view]=[width,height] pixel pair (no built-in
 * auto-resize input) — a fixed default width was the direct cause of charts
 * overflowing their .card container on narrow/grid layouts. This observes the
 * chart's host element and recomputes [view] to actually fill it, so charts
 * are responsive rather than a guessed constant.
 */
export function useResponsiveChartSize(elementRef: ElementRef<HTMLElement>, height: number): Signal<[number, number]> {
  const size = signal<[number, number]>([560, height]);
  const destroyRef = inject(DestroyRef);

  const observer = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width;
    if (width && width > 0) {
      size.set([Math.floor(width), height]);
    }
  });
  observer.observe(elementRef.nativeElement);
  destroyRef.onDestroy(() => observer.disconnect());

  return size.asReadonly();
}
