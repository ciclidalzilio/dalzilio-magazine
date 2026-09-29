"use client";

import { useEffect, useRef, useState } from "react";

import BikeCanvas from "@/components/visualize/BikeCanvas";
import {
  accessoryColors,
  configToQuery,
  frames,
  parseConfig,
  tyreColors,
  wheelsets,
  type BikeConfig,
  type Swatch,
} from "@/lib/bike-visualizer";

type Tab = "frame" | "wheels" | "tyres" | "details";

const tabs: { id: Tab; label: string }[] = [
  { id: "frame", label: "Telaio" },
  { id: "wheels", label: "Ruote" },
  { id: "tyres", label: "Gomme" },
  { id: "details", label: "Dettagli" },
];

const randomItem = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function SwatchPicker({
  swatches,
  selected,
  onSelect,
}: {
  swatches: Swatch[];
  selected: string;
  onSelect: (swatch: Swatch) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {swatches.map((swatch) => (
        <button
          key={swatch.id}
          onClick={() => onSelect(swatch)}
          title={swatch.name}
          aria-label={swatch.name}
          aria-pressed={swatch.id === selected}
          className={`h-11 w-11 rounded-full border-2 transition ${
            swatch.id === selected ? "border-slate-900 ring-2 ring-slate-900 ring-offset-2" : "border-slate-200 hover:border-slate-400"
          }`}
          style={{ backgroundColor: swatch.color }}
        />
      ))}
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      {subtitle && <span className={`block text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{subtitle}</span>}
    </button>
  );
}

export default function Configurator({ initialQuery }: { initialQuery: string }) {
  const [config, setConfig] = useState<BikeConfig>(() =>
    parseConfig(Object.fromEntries(new URLSearchParams(initialQuery))),
  );
  const [tab, setTab] = useState<Tab>("frame");
  const [background, setBackground] = useState<"light" | "dark">("light");
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Tiene l'URL sincronizzato così la configurazione è condivisibile.
  useEffect(() => {
    window.history.replaceState(null, "", `?${configToQuery(config)}`);
  }, [config]);

  const update = (patch: Partial<BikeConfig>) => setConfig((prev) => ({ ...prev, ...patch }));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia il link:", window.location.href);
    }
  };

  const download = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const source = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2080;
      canvas.height = 1240;
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `${config.frame.id}_${config.color.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    image.src = url;
  };

  const randomize = () => {
    const frame = randomItem(frames);
    setConfig({
      frame,
      color: randomItem(frame.colors),
      wheels: randomItem(wheelsets),
      tyre: randomItem(tyreColors),
      tape: randomItem(accessoryColors),
      saddle: randomItem(accessoryColors),
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-6">
        <div className="overflow-hidden rounded-2xl">
          <BikeCanvas config={config} background={background} svgRef={svgRef} />
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{config.frame.brand}</p>
            <h2 className="text-2xl font-semibold text-slate-900">{config.frame.model}</h2>
            <p className="text-sm text-slate-500">
              {config.color.name} · {config.wheels.brand} {config.wheels.name} · gomme {config.tyre.name.toLowerCase()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBackground(background === "light" ? "dark" : "light")}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {background === "light" ? "🌙 Sfondo scuro" : "☀️ Sfondo chiaro"}
            </button>
            <button
              onClick={randomize}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              🎲 Casuale
            </button>
            <button
              onClick={download}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              ⬇️ Scarica PNG
            </button>
            <button
              onClick={share}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {copied ? "✓ Link copiato" : "🔗 Condividi"}
            </button>
          </div>
        </div>
      </section>

      <aside className="rounded-3xl bg-white p-4 shadow-2xl shadow-slate-200/70 sm:p-6">
        <div className="grid grid-cols-4 gap-1 rounded-full bg-slate-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                tab === t.id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {tab === "frame" && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Modello</h3>
                {frames.map((frame) => (
                  <OptionButton
                    key={frame.id}
                    active={frame.id === config.frame.id}
                    title={`${frame.brand} ${frame.model}`}
                    subtitle={frame.type === "gravel" ? "Gravel" : "Strada"}
                    onClick={() => update({ frame, color: frame.colors[0] })}
                  />
                ))}
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Colorazione <span className="font-normal text-slate-500">· {config.color.name}</span>
                </h3>
                <SwatchPicker
                  swatches={config.frame.colors.map((c) => ({ id: c.id, name: c.name, color: c.primary }))}
                  selected={config.color.id}
                  onSelect={(swatch) => update({ color: config.frame.colors.find((c) => c.id === swatch.id) })}
                />
              </div>
            </>
          )}

          {tab === "wheels" && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Ruote</h3>
              {wheelsets.map((wheels) => (
                <OptionButton
                  key={wheels.id}
                  active={wheels.id === config.wheels.id}
                  title={`${wheels.brand} ${wheels.name}`}
                  subtitle={`Profilo ${wheels.rimDepth} mm · ${wheels.spokes} raggi`}
                  onClick={() => update({ wheels })}
                />
              ))}
            </div>
          )}

          {tab === "tyres" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Colore gomme <span className="font-normal text-slate-500">· {config.tyre.name}</span>
              </h3>
              <SwatchPicker swatches={tyreColors} selected={config.tyre.id} onSelect={(tyre) => update({ tyre })} />
            </div>
          )}

          {tab === "details" && (
            <>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Nastro manubrio <span className="font-normal text-slate-500">· {config.tape.name}</span>
                </h3>
                <SwatchPicker swatches={accessoryColors} selected={config.tape.id} onSelect={(tape) => update({ tape })} />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Sella <span className="font-normal text-slate-500">· {config.saddle.name}</span>
                </h3>
                <SwatchPicker swatches={accessoryColors} selected={config.saddle.id} onSelect={(saddle) => update({ saddle })} />
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
