import { DetailTabs } from '../../../components/detail-tabs';
export default async function NftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="content-section">
      <p className="eyebrow">NFT</p>
      <h1>{id}</h1>
      <div className="state-panel">
        <strong>Unavailable until indexed</strong>
        <p>
          Ownership, activity, and listing information will appear here when this NFT is available
          from the API.
        </p>
      </div>
      <DetailTabs
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: <p>Metadata and collection information.</p>,
          },
          { id: 'ownership', label: 'Ownership', content: <p>Current owner and quantity.</p> },
          { id: 'activity', label: 'Activity', content: <p>Transfers and sales.</p> },
          { id: 'listings', label: 'Listings', content: <p>Current and historical listings.</p> },
        ]}
      />
    </section>
  );
}
