export default async function NftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="content-section">
      <p className="eyebrow">NFT</p>
      <h1>{id}</h1>
      <div className="state-panel">NFT details and transaction actions will appear here.</div>
    </section>
  );
}
