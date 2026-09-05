export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <section className="content-section">
      <p className="eyebrow">COLLECTION</p>
      <h1>{slug}</h1>
      <div className="state-panel">Collection details are loading from the catalog.</div>
    </section>
  );
}
