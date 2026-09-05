'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
export function Pagination({
  pageInfo,
}: {
  pageInfo?:
    | {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
      }
    | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (!pageInfo || (!pageInfo.hasNextPage && !pageInfo.hasPreviousPage)) return null;
  const go = (key: 'after' | 'before', cursor: string | null) => {
    if (!cursor) return;
    const next = new URLSearchParams(params.toString());
    next.delete('after');
    next.delete('before');
    next.set(key, cursor);
    router.push(`${pathname}?${next}`);
  };
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="button"
        disabled={!pageInfo.hasPreviousPage}
        onClick={() => go('before', pageInfo.startCursor)}
      >
        Previous
      </button>
      <button
        className="button"
        disabled={!pageInfo.hasNextPage}
        onClick={() => go('after', pageInfo.endCursor)}
      >
        Next
      </button>
    </nav>
  );
}
