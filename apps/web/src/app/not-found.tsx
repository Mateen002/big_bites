import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-[#1B042C] min-h-[70vh] flex items-center justify-center pt-24 pb-16 px-5">
      <div className="mx-auto max-w-md text-center rounded-2xl border border-amber-400/20 bg-[#24073B] p-8 shadow-2xl">
        <span className="text-4xl">🍔</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-white">Dish Not Found</h1>
        <p className="mt-2 text-sm text-purple-200/70">
          The page or product you are looking for has moved, expired, or doesn&apos;t exist.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/order-now" className="btn-primary text-sm py-2.5 px-5">
            Hot & Fast Menu →
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-[#25083E] px-5 py-2.5 text-sm font-semibold text-amber-300 hover:bg-[#340c57] transition"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
