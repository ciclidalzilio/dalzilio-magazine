"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [articles, setArticles] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then(setArticles);
  }, []);

  async function genera(a: any) {
    setText("Generazione articolo...");

    const res = await fetch("/api/news", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: a.title,
        excerpt: a.excerpt,
      }),
    });

    const data = await res.json();
    setText(data.article);
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>🚴 Dal Zilio Magazine AI</h1>

      {articles.map((a) => (
        <div
          key={a.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <h2>{a.title}</h2>
          <p>{a.excerpt}</p>

          <button onClick={() => genera(a)}>
            Genera articolo con AI
          </button>
        </div>
      ))}

      <hr />

      <pre style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
    </main>
  );
}