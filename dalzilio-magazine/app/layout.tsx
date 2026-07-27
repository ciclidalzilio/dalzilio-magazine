import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dal Zilio Magazine — Cultura, tecnica e passione per la bici",
  description:
    "Il magazine di Cicli Dal Zilio: notizie dal mondo del ciclismo, approfondimenti tecnici e il Bike Finder per trovare la bici giusta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
