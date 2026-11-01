import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | BigBites Lahore',
  description: 'BigBites Privacy Policy explaining how we collect, protect, and handle your order information in Lahore.',
};

export default function PrivacyPage() {
  return (
    <div className="bg-[#1B042C] min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-5">
        <div className="rounded-2xl border border-amber-400/25 bg-[#24073B] p-8 md:p-12 shadow-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Legal & Transparency</span>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-xs text-purple-300/60">Effective Date: October 2026 · BigBites Central Kitchen, Lahore</p>

          <div className="mt-8 space-y-6 text-sm text-purple-200/80 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">1. Information We Collect</h2>
              <p>
                When you place an order with BigBites (Cash on Delivery or pickup), we collect essential contact and delivery details:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-purple-200/70">
                <li><strong>Customer Name & Mobile Number:</strong> Required to confirm your food preparation and coordinate with delivery riders.</li>
                <li><strong>Delivery Address & Zone:</strong> Specific house, street, block, or society information in Lahore to route our dispatchers.</li>
                <li><strong>Order History & Selections:</strong> Dishes ordered, spice level preferences, add-ons, and fulfillment types (Hot & Fast vs. Scheduled Freezer Packs).</li>
                <li><strong>Email Address (Optional):</strong> Used solely for receipts, order confirmations, and customer support inquiries.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">2. How We Protect Your Data (PII Privacy)</h2>
              <p>
                BigBites strictly respects customer privacy. We do not sell, rent, or trade your personal information to third-party advertisers.
              </p>
              <p>
                Public order tracking pages display masked customer phone numbers and abbreviated addresses to prevent automated web scraping and unauthorized identity harvesting. Only authenticated account owners and verified dispatchers can access complete order profiles.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">3. Payment Information & Cash on Delivery</h2>
              <p>
                BigBites currently operates exclusively on a <strong>Cash on Delivery (COD)</strong> fulfillment model. We do not store, process, or transmit credit card numbers or banking PINs on our servers. You pay our rider directly upon safe delivery of your hot or frozen food package.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">4. Sharing with Delivery Personnel</h2>
              <p>
                To complete deliveries across Lahore (Gulberg, DHA, Bahria Town, Model Town, Johar Town, etc.), your delivery address and contact phone number are securely shared with the assigned BigBites dispatch rider for the sole purpose of delivery fulfillment.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-amber-300">5. Contact Our Privacy Officer</h2>
              <p>
                If you have questions regarding your personal information or wish to request data deletion, contact our kitchen management team:
              </p>
              <div className="rounded-xl border border-amber-400/20 bg-[#1C0430] p-4 text-xs space-y-1 text-purple-200/90">
                <p><strong>BigBites Central Kitchen</strong></p>
                <p>Main Boulevard, Gulberg III, Lahore, Punjab, Pakistan</p>
                <p>Email: <a href="mailto:support@bigbites.pk" className="text-amber-400 hover:underline">support@bigbites.pk</a></p>
                <p>WhatsApp Kitchen Support: <a href="https://wa.me/923001234567" className="text-emerald-400 hover:underline">+92 300 1234567</a></p>
              </div>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-purple-800/40 flex justify-between items-center text-xs">
            <Link href="/" className="text-amber-400 hover:underline">← Back to Menu</Link>
            <Link href="/terms" className="text-purple-300/70 hover:text-white">View Terms of Service →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
