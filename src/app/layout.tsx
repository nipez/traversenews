import type { Metadata } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "traverse.news",
    template: "%s · traverse.news",
  },
  description:
    "Traverse City local news: original reporting plus headlines from other desks, events, and civic listings.",
  other: {
    "color-scheme": "light only",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "only light" }}>
      <head>
        <meta name="color-scheme" content="light only" />
      </head>
      <body className={`${archivo.variable} ${sourceSerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
