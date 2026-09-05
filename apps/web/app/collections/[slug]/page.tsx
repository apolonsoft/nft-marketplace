import { DetailTabs } from '../../../components/detail-tabs';

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <section className="content-section">
      <p className="eyebrow">COLLECTION</p>
      <h1>{slug}</h1>
      <div className="state-panel">Collection details are loading from the catalog.</div>
      <DetailTabs
        tabs={[
          { id: 'overview', label: 'Overview', content: <p>Collection metadata and supply.</p> },
          { id: 'activity', label: 'Activity', content: <p>Collection activity.</p> },
          { id: 'listings', label: 'Listings', content: <p>Collection listings.</p> },
        ]}
      />
    </section>
  );
}
