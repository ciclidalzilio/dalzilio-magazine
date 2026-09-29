// Catalogo e logica del configuratore bici (/visualize).
// Per aggiungere telai, colorazioni o ruote basta aggiungere voci qui sotto.
//
// Foto vere: quando un telaio (colorazione) e una ruota hanno entrambi `image`,
// la bici viene composta con le foto invece che disegnata.
// - Telaio: PNG trasparente di profilo (lato catena) SENZA ruote, in
//   public/visualizer/frames/. `photo` va sul modello: tutte le colorazioni
//   devono avere la stessa inquadratura.
// - Ruota: PNG trasparente di una ruota intera con gomma nera, in
//   public/visualizer/wheels/.
// I numeri di `photo` si ottengono con la pagina /visualize/calibra.

export type Finish = "matt" | "gloss";

export type FrameColor = {
  id: string;
  name: string;
  primary: string; // colore principale dei tubi
  secondary: string; // forcella / carro posteriore
  logo: string; // colore scritte
  finish: Finish;
  image?: string;
};

export type Point = { x: number; y: number };

// Coordinate in pixel sulla foto del telaio.
export type FramePhoto = {
  width: number;
  height: number;
  rearAxle: Point;
  frontAxle: Point;
  wheelRadius: number; // raggio esterno della gomma
};

// Coordinate in pixel sulla foto della ruota.
export type WheelPhoto = {
  hub: Point;
  tyreRadius: number; // bordo esterno della gomma
  rimRadius: number; // dove la gomma incontra il cerchio
};

export type FrameModel = {
  id: string;
  brand: string;
  model: string;
  type: "road" | "gravel";
  tyreWidth: number; // mm
  photo?: FramePhoto;
  colors: FrameColor[];
};

export type Wheelset = {
  id: string;
  brand: string;
  name: string;
  rimDepth: number; // mm
  rimColor: string;
  decal: string; // testo sul cerchio
  decalColor: string;
  spokes: number;
  hubColor: string;
  image?: string;
  photo?: WheelPhoto;
};

export type Swatch = { id: string; name: string; color: string };

export const frames: FrameModel[] = [
  {
    id: "pinarello_f5_2026",
    brand: "Pinarello",
    model: "F5 2026",
    type: "road",
    tyreWidth: 28,
    colors: [
      { id: "etna-black-matt", name: "Etna Black Matt", primary: "#1b1b1d", secondary: "#141416", logo: "#8a8a8f", finish: "matt" },
      { id: "xolar-red", name: "Xolar Red", primary: "#b3121f", secondary: "#7d0c15", logo: "#f4f4f4", finish: "gloss" },
      { id: "ice-white", name: "Ice White", primary: "#eceff3", secondary: "#d7dbe1", logo: "#1b1b1d", finish: "gloss" },
    ],
  },
  {
    id: "specialized_tarmac-sl8",
    brand: "Specialized",
    model: "Tarmac SL8",
    type: "road",
    tyreWidth: 28,
    colors: [
      { id: "satin-carbon", name: "Satin Carbon", primary: "#2a2c30", secondary: "#222428", logo: "#c9ccd2", finish: "matt" },
      { id: "metallic-sapphire", name: "Metallic Sapphire", primary: "#1f3a8a", secondary: "#162a63", logo: "#e5e7eb", finish: "gloss" },
      { id: "birch-white", name: "Birch White", primary: "#f1ede4", secondary: "#e2dccf", logo: "#3f3f46", finish: "gloss" },
    ],
  },
  {
    id: "cannondale_supersix-evo",
    brand: "Cannondale",
    model: "SuperSix EVO",
    type: "road",
    tyreWidth: 28,
    colors: [
      { id: "black-magic", name: "Black Magic", primary: "#111111", secondary: "#111111", logo: "#57d45f", finish: "gloss" },
      { id: "highlighter", name: "Highlighter", primary: "#d6f22a", secondary: "#b8d31c", logo: "#111111", finish: "gloss" },
    ],
  },
  {
    id: "canyon_grizl-cf",
    brand: "Canyon",
    model: "Grizl CF",
    type: "gravel",
    tyreWidth: 42,
    colors: [
      { id: "olive-matt", name: "Olive Matt", primary: "#5b6146", secondary: "#4a4f39", logo: "#e9e3cf", finish: "matt" },
      { id: "sand-dune", name: "Sand Dune", primary: "#c8b28a", secondary: "#b09a72", logo: "#2e2a24", finish: "matt" },
      { id: "deep-teal", name: "Deep Teal", primary: "#0f4c5c", secondary: "#0b3a46", logo: "#f4c95d", finish: "gloss" },
    ],
  },
];

export const wheelsets: Wheelset[] = [
  { id: "hunt_4am-limitless_black", brand: "Hunt", name: "4AM Limitless · Black", rimDepth: 48, rimColor: "#16171a", decal: "HUNT", decalColor: "#3a3b40", spokes: 24, hubColor: "#1c1c1f" },
  { id: "hunt_4am-limitless_white", brand: "Hunt", name: "4AM Limitless · White", rimDepth: 48, rimColor: "#16171a", decal: "HUNT", decalColor: "#f5f5f5", spokes: 24, hubColor: "#1c1c1f" },
  { id: "zipp_454-nsw", brand: "Zipp", name: "454 NSW", rimDepth: 58, rimColor: "#1a1a1a", decal: "ZIPP", decalColor: "#cfd2d6", spokes: 24, hubColor: "#2a2a2a" },
  { id: "dt-swiss_arc-1100", brand: "DT Swiss", name: "ARC 1100 Dicut 62", rimDepth: 62, rimColor: "#151515", decal: "DT SWISS", decalColor: "#e11d2a", spokes: 20, hubColor: "#222" },
  { id: "campagnolo_bora-wto-45", brand: "Campagnolo", name: "Bora WTO 45", rimDepth: 45, rimColor: "#1b1b1b", decal: "BORA", decalColor: "#e8e8e8", spokes: 24, hubColor: "#262626" },
  { id: "fulcrum_racing-5", brand: "Fulcrum", name: "Racing 5 (alluminio)", rimDepth: 24, rimColor: "#2b2b2b", decal: "FULCRUM", decalColor: "#9ca3af", spokes: 24, hubColor: "#3a3a3a" },
];

export const tyreColors: Swatch[] = [
  { id: "black", name: "Nero", color: "#1a1a1a" },
  { id: "tan", name: "Para (tanwall)", color: "#c49a6c" },
  { id: "white", name: "Bianco", color: "#f2f2f2" },
  { id: "red", name: "Rosso", color: "#c81e1e" },
  { id: "pink", name: "Rosa", color: "#f472b6" },
  { id: "blue", name: "Blu", color: "#2563eb" },
  { id: "yellow", name: "Giallo", color: "#facc15" },
  { id: "green", name: "Verde", color: "#16a34a" },
];

export const accessoryColors: Swatch[] = [
  { id: "black", name: "Nero", color: "#1a1a1a" },
  { id: "white", name: "Bianco", color: "#f5f5f5" },
  { id: "tan", name: "Cuoio", color: "#a47148" },
  { id: "red", name: "Rosso", color: "#c81e1e" },
  { id: "pink", name: "Rosa", color: "#f472b6" },
  { id: "blue", name: "Blu", color: "#2563eb" },
  { id: "yellow", name: "Giallo", color: "#facc15" },
];

export type BikeConfig = {
  frame: FrameModel;
  color: FrameColor;
  wheels: Wheelset;
  tyre: Swatch;
  tape: Swatch;
  saddle: Swatch;
};

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.toLowerCase() ?? "";

const pick = <T extends { id: string }>(list: T[], id: string) =>
  list.find((item) => item.id.toLowerCase() === id) ?? list[0];

// `frame` è "<modello>_<colore>", es. pinarello_f5_2026_etna-black-matt
export function parseConfig(params: Params): BikeConfig {
  const frameParam = first(params.frame);
  const frame =
    frames.find((f) => frameParam === f.id || frameParam.startsWith(`${f.id}_`)) ?? frames[0];
  const colorId = frameParam.startsWith(`${frame.id}_`) ? frameParam.slice(frame.id.length + 1) : "";

  return {
    frame,
    color: pick(frame.colors, colorId),
    wheels: pick(wheelsets, first(params.w)),
    tyre: pick(tyreColors, first(params.tyreColor)),
    tape: pick(accessoryColors, first(params.tape)),
    saddle: pick(accessoryColors, first(params.saddle)),
  };
}

export function configToQuery(config: BikeConfig) {
  return new URLSearchParams({
    frame: `${config.frame.id}_${config.color.id}`,
    w: config.wheels.id,
    tyreColor: config.tyre.id,
    tape: config.tape.id,
    saddle: config.saddle.id,
  }).toString();
}

export const hasPhotos = (config: BikeConfig) =>
  Boolean(config.frame.photo && config.color.image && config.wheels.photo && config.wheels.image);
