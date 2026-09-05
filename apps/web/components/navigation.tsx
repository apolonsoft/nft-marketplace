'use client';
import Link from 'next/link';
import { useState } from 'react';
import { WalletControl } from './wallet-control';
const links = [
  ['Explore', '/explore'],
  ['Collections', '/collections'],
  ['Creators', '/creators'],
  ['Activity', '/activity'],
  ['Create', '/create'],
] as const;
export function Navigation() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="brand" href="/">
        FRAME
      </a>
      <button
        className="menu-button"
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Menu
      </button>
      <nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
        <Link href="/account">Account</Link>
      </nav>
      <WalletControl />
    </header>
  );
}
