const portalDateFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function dateLabel(date: string): string {
  return portalDateFormatter.format(new Date(`${date}T12:00:00Z`));
}
