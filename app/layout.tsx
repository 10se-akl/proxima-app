import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proxima — Assistant IA pour artisans du bâtiment",
  description:
    "Transformez vos demandes clients en devis professionnels en quelques minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
