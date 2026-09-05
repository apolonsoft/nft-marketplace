import { Gallery } from '../../components/gallery';
import { fetchExplore } from '../../lib/api';
import { DiscoveryControls } from '../../components/discovery-controls';
import { Pagination } from '../../components/pagination';
export default async function ExplorePage() {
  const result = await fetchExplore({ resource: 'nfts', first: 24 });
  return (
    <section className="content-section">
      <p className="eyebrow">DISCOVER</p>
      <h1>Explore</h1>
      <p className="lede">Browse the latest listings and collections.</p>
      <DiscoveryControls />
      <Gallery items={result.items} />
      <Pagination pageInfo={result.pageInfo} />
    </section>
  );
}
