import { Gallery } from '../../components/gallery';
import { fetchExplore } from '../../lib/api';
export default async function ExplorePage() {
  const result = await fetchExplore();
  return (
    <section className="content-section">
      <p className="eyebrow">DISCOVER</p>
      <h1>Explore</h1>
      <p className="lede">Browse the latest listings and collections.</p>
      <div className="filter-row">
        <input aria-label="Search artwork" placeholder="Search artwork" />
        <select aria-label="Sort results" defaultValue="recent">
          <option value="recent">Recently added</option>
          <option value="price">Price</option>
        </select>
      </div>
      <Gallery items={result.items} />
    </section>
  );
}
