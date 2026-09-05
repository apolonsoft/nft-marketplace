export default async function CreatorPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return (
    <section className="content-section">
      <p className="eyebrow">CREATOR</p>
      <h1>{address}</h1>
      <div className="state-panel">Creator activity will appear here.</div>
    </section>
  );
}
