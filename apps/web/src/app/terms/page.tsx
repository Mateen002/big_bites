import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | BigBites Lahore',
  description: 'BigBites Terms of Service detailing order placement, Cash on Delivery, delivery schedules, and fulfillment terms.',
};

export default function TermsPage() {
  return (
    <div className="bg-[#1B042C] min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-5">
        <div className="rounded-2xl border border-amber-400/25 bg-[#24073B] p-8 md:p-12 shadow-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Legal Agreement</span>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-white">Terms of Service</h1>
          <p className="mt-2 text-xs text-purple-300/60">Last Updated: October 2026 · Lahore, Pakistan</p>

          <div className="mt-8 space-y-6 text-sm text-purple-200/80 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">1. Acceptance of Terms</h2>
              <p>
                By accessing BigBites web platform or placing an order for Hot & Fast food or Stock Freezer ready-to-cook items, you agree to comply with and be bound by these Terms of Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">2. Ordering & Kitchen Acceptance</h2>
              <p>
                All orders placed through BigBites are subject to kitchen inventory and dispatch confirmation. Upon placing an order:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-purple-200/70">
                <li>Your order enters <strong>PENDING</strong> status until accepted by the central kitchen.</li>
                <li>Once confirmed, fresh dishes move into <strong>PREPARING</strong> and cannot be cancelled or modified.</li>
                <li>Estimated delivery times (typically 30–60 minutes depending on your Lahore delivery zone) are estimates and may vary during adverse weather, high-traffic hours, or peak dinner rushes.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">3. Cash on Delivery (COD) Commitment</h2>
              <p>
                When choosing Cash on Delivery, the customer undertakes an obligation to be present at the designated delivery address with the exact or approximate order amount in Pakistani Rupees (PKR) when the rider arrives.
              </p>
              <p>
                Unjustified refusals to accept freshly prepared food upon delivery result in immediate blacklist of the phone number and delivery address from future orders.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">4. Hot & Fast vs. Scheduled Freezer Packs</h2>
              <p>
                BigBites offers two fulfillment models:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-purple-200/70">
                <li><strong>Hot Now:</strong> Cooked to order, packaged hot, and dispatched immediately via thermal delivery containers.</li>
                <li><strong>Stock Freezer:</strong> Blast-frozen, vacuum-sealed items delivered in insulated cooling packs during your selected delivery window (Lunch, Afternoon, or Dinner slot).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">5. Self-Pickup Policy</h2>
              <p>
                Customers choosing <strong>Pick-Up</strong> can collect orders directly from BigBites Central Kitchen (Gulberg III, Lahore) with <strong>Rs 0 delivery fee</strong>. Please present your Order ID (BB-YYYYMMDD-XXXX) at the counter upon arrival.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">6. Customer Support & Dispute Resolution</h2>
              <p>
                If your order arrives damaged, missing items, or does not meet our high standards, please report it within 30 minutes of receipt via our dedicated WhatsApp kitchen desk at +92 300 1234567.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-purple-800/40 flex justify-between items-center text-xs">
            <Link href="/privacy" className="text-purple-300/70 hover:text-white">← Privacy Policy</Link>
            <Link href="/refunds" className="text-amber-400 hover:underline">Refund Policy →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
