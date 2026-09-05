'use client';
import { useState } from 'react';
export function DetailTabs({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  return (
    <div className="detail-tabs">
      <div className="tab-list" role="tablist" aria-label="Detail sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="tab-button"
            role="tab"
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => {
              const index = tabs.findIndex((item) => item.id === active);
              if (event.key === 'ArrowRight') setActive(tabs[(index + 1) % tabs.length]!.id);
              if (event.key === 'ArrowLeft')
                setActive(tabs[(index - 1 + tabs.length) % tabs.length]!.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) =>
        active === tab.id ? (
          <section key={tab.id} role="tabpanel" className="tab-panel">
            {tab.content}
          </section>
        ) : null,
      )}
    </div>
  );
}
