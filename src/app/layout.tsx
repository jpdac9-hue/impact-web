import "./globals.css";

export const metadata = {
  title: "Suric — Scan. Compare. Save.",
  description: "Assistant intelligent de magasinage et de planification de projets pour le marché canadien.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}