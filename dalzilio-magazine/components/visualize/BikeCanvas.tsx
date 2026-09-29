import type { Ref } from "react";

import type { BikeConfig, Wheelset } from "@/lib/bike-visualizer";

// Scala del disegno: pixel SVG per millimetro reale.
const S = 0.6;
const REAR = { x: 220, y: 430 };
const FRONT = { x: 814, y: 430 };
const BB = { x: 463, y: 472 };
const FONT = "Arial, Helvetica, sans-serif";

type Tube = { d: string; w: number; color: string };

function Wheel({
  cx,
  cy,
  wheels,
  tyreColor,
  tyreWidth,
  id,
}: {
  cx: number;
  cy: number;
  wheels: Wheelset;
  tyreColor: string;
  tyreWidth: number;
  id: string;
}) {
  const rimOuter = 311 * S;
  const rimInner = (311 - wheels.rimDepth) * S;
  const rimMid = (rimOuter + rimInner) / 2;
  const rimWidth = rimOuter - rimInner;
  const tyre = tyreWidth * S;
  const decalSize = Math.min(rimWidth * 0.55, 20);
  const hubR = 12;

  const spokes = Array.from({ length: wheels.spokes }, (_, i) => {
    const a = (2 * Math.PI * i) / wheels.spokes;
    const b = a + (i % 2 === 0 ? 0.32 : -0.32);
    return {
      x1: cx + hubR * Math.cos(a),
      y1: cy + hubR * Math.sin(a),
      x2: cx + rimInner * Math.cos(b),
      y2: cy + rimInner * Math.sin(b),
    };
  });

  const decalPath = `M ${cx - rimMid},${cy} a ${rimMid},${rimMid} 0 1,1 ${2 * rimMid},0 a ${rimMid},${rimMid} 0 1,1 ${-2 * rimMid},0`;

  return (
    <g>
      {spokes.map((s, i) => (
        <line key={i} {...s} stroke="#34363b" strokeWidth={1.6} />
      ))}
      <circle cx={cx} cy={cy} r={hubR + 4} fill={wheels.hubColor} />
      <circle cx={cx} cy={cy} r={5} fill="#9ca3af" />

      <circle cx={cx} cy={cy} r={rimMid} fill="none" stroke={wheels.rimColor} strokeWidth={rimWidth} />
      <circle cx={cx} cy={cy} r={rimOuter - 1.5} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={2} />
      <path id={id} d={decalPath} fill="none" />
      {["10%", "60%"].map((offset) => (
        <text
          key={offset}
          fill={wheels.decalColor}
          fontFamily={FONT}
          fontWeight={800}
          fontSize={decalSize}
          letterSpacing={decalSize * 0.25}
          dominantBaseline="central"
        >
          <textPath href={`#${id}`} startOffset={offset}>
            {wheels.decal}
          </textPath>
        </text>
      ))}

      <circle cx={cx} cy={cy} r={rimOuter + tyre / 2} fill="none" stroke={tyreColor} strokeWidth={tyre} />
      <circle cx={cx} cy={cy} r={rimOuter + tyre - 1.5} fill="none" stroke="#141414" strokeWidth={3} />
    </g>
  );
}

function TubeSet({ tubes, finish }: { tubes: Tube[]; finish: "matt" | "gloss" }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {tubes.map((t, i) => (
        <path key={`b${i}`} d={t.d} stroke={t.color} strokeWidth={t.w} />
      ))}
      {tubes.map((t, i) => (
        <path
          key={`s${i}`}
          d={t.d}
          stroke="#000"
          strokeOpacity={0.18}
          strokeWidth={t.w * 0.3}
          transform={`translate(0 ${t.w * 0.3})`}
        />
      ))}
      {finish === "gloss" &&
        tubes.map((t, i) => (
          <path
            key={`h${i}`}
            d={t.d}
            stroke="#fff"
            strokeOpacity={0.35}
            strokeWidth={Math.max(t.w * 0.18, 1.5)}
            transform={`translate(0 ${-t.w * 0.22})`}
          />
        ))}
    </g>
  );
}

export default function BikeCanvas({
  config,
  background = "light",
  svgRef,
}: {
  config: BikeConfig;
  background?: "light" | "dark";
  svgRef?: Ref<SVGSVGElement>;
}) {
  const { frame, color, wheels, tyre, tape, saddle } = config;
  const bg = background === "dark" ? "#16181d" : "#f4f5f7";

  const rear: Tube[] = [
    { d: `M ${BB.x},${BB.y} L ${REAR.x},${REAR.y}`, w: 14, color: color.secondary },
    { d: `M 392,200 L ${REAR.x},${REAR.y}`, w: 11, color: color.secondary },
  ];
  const main: Tube[] = [
    { d: `M ${BB.x},${BB.y} L 385,192`, w: 22, color: color.primary },
    { d: `M 738,228 L ${BB.x},${BB.y}`, w: 28, color: color.primary },
    { d: "M 716,162 L 385,196", w: 19, color: color.primary },
    { d: "M 716,150 L 742,236", w: 30, color: color.primary },
    { d: `M 742,240 C 770,320 798,388 ${FRONT.x},${FRONT.y}`, w: 16, color: color.secondary },
  ];

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 40 1040 620"
      className="h-auto w-full"
      role="img"
      aria-label={`${frame.brand} ${frame.model} ${color.name} con ruote ${wheels.brand} ${wheels.name} e gomme ${tyre.name}`}
    >
      <rect x={0} y={40} width={1040} height={620} fill={bg} />
      <ellipse cx={517} cy={648} rx={430} ry={10} fill="#000" opacity={0.12} />

      <Wheel id="rear-rim" cx={REAR.x} cy={REAR.y} wheels={wheels} tyreColor={tyre.color} tyreWidth={frame.tyreWidth} />
      <Wheel id="front-rim" cx={FRONT.x} cy={FRONT.y} wheels={wheels} tyreColor={tyre.color} tyreWidth={frame.tyreWidth} />

      {/* Trasmissione lato catena */}
      <g fill="none" stroke="#2b2d31" strokeLinecap="round">
        <circle cx={REAR.x} cy={REAR.y} r={30} fill="#6b7280" stroke="#3f4248" strokeWidth={4} />
        <path d={`M ${BB.x},${BB.y - 60} L ${REAR.x},${REAR.y - 30}`} strokeWidth={4} />
        <path d={`M ${BB.x},${BB.y + 60} L 236,488 L ${REAR.x + 6},${REAR.y + 30}`} strokeWidth={4} />
        <path d={`M ${REAR.x + 4},${REAR.y + 10} L 236,488`} strokeWidth={7} stroke="#1f2023" />
        <circle cx={236} cy={488} r={7} fill="#1f2023" />
      </g>

      <TubeSet tubes={rear} finish={color.finish} />
      <TubeSet tubes={main} finish={color.finish} />

      {/* Scritte sul telaio */}
      <path id="dt-logo" d="M 492,442 L 716,246" fill="none" />
      <text fill={color.logo} fontFamily={FONT} fontWeight={900} fontSize={19} letterSpacing={3} dominantBaseline="central">
        <textPath href="#dt-logo" startOffset="50%" textAnchor="middle">
          {frame.brand.toUpperCase()}
        </textPath>
      </text>
      <path id="tt-logo" d="M 430,191 L 690,165" fill="none" />
      <text fill={color.logo} fontFamily={FONT} fontWeight={700} fontSize={10} letterSpacing={2} dominantBaseline="central">
        <textPath href="#tt-logo" startOffset="50%" textAnchor="middle">
          {frame.model.toUpperCase()}
        </textPath>
      </text>

      {/* Reggisella, sella, attacco manubrio, manubrio */}
      <g strokeLinecap="round" fill="none">
        <path d="M 386,188 L 360,92" stroke="#1d1e21" strokeWidth={13} />
        <path d="M 296,84 C 330,70 380,72 418,80 L 414,90 C 380,86 330,88 300,96 Z" fill={saddle.color} stroke="#111" strokeWidth={1.5} />
        <path d="M 712,138 L 718,152" stroke="#1d1e21" strokeWidth={26} />
        <path d="M 714,140 L 790,128" stroke="#1d1e21" strokeWidth={13} />
        <path d="M 790,128 C 840,122 868,142 860,184 C 854,216 830,222 812,210" stroke={tape.color} strokeWidth={11} />
        <path d="M 836,124 C 852,128 862,138 862,156" stroke="#1d1e21" strokeWidth={9} />
      </g>

      {/* Guarnitura */}
      <g>
        <circle cx={BB.x} cy={BB.y} r={60} fill="none" stroke="#2b2d31" strokeWidth={7} />
        <circle cx={BB.x} cy={BB.y} r={44} fill="none" stroke="#3f4248" strokeWidth={3} />
        <path d={`M ${BB.x},${BB.y} L ${BB.x + 28},${BB.y + 96}`} stroke="#1d1e21" strokeWidth={13} strokeLinecap="round" />
        <rect x={BB.x + 12} y={BB.y + 92} width={34} height={9} rx={3} fill="#1d1e21" />
        <circle cx={BB.x} cy={BB.y} r={12} fill="#4b5563" />
      </g>
    </svg>
  );
}
