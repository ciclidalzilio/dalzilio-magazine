import type { Metadata } from "next";

import Calibrator from "@/components/visualize/Calibrator";

export const metadata: Metadata = {
  title: "Taratura foto configuratore · Dal Zilio",
  robots: { index: false },
};

export default function CalibraPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Taratura foto del configuratore</h1>
          <p className="mt-3 text-slate-500">
            Carica la foto di un telaio o di una ruota e segna i punti richiesti: ottieni i valori da inserire nel
            catalogo.
          </p>
        </header>
        <Calibrator />
      </div>
    </main>
  );
}
