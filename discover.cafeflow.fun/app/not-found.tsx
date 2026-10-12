import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Page Not Found</h2>
      <p className="text-sm text-stone-500">The spot or page you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-full bg-[#1d4435] text-white font-semibold text-xs shadow-md"
      >
        Back to Discover
      </Link>
    </div>
  );
}
