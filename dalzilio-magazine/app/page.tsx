"use client";

import { useCallback, useEffect, useState } from "react";

type Article = {
  id: number;
  title: string;
  excerpt?: string | null;
  image?: string;
  link?: string;
};

type Reader = {
  open: boolean;
  loading: boolean;
  title: string;
  source: string;
  content: string;
};

const SHOP_URL = "https://www.ciclidalzilio.com";

/** Google News titles arrive as "Headline - Source"; split them for display. */
function splitTitle(raw: string): { title: string; source: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx > 20 && idx > raw.length - 40) {
    return { title: raw.slice(0, idx).trim(), source: raw.slice(idx + 3).trim() };
  }
  return { title: raw.trim(), source: "" };
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [reader, setReader] = useState<Reader>({
    open: false,
    loading: false,
    title: "",
    source: "",
    content: "",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/articles")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setArticles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const closeReader = useCallback(() => {
    setReader((r) => ({ ...r, open: false }));
  }, []);

  useEffect(() => {
    if (!reader.open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeReader();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [reader.open, closeReader]);

  async function genera(a: Article) {
    const { title, source } = splitTitle(a.title);
    setGeneratingId(a.id);
    setReader({ open: true, loading: true, title, source, content: "" });
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: a.title, excerpt: a.excerpt }),
      });
      const data = await res.json();
      setReader({
        open: true,
        loading: false,
        title,
        source,
        content: data.article ?? "Nessun contenuto generato.",
      });
    } catch {
      setReader((r) => ({
        ...r,
        loading: false,
        content: "Si è verificato un errore durante la generazione dell'articolo. Riprova.",
      }));
    } finally {
      setGeneratingId(null);
    }
  }

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/72 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-5">
          <a href="/" className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-semibold tracking-tight text-ink">Dal Zilio</span>
            <span className="text-[17px] font-normal text-muted">Magazine</span>
          </a>
          <nav className="flex items-center gap-1 text-[12px] font-normal sm:gap-2 sm:text-[13px]">
            <a
              href="#magazine"
              className="hidden rounded-full px-2.5 py-1.5 text-ink/80 transition-colors hover:text-ink sm:inline-block"
            >
              Magazine
            </a>
            <a
              href="/bike-finder"
              className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-ink/80 transition-colors hover:text-ink"
            >
              Bike Finder
            </a>
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 rounded-full bg-accent px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Shop
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="bg-paper px-5 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-3xl">
            <p className="kicker mb-4 uppercase text-accent">Il magazine di Cicli Dal Zilio</p>
            <h1 className="display text-[2.6rem] leading-[1.06] text-ink sm:text-6xl">
              Cultura, tecnica e passione.
              <br />
              <span className="text-muted">Su due ruote.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
              Le ultime notizie dal mondo del ciclismo, riscritte e approfondite dalla
              nostra redazione con l&apos;aiuto dell&apos;intelligenza artificiale.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 text-[17px]">
              <a
                href="#magazine"
                className="rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Leggi il magazine
              </a>
              <a href="/bike-finder" className="link-arrow font-normal">
                Trova la tua bici
              </a>
            </div>
          </div>
        </section>

        {/* ---------- Articles ---------- */}
        <section id="magazine" className="bg-canvas px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="display text-3xl text-ink sm:text-5xl">Ultime dal mondo bici</h2>
              <p className="mt-3 text-lg text-muted">Aggiornato in tempo reale.</p>
            </div>

            {loading && <SkeletonGrid />}

            {error && !loading && (
              <p className="mx-auto max-w-xl rounded-3xl bg-paper px-6 py-12 text-center text-muted shadow-sm">
                Non è stato possibile caricare le notizie in questo momento. Riprova più tardi.
              </p>
            )}

            {!loading && !error && articles.length === 0 && (
              <p className="mx-auto max-w-xl rounded-3xl bg-paper px-6 py-12 text-center text-muted shadow-sm">
                Nessun articolo disponibile al momento.
              </p>
            )}

            {!loading && !error && featured && (
              <FeaturedCard
                article={featured}
                generating={generatingId === featured.id}
                onGenerate={() => genera(featured)}
              />
            )}

            {rest.length > 0 && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a, i) => (
                  <ArticleCard
                    key={a.id}
                    article={a}
                    index={i}
                    generating={generatingId === a.id}
                    onGenerate={() => genera(a)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Bike Finder CTA ---------- */}
        <section className="bg-canvas px-5 pb-16 sm:pb-24">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-ink px-6 py-16 text-center text-white sm:py-24">
            <p className="kicker mb-4 uppercase text-[color:var(--color-accent-hover)]">Bike Finder</p>
            <h2 className="display mx-auto max-w-2xl text-3xl sm:text-5xl">
              Non sai quale bici fa per te?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/70">
              Rispondi a poche domande e lascia che sia il nostro configuratore a
              consigliarti il modello giusto.
            </p>
            <div className="mt-9">
              <a
                href="/bike-finder"
                className="inline-block rounded-full bg-accent px-7 py-3.5 text-[17px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Avvia il Bike Finder
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-line bg-canvas-2">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-ink">Dal Zilio</span>
            <span className="text-[15px] text-muted">Magazine</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted">
            <a href="#magazine" className="transition-colors hover:text-ink">Magazine</a>
            <a href="/bike-finder" className="transition-colors hover:text-ink">Bike Finder</a>
            <a
              href={SHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              ciclidalzilio.com
            </a>
          </nav>
          <p className="text-[12px] text-muted">© {new Date().getFullYear()} Cicli Dal Zilio</p>
        </div>
      </footer>

      {/* ---------- AI reader overlay ---------- */}
      {reader.open && (
        <div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-ink/40 px-4 py-6 backdrop-blur-md sm:py-12"
          onClick={closeReader}
        >
          <article
            className="reader-scroll relative h-fit w-full max-w-2xl rounded-[24px] bg-paper p-6 shadow-2xl rise sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeReader}
              aria-label="Chiudi"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-muted transition-colors hover:bg-line hover:text-ink"
            >
              ✕
            </button>

            <p className="kicker uppercase text-accent">Articolo generato con AI</p>
            <h2 className="display mt-3 pr-8 text-2xl text-ink sm:text-3xl">{reader.title}</h2>
            {reader.source && (
              <p className="mt-2 text-sm text-muted">Fonte originale · {reader.source}</p>
            )}

            <hr className="my-6 border-line" />

            {reader.loading ? (
              <div className="flex flex-col items-center gap-4 py-14 text-muted">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
                <p className="text-sm">La redazione AI sta scrivendo l&apos;articolo…</p>
              </div>
            ) : (
              <div className="reader whitespace-pre-wrap text-[1.05rem] text-ink-soft">
                {reader.content}
              </div>
            )}
          </article>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function ArticleImage({ src, alt, rounded }: { src?: string; alt: string; rounded?: string }) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden bg-canvas ${rounded ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
    </div>
  );
}

function GenerateButton({
  generating,
  onGenerate,
}: {
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <button
      onClick={onGenerate}
      disabled={generating}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
    >
      {generating ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Generazione…
        </>
      ) : (
        <>Genera con AI</>
      )}
    </button>
  );
}

function FeaturedCard({
  article,
  generating,
  onGenerate,
}: {
  article: Article;
  generating: boolean;
  onGenerate: () => void;
}) {
  const { title, source } = splitTitle(article.title);
  return (
    <article className="group overflow-hidden rounded-[28px] bg-paper shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-xl rise">
      <ArticleImage src={article.image} alt={title} />
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center sm:px-12 sm:py-14">
        <p className="kicker uppercase text-accent">
          In evidenza{source ? ` · ${source}` : ""}
        </p>
        <h3 className="display max-w-2xl text-[1.75rem] text-ink sm:text-4xl">{title}</h3>
        {article.excerpt && (
          <p className="max-w-xl text-lg leading-relaxed text-muted line-clamp-3">
            {article.excerpt}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <GenerateButton generating={generating} onGenerate={onGenerate} />
          {article.link && (
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="link-arrow text-[15px]">
              Leggi la fonte
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function ArticleCard({
  article,
  index,
  generating,
  onGenerate,
}: {
  article: Article;
  index: number;
  generating: boolean;
  onGenerate: () => void;
}) {
  const { title, source } = splitTitle(article.title);
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-3xl bg-paper shadow-sm ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rise"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      <ArticleImage src={article.image} alt={title} />
      <div className="flex flex-1 flex-col items-center gap-2.5 px-5 py-7 text-center">
        {source && <span className="kicker uppercase text-muted">{source}</span>}
        <h3 className="text-[1.15rem] font-semibold leading-snug tracking-tight text-ink line-clamp-3">
          {title}
        </h3>
        {article.excerpt && (
          <p className="text-[15px] leading-relaxed text-muted line-clamp-2">{article.excerpt}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-4">
          <GenerateButton generating={generating} onGenerate={onGenerate} />
          {article.link && (
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="link-arrow text-[14px]">
              Fonte
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <>
      <div className="overflow-hidden rounded-[28px] bg-paper shadow-sm">
        <div className="aspect-[16/10] animate-pulse bg-canvas" />
        <div className="flex animate-pulse flex-col items-center gap-4 px-8 py-12">
          <div className="h-3 w-28 rounded bg-canvas" />
          <div className="h-8 w-3/4 rounded bg-canvas" />
          <div className="h-4 w-1/2 rounded bg-canvas" />
          <div className="mt-2 h-10 w-40 rounded-full bg-canvas" />
        </div>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl bg-paper shadow-sm">
            <div className="aspect-[16/10] animate-pulse bg-canvas" />
            <div className="flex animate-pulse flex-col items-center gap-3 px-5 py-7">
              <div className="h-3 w-20 rounded bg-canvas" />
              <div className="h-5 w-4/5 rounded bg-canvas" />
              <div className="h-4 w-2/3 rounded bg-canvas" />
              <div className="mt-2 h-9 w-32 rounded-full bg-canvas" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
