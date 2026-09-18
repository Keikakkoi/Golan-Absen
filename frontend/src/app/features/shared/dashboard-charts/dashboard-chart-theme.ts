/** Shared visual contract for every dashboard chart. Keep status colors stable
 * across light/dark mode; surfaces and typography are supplied by CSS tokens. */
export const DASHBOARD_CHART_THEME = {
  status: {
    hadir: '#15803d',
    terlambat: '#b26b00',
    izin: '#1d4ed8',
    alfa: '#b91c1c',
    pending: '#9a5f00',
    neutral: '#475569'
  },
  cssTokens: {
    card: 'var(--chart-card-bg)',
    text: 'var(--chart-text)',
    secondaryText: 'var(--chart-text-secondary)',
    mutedText: 'var(--chart-text-muted)',
    grid: 'var(--chart-grid)',
    track: 'var(--chart-track)'
  }
} as const;
