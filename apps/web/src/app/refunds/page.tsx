import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund & Quality Guarantee Policy | BigBites Lahore',
  description: 'BigBites Refund & Food Quality Policy explaining our fresh replacement protocol, cancellation windows, and customer satisfaction guarantee.',
};

export default function RefundsPage() {
  return (
    <div className="bg-[#1B042C] min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-5">
        <div className="rounded-2xl border border-amber-400/25 bg-[#24073B] p-8 md:p-12 shadow-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Customer Assurance</span>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-white">Refund & Quality Policy</h1>
          <p className="mt-2 text-xs text-purple-300/60">100% Quality & Freshness Guarantee · Lahore, Pakistan</p>

          <div className="mt-8 space-y-6 text-sm text-purple-200/80 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">1. Freshness & Hygiene Guarantee</h2>
              <p>
                At BigBites, we take extreme pride in authentic Lahori recipes, premium meats, and uncompromising hygiene. Every dish is prepared in our temperature-controlled central kitchen following strict food safety guidelines.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">2. Missing, Incorrect, or Damaged Items</h2>
              <p>
                In the rare event that an item is missing from your package, incorrect options were prepared, or food was damaged in transit:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-purple-200/70">
                <li><strong>Immediate Replacement:</strong> We dispatch an expedited rider with the correct fresh item at no additional charge.</li>
                <li><strong>Order Credit:</strong> If you prefer not to wait for a replacement, we issue a discount voucher or immediate Cash on Delivery adjustment.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">3. How to Report an Issue</h2>
              <p>
                Because food items are perishable, please report any quality or order discrepancies within <strong>30 minutes of receiving delivery</strong>:
              </p>
              <div className="rounded-xl border border-amber-400/20 bg-[#1C0430] p-4 text-xs space-y-2 text-purple-200/90">
                <p>1. Take a quick photo of the delivered food and receipt label.</p>
                <p>2. Send it with your Order Number (e.g. <code>BB-20261030-XXXX</code>) to our WhatsApp Kitchen Helpline: <a href="https://wa.me/923001234567" className="text-emerald-400 font-bold hover:underline">+92 300 1234567</a>.</p>
                <p>3. Our kitchen duty supervisor will resolve your complaint immediately.</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">4. Order Cancellation Window</h2>
              <p>
                Orders can be cancelled free of charge only while the order status is <strong>PENDING</strong> (within 5 minutes of placing). Once the kitchen status shifts to <strong>PREPARING</strong>, fresh ingredients have already hit the flame, and the order can no longer be cancelled.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-purple-800/40 flex justify-between items-center text-xs">
            <Link href="/" className="text-amber-400 hover:underline">← Back to Menu</Link>
            <Link href="/terms" className="text-purple-300/70 hover:text-white">Terms of Service →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
