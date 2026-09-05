import Link from 'next/link';
export interface GalleryItem {
  id: string;
  name: string;
  image?: string | null;
  creator?: string;
  price?: string;
}
export function Gallery({ items }: { items: GalleryItem[] }) {
  if (!items.length) return <div className="state-panel">No pieces found.</div>;
  return (
    <div className="gallery-grid">
      {items.map((item, index) => (
        <Link className="art-card" href={`/nft/${encodeURIComponent(item.id)}`} key={item.id}>
          <div
            className="art-image"
            style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
          </div>
          <div className="art-meta">
            <div>
              <h3>{item.name}</h3>
              <p>{item.creator ?? 'Unknown creator'}</p>
            </div>
            {item.price ? <strong>{item.price}</strong> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
