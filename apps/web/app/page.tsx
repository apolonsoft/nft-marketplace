import { Gallery } from '../components/gallery';
import { fetchExplore } from '../lib/api';

export default async function HomePage() {
  const result = await fetchExplore({ resource: 'nfts', first: 6 });
  return (
    <>
      <section className="editorial-hero">
        <p className="eyebrow">NFT MARKETPLACE</p>
        <h1>Find work worth keeping.</h1>
        <p>Explore collections, creators, and moments secured onchain.</p>
        <a className="button" href="/explore">
          Explore gallery
        </a>
      </section>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED NOW</p>
            <h2>Featured pieces</h2>
          </div>
          <a href="/explore">View all</a>
        </div>
        <Gallery items={result.items} />
      </section>
    </>
  );
}
