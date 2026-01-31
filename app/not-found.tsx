export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-black text-white">
      <div className="flex items-center gap-6">
        <h1 className="text-5xl font-semibold tracking-tight">404</h1>

        <div className="h-12 w-px bg-white/30" />

        <p className="text-lg text-white/90">This page could not be found.</p>
      </div>
    </main>
  );
}
