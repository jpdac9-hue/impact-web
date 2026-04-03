import "./globals.css";

export const metadata = {
  title: "Remora — Shop. Earn. Give.",
  description: "Chaque achat génère un cashback partagé entre vous et votre organisme de charité favori.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logo.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}