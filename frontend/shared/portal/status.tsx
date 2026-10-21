export function Status({ value }: { value: string }) {
  const tone = ['Confirmed', 'Approved', 'Completed', 'Reviewed', 'Valid'].includes(value)
    ? 'green'
    : ['Pending', 'Needs cover', 'Awaiting signature'].includes(value)
      ? 'amber'
      : 'gray';
  return <span className={`status ${tone}`}>{value}</span>;
}
