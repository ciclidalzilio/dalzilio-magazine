import Parser from "rss-parser";

const parser = new Parser();

export async function GET() {
  const feed = await parser.parseURL(
    "https://news.google.com/rss/search?q=Scott+bici&hl=it&gl=IT&ceid=IT:it"
  );

  return Response.json(
    feed.items.slice(0, 10).map((a, i) => ({
      id: i,
      title: a.title,
      excerpt: a.contentSnippet,
      image: "https://picsum.photos/800/500?" + i,
      link: a.link,
    }))
  );
}