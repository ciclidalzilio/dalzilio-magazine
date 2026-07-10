"use client";

import { useEffect, useMemo, useState } from "react";

import Welcome from "@/components/bike-finder/Welcome";
import Question from "@/components/bike-finder/Question";
import Progress from "@/components/bike-finder/Progress";
import { bikeMatcher } from "@/lib/bike-matcher";
import type { ShopifyBike } from "@/types/shopify";

type AnswersState = {
  category: string;
  budget: number;
  usage: string;
  cityPriority: string;
  level: string;
  brand: string;
  height: number;
};

const initialAnswers: AnswersState = {
  category: "",
  budget: 3000,
  usage: "",
  cityPriority: "",
  level: "",
  brand: "",
  height: 175,
};

const normalizeOptionValue = (value: string) =>
  value.replace(/^[^a-zA-Z0-9]+/, "").trim();

const normalizeFlowValue = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const fallbackBikeImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" rx="32" fill="#f3f4f6"/>
      <circle cx="400" cy="250" r="140" fill="#dbeafe"/>
      <path d="M260 320L360 180H430L520 320" stroke="#111827" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M300 320H520" stroke="#111827" stroke-width="18" fill="none" stroke-linecap="round"/>
      <circle cx="300" cy="320" r="44" fill="#111827"/>
      <circle cx="520" cy="320" r="44" fill="#111827"/>
      <path d="M360 180L420 120" stroke="#111827" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M400 180L445 145" stroke="#111827" stroke-width="16" fill="none" stroke-linecap="round"/>
    </svg>
  `);

export default function BikeFinder() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<AnswersState>(initialAnswers);
  const [bikes, setBikes] = useState<ShopifyBike[]>([]);
  const isCityBranchActive =
    normalizeFlowValue(answers.category) === "emtb" && normalizeFlowValue(answers.usage) === "citta";
  const totalSteps = isCityBranchActive ? 7 : 6;

  const updateAnswer = (field: keyof AnswersState, value: string | number) => {
    setAnswers((prev) => {
      const nextAnswers = { ...prev, [field]: value };
      const nextIsCityBranch =
        normalizeFlowValue(String(nextAnswers.category)) === "emtb" &&
        normalizeFlowValue(String(nextAnswers.usage)) === "citta";

      if (!nextIsCityBranch && nextAnswers.cityPriority) {
        nextAnswers.cityPriority = "";
      }

      return nextAnswers;
    });
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const goNext = () => {
    if (step < totalSteps + 1) {
      setStep((prev) => prev + 1);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadBikes() {
      try {
        const response = await fetch("/api/bikes");
        const data = (await response.json()) as ShopifyBike[];

        if (isMounted) {
          setBikes(data);
        }
      } catch (error) {
        console.error("Failed to load bikes", error);
        if (isMounted) {
          setBikes([]);
        }
      }
    }

    void loadBikes();

    return () => {
      isMounted = false;
    };
  }, []);

  const canContinue = (() => {
    switch (step) {
      case 1:
        return Boolean(answers.category);
      case 3:
        return Boolean(answers.usage);
      case 4:
        return isCityBranchActive ? Boolean(answers.cityPriority) : Boolean(answers.level);
      case 5:
        return isCityBranchActive ? Boolean(answers.level) : Boolean(answers.brand);
      case 6:
        return isCityBranchActive ? Boolean(answers.brand) : true;
      default:
        return true;
    }
  })();

  const isResultsStep = step > totalSteps;

  const results = useMemo(() => {
    if (!isResultsStep) {
      return [];
    }

    return bikeMatcher(
      {
        category: normalizeOptionValue(answers.category),
        budget: answers.budget,
        usage: normalizeOptionValue(answers.usage),
        cityPriority: isCityBranchActive ? answers.cityPriority : undefined,
        level: normalizeOptionValue(answers.level),
        brand: normalizeOptionValue(answers.brand),
      },
      bikes,
    );
  }, [answers.budget, answers.brand, answers.category, answers.cityPriority, answers.level, answers.usage, bikes, isCityBranchActive, isResultsStep]);

  if (!started) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <Welcome onStart={() => setStarted(true)} />
        </div>
      </main>
    );
  }

  if (step === 1) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={1} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            <Question
              title="Che tipo di bici stai cercando?"
              options={["🚵 MTB", "⚡ E-MTB", "🚴 Corsa", "🌿 Gravel", "🚲 City / Trekking"]}
              onSelect={(value) => {
                updateAnswer("category", normalizeOptionValue(value));
              }}
            />

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                disabled={!canContinue}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Avanti →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 2) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={2} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            <h2 className="text-center text-3xl font-semibold text-slate-900">
              Qual è il tuo budget?
            </h2>
            <p className="mt-4 text-center text-sm text-slate-500">
              Scegli un limite massimo per la tua nuova bici.
            </p>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center">
              <p className="text-5xl font-bold text-slate-900">€ {answers.budget}</p>
            </div>

            <input
              type="range"
              min="500"
              max="10000"
              step="100"
              value={answers.budget}
              onChange={(event) => updateAnswer("budget", Number(event.target.value))}
              className="mt-8 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
            />

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Avanti →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 3) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={3} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            <Question
              title="Come userai principalmente la bici?"
              options={["🏁 Gara", "💪 Allenamento", "🌲 Trail", "🚴 Weekend", "🧳 Bikepacking", "🏙️ Città"]}
              onSelect={(value) => {
                updateAnswer("usage", normalizeOptionValue(value));
              }}
            />

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                disabled={!canContinue}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Avanti →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 4) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={4} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            {isCityBranchActive ? (
              <Question
                title="Cosa conta di più per te?"
                options={[
                  "Praticità quotidiana",
                  "Autonomia",
                  "Comfort",
                  "Bassa manutenzione",
                  "Facilità nel salire e scendere dalla bici",
                ]}
                onSelect={(value) => {
                  updateAnswer("cityPriority", value);
                }}
              />
            ) : (
              <Question
                title="Qual è il tuo livello?"
                options={["😊 Principiante", "🚴 Intermedio", "🔥 Esperto"]}
                onSelect={(value) => {
                  updateAnswer("level", normalizeOptionValue(value));
                }}
              />
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                disabled={!canContinue}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Avanti →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 5) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={5} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            {isCityBranchActive ? (
              <Question
                title="Qual è il tuo livello?"
                options={["😊 Principiante", "🚴 Intermedio", "🔥 Esperto"]}
                onSelect={(value) => {
                  updateAnswer("level", normalizeOptionValue(value));
                }}
              />
            ) : (
              <Question
                title="Hai una marca preferita?"
                options={["Nessuna", "Trek", "Scott"]}
                onSelect={(value) => {
                  updateAnswer("brand", value);
                }}
              />
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                disabled={!canContinue}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Avanti →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === 6) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={6} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            {isCityBranchActive ? (
              <Question
                title="Hai una marca preferita?"
                options={["Nessuna", "Trek", "Scott"]}
                onSelect={(value) => {
                  updateAnswer("brand", value);
                }}
              />
            ) : (
              <>
                <h2 className="text-center text-3xl font-semibold text-slate-900">
                  Quanto sei alto?
                </h2>
                <p className="mt-4 text-center text-sm text-slate-500">
                  Aiutaci a scegliere una misura più adatta a te.
                </p>

                <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center">
                  <p className="text-5xl font-bold text-slate-900">{answers.height} cm</p>
                </div>

                <input
                  type="range"
                  min="150"
                  max="205"
                  step="1"
                  value={answers.height}
                  onChange={(event) => updateAnswer("height", Number(event.target.value))}
                  className="mt-8 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                />
              </>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Mostra il risultato →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isCityBranchActive && step === 7) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7fb,_#eef2ff)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <Progress step={7} total={totalSteps} />
          <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200/70 sm:p-10">
            <h2 className="text-center text-3xl font-semibold text-slate-900">
              Quanto sei alto?
            </h2>
            <p className="mt-4 text-center text-sm text-slate-500">
              Aiutaci a scegliere una misura più adatta a te.
            </p>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center">
              <p className="text-5xl font-bold text-slate-900">{answers.height} cm</p>
            </div>

            <input
              type="range"
              min="150"
              max="205"
              step="1"
              value={answers.height}
              onChange={(event) => updateAnswer("height", Number(event.target.value))}
              className="mt-8 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
            />

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={goBack}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ← Indietro
              </button>
              <button
                onClick={goNext}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Mostra il risultato →
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const topPickBike = results[0];
  const alternativeBikes = results.slice(1, 3);
  const isBudgetFallback = results.some((bike) => bike.isFallbackAboveBudget);
  const isTopPickAboveBudget = Boolean(topPickBike && topPickBike.price > answers.budget);
  const topPickAmountOverBudget = isTopPickAboveBudget && topPickBike
    ? topPickBike.price - answers.budget
    : 0;

  const getAvailabilityStatus = (availability: ShopifyBike["availability"]) => {
    switch (availability) {
      case "in_stock":
        return "Disponibile";
      case "out_of_stock":
        return "Esaurito";
      case "preorder":
        return "Pre-ordine";
      default:
        return "Disponibile";
    }
  };

  const getShopifyUrl = (productHandle: string) => {
    return `https://ciclidalzilio.com/products/${productHandle}`;
  };

  const getCompatibilityScore = (index: number) => {
    switch (index) {
      case 0:
        return 96;
      case 1:
        return 85;
      case 2:
        return 75;
      default:
        return 60;
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {results.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-lg text-slate-600">Nessuna bici trovata con questi criteri.</p>
              <button
                onClick={() => {
                  setStep(1);
                  setAnswers(initialAnswers);
                }}
                className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Ricomincia
              </button>
            </div>
          </div>
        ) : (
          <>
            {isBudgetFallback && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4">
                <p className="text-sm text-slate-700">
                    Non abbiamo trovato una bici entro il tuo budget. Ti mostriamo le alternative più vicine alla cifra indicata.
                </p>
              </div>
            )}

            {/* Header Section */}
            <div className="mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                IL TUO RISULTATO PERSONALIZZATO
              </p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                La bici perfetta per te
              </h1>
            </div>

            {/* Top Pick Card */}
            {topPickBike && (
              <div className="mb-20">
                <div className="overflow-hidden rounded-[32px] bg-white">
                  <div className="grid gap-0 lg:grid-cols-2 lg:gap-12">
                    {/* Image Section */}
                    <div className="flex items-center justify-center bg-slate-50 py-12 sm:py-16 lg:py-20">
                      <div className="relative w-full max-w-md px-4">
                        <div className="absolute right-4 top-4 flex flex-col gap-3 lg:right-6 lg:top-6">
                          <div className="rounded-full bg-slate-900 px-4 py-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                              LA NOSTRA SCELTA
                            </span>
                          </div>
                          <div className="rounded-full bg-white px-4 py-2 shadow-md">
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                              {getCompatibilityScore(0)}% COMPATIBILITÀ
                            </span>
                          </div>
                        </div>
                        <img
                          src={topPickBike.image || fallbackBikeImage}
                          alt={`${topPickBike.brand} ${topPickBike.model}`}
                          className="h-auto w-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex flex-col justify-between px-6 py-8 sm:px-8 sm:py-10 lg:px-0 lg:py-12">
                      <div>
                        <p className="text-sm font-medium text-slate-500">BRAND</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
                          {topPickBike.brand}
                        </p>

                        <p className="mt-8 text-sm font-medium text-slate-500">MODELLO</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                          {topPickBike.model}
                        </p>

                        <div className="mt-10 flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-slate-900">€ {topPickBike.price}</span>
                          <span className="text-sm text-slate-500">Prezzo indicativo</span>
                        </div>

                        <div className="mt-6">
                          <p className="text-sm font-medium text-slate-500">DISPONIBILITÀ</p>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {getAvailabilityStatus(topPickBike.availability || "in_stock")}
                          </p>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <a
                        href={getShopifyUrl(topPickBike.productHandle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white transition hover:bg-slate-700 sm:mt-10"
                      >
                        Vedi la bici
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reasons Section */}
            <div className="mb-20">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Perché te la consigliamo
              </h2>

              {topPickBike?.matchReasons && topPickBike.matchReasons.length > 0 ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {topPickBike.matchReasons.slice(0, 4).map((reason) => (
                    <div key={reason} className="rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5">
                      <p className="text-sm font-semibold text-slate-900">{reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5">
                    <p className="font-semibold text-slate-900">
                      {isTopPickAboveBudget ? "Vicino al tuo budget" : "Nel tuo budget"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {isTopPickAboveBudget
                        ? `Solo €${topPickAmountOverBudget} oltre la cifra indicata`
                        : `Perfettamente allineata al tuo budget di € ${answers.budget}`}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5">
                    <p className="font-semibold text-slate-900">Categoria ideale</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Modello {answers.category} scelto secondo le tue esigenze
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5">
                    <p className="font-semibold text-slate-900">Adatta al tuo livello</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Progettata per il tuo livello di competenza
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5">
                    <p className="font-semibold text-slate-900">Vicina alle tue preferenze</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Selezionata in base alle tue preferenze personali
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-10 rounded-[24px] bg-slate-50 px-8 py-8 text-center">
                <p className="text-slate-700">
                  {isTopPickAboveBudget
                    ? "Non abbiamo trovato una bici entro il tuo budget. Questa è l'alternativa più adatta e più vicina alla cifra indicata."
                    : "Questa bici rappresenta il miglior equilibrio tra il tuo budget, il tipo di utilizzo e le tue preferenze."}
                </p>
              </div>
            </div>

            {/* Alternatives Section */}
            {alternativeBikes.length > 0 && (
              <div className="mb-20">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Alternative consigliate
                </h2>

                <div className="mt-8 grid gap-8 md:grid-cols-2">
                  {alternativeBikes.map((bike, index) => (
                    <div
                      key={bike.id}
                      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white transition hover:shadow-lg"
                    >
                      {/* Image Section */}
                      <div className="relative bg-slate-50 py-8">
                        <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 shadow-md">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                            {getCompatibilityScore(index + 1)}% COMPATIBILITÀ
                          </span>
                        </div>
                        <img
                          src={bike.image || fallbackBikeImage}
                          alt={`${bike.brand} ${bike.model}`}
                          className="h-48 w-full object-contain"
                        />
                      </div>

                      {/* Info Section */}
                      <div className="px-6 py-6 sm:px-8">
                        <p className="text-sm font-medium text-slate-500">{bike.brand}</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                          {bike.model}
                        </h3>

                        <div className="mt-4 flex items-end justify-between">
                          <p className="text-2xl font-semibold text-slate-900">€ {bike.price}</p>
                          <p className="text-sm text-slate-600">
                            {getAvailabilityStatus(bike.availability || "in_stock")}
                          </p>
                        </div>

                        {bike.matchReasons && bike.matchReasons.length > 0 && (
                          <ul className="mt-4 space-y-2 text-sm text-slate-600">
                            {bike.matchReasons.slice(0, 3).map((reason) => (
                              <li key={reason}>• {reason}</li>
                            ))}
                          </ul>
                        )}

                        <a
                          href={getShopifyUrl(bike.productHandle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-slate-900 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                        >
                          Visualizza
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col gap-4 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => {
                  setStep(1);
                  setAnswers(initialAnswers);
                }}
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Ricomincia
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}