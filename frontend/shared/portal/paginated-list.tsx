import { useState, type ReactNode } from 'react';

export function PageList({
  items,
  children,
  label,
  pageSize = 2,
}: {
  items: ReactNode[];
  children?: ReactNode;
  label: string;
  pageSize?: number;
}) {
  const [requested, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pages - 1);
  return (
    <>
      {children}
      {items.slice(page * pageSize, page * pageSize + pageSize)}
      {pages > 1 && (
        <nav className="portal-list-pagination" aria-label={label}>
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span role="status">
            {page + 1} / {pages}
          </span>
          <button type="button" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </nav>
      )}
    </>
  );
}
