"use client";

import { useEffect, useRef, useState } from "react";

import type { Point } from "@/lib/bike-visualizer";

type Mode = "frame" | "wheel";

const steps: Record<Mode, string[]> = {
  frame: [
    "Clicca al centro dell'asse della ruota posteriore",
    "Clicca al centro dell'asse della ruota anteriore",
    "Clicca dove arriverebbe il bordo esterno della gomma anteriore (in alto)",
  ],
  wheel: [
    "Clicca al centro del mozzo",
    "Clicca sul bordo esterno della gomma",
    "Clicca dove la gomma incontra il cerchio",
  ],
};

const distance = (a: Point, b: Point) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));

export default function Calibrator() {
  const [mode, setMode] = useState<Mode>("frame");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const done = points.length === 3;

  const output = !image || !done
    ? ""
    : mode === "frame"
      ? `photo: {\n  width: ${image.naturalWidth},\n  height: ${image.naturalHeight},\n  rearAxle: { x: ${points[0].x}, y: ${points[0].y} },\n  frontAxle: { x: ${points[1].x}, y: ${points[1].y} },\n  wheelRadius: ${distance(points[1], points[2])},\n},`
      : `photo: {\n  hub: { x: ${points[0].x}, y: ${points[0].y} },\n  tyreRadius: ${distance(points[0], points[1])},\n  rimRadius: ${distance(points[0], points[2])},\n},`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    const size = Math.max(canvas.width, canvas.height) / 150;
    ctx.lineWidth = size / 2;
    ctx.strokeStyle = "#e11d48";
    ctx.fillStyle = "#e11d48";

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cerchi di controllo: devono combaciare con le gomme / il cerchio.
    const circle = (c: Point, r: number) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
    };
    if (mode === "frame" && points.length === 3) {
      const r = distance(points[1], points[2]);
      circle(points[0], r);
      circle(points[1], r);
    }
    if (mode === "wheel") {
      if (points.length >= 2) circle(points[0], distance(points[0], points[1]));
      if (points.length === 3) circle(points[0], distance(points[0], points[2]));
    }
  }, [image, points, mode]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setPoints([]);
    };
    img.src = URL.createObjectURL(file);
  };

  const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || done) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * image.naturalWidth);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * image.naturalHeight);
    setPoints((prev) => [...prev, { x, y }]);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Il testo resta selezionabile a mano.
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-6">
        {image ? (
          <canvas
            ref={canvasRef}
            onClick={onClick}
            className={`h-auto w-full rounded-2xl bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:24px_24px] ${done ? "" : "cursor-crosshair"}`}
          />
        ) : (
          <div className="grid aspect-[5/3] place-items-center rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-500">
            Carica una foto PNG con sfondo trasparente
          </div>
        )}
      </section>

      <aside className="space-y-6 rounded-3xl bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-6">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
          {(["frame", "wheel"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setPoints([]);
              }}
              className={`rounded-full px-2 py-2 text-sm font-semibold transition ${
                mode === m ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {m === "frame" ? "Telaio" : "Ruota"}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-900">
            Foto {mode === "frame" ? "del telaio (senza ruote)" : "della ruota"}
          </span>
          <input
            id="calibra-file"
            type="file"
            accept="image/png,image/webp"
            onChange={(event) => onFile(event.target.files?.[0])}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        <ol className="space-y-2">
          {steps[mode].map((text, i) => (
            <li
              key={text}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                i === points.length && image ? "border-slate-900 font-semibold text-slate-900" : "border-slate-200 text-slate-500"
              } ${i < points.length ? "line-through" : ""}`}
            >
              {i + 1}. {text}
            </li>
          ))}
        </ol>

        {points.length > 0 && (
          <button
            onClick={() => setPoints([])}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Ricomincia i clic
          </button>
        )}

        {output && (
          <div>
            <p className="mb-2 text-sm text-slate-600">
              Controlla che i cerchi rossi combacino, poi copia questi valori nel catalogo (
              <code>lib/bike-visualizer.ts</code>).
            </p>
            <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">{output}</pre>
            <button
              onClick={copy}
              className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {copied ? "✓ Copiato" : "Copia valori"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
