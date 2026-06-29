import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { title, excerpt } = await req.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "Sei un giornalista esperto di ciclismo. Scrivi articoli SEO in italiano.",
      },
      {
        role: "user",
        content: `
Titolo: ${title}

Riassunto:
${excerpt}

Scrivi un articolo di circa 500 parole con:
- titolo
- introduzione
- sottotitoli
- conclusione
`,
      },
    ],
  });

  return Response.json({
    article: response.choices[0].message.content,
  });
}