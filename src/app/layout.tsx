import type { Metadata } from "next";
import Script from "next/script";
import { Archivo, Source_Serif_4 } from "next/font/google";
import "./globals.css";

/** Exact GA4 Measurement ID — do not invent a second ID. */
const GA_MEASUREMENT_ID = "G-H554KXZD5B";

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-gtag" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
        </Script>
      </body>
    </html>
  );
}
