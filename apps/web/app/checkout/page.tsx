import { TransactionStatus, TransactionState } from '@nft-marketplace/ui';
export default function CheckoutPage() {
  return (
    <section className="content-section">
      <p className="eyebrow">COLLECT</p>
      <h1>Checkout</h1>
      <TransactionStatus state={TransactionState.INTENT} />
      <div className="state-panel">Select an item to begin a wallet transaction.</div>
    </section>
  );
}
