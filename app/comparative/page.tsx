import Nav from "@/components/nav";

export default function ComparativePage() {
  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-navy">
            Comparative Note Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate comparative study notes across prescribed texts.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">
            Comparative note generation is coming in Phase 2.
          </p>
        </div>
      </main>
    </div>
  );
}
