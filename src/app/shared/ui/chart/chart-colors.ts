import { Color, ScaleType } from '@swimlane/ngx-charts';

// Mirrors styles/abstracts/_variables.scss's $color-accent/-secondary/-tertiary and
// $color-border-strong. ngx-charts computes D3 color scales internally and can't
// consume CSS custom properties (var(--accent)) directly, so these stay in sync
// manually with the SCSS tokens — same manual-mirror pattern already used between
// _variables.scss and base/_root.scss.
export const CHART_COLOR_SCHEME: Color = {
  name: 'erp-brand',
  selectable: true,
  group: ScaleType.Ordinal,
  domain: ['#0052FF', '#4D7CFF', '#93A9F5', '#CBD5E1']
};
