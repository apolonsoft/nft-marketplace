'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
export function DiscoveryControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('after');
      next.delete('before');
      router.replace(`${pathname}?${next}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);
  return (
    <div className="filter-row">
      <input
        aria-label="Search artwork"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search artwork"
      />
      <select
        aria-label="Sort results"
        defaultValue={searchParams.get('sort') ?? 'createdAt'}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set('sort', event.target.value);
          next.delete('after');
          next.delete('before');
          router.push(`${pathname}?${next}`);
        }}
      >
        <option value="createdAt">Recently added</option>
        <option value="name">Name</option>
        <option value="price">Price</option>
      </select>
    </div>
  );
}
