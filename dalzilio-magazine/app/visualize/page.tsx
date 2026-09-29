import type { Metadata } from "next";

import Configurator from "@/components/visualize/Configurator";
import { configToQuery, parseConfig } from "@/lib/bike-visualizer";

export const metadata: Metadata = {
  title: "Configura la tua bici · Dal Zilio",
  description: "Scegli telaio, colorazione, ruote e colore delle gomme e guarda subito il risultato.",
};

export default async function VisualizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Normalizza i parametri (valori sconosciuti → default) prima di passarli al client.
  const initialQuery = configToQuery(parseConfig(await searchParams));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">🚴 Configura la tua bici</h1>
          <p className="mt-3 text-slate-500">
            Scegli telaio, ruote e colore delle gomme: l&apos;anteprima si aggiorna in tempo reale.
          </p>
        </header>
        <Configurator initialQuery={initialQuery} />
      </div>
    </main>
  );
}
