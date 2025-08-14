import { ConnectPara } from "@/components/wallet/ConnectPara";

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Duello</h1>
        <ConnectPara />
      </header>

      <section className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-2">Welcome</h2>
        <p className="text-sm text-neutral-600">
          Trustless P2P betting on Mantle. Connect your Para wallet to begin.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-1">Markets</h3>
          <p className="text-sm text-neutral-600">List and explore available markets (coming soon).</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-1">Create Market</h3>
          <p className="text-sm text-neutral-600">Create a new 2-way moneyline market (coming soon).</p>
        </div>
      </section>
    </main>
  );
}
