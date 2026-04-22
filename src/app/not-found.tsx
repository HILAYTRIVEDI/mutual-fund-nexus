import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <div className="text-6xl font-bold text-[var(--accent-gold)]">404</div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Page Not Found</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-[var(--accent-gold)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
