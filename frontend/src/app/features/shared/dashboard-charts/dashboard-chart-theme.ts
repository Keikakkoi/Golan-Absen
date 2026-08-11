/** Shared visual contract for every dashboard chart. Keep status colors stable
 * across light/dark mode; surfaces and typography are supplied by CSS tokens. */
export const DASHBOARD_CHART_THEME = {
  status: {
    hadir: '#16a34a',
    terlambat: '#f59e0b',
    izin: '#2563eb',
    alfa: '#dc2626',
    pending: '#eab308',
    neutral: '#64748b'
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
