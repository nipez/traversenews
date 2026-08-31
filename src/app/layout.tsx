import type { Metadata } from "next";
import Script from "next/script";
import { Archivo, Source_Serif_4 } from "next/font/google";
import { getSite, siteWordmark } from "@/lib/sites";
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

export function generateMetadata(): Metadata {
  const site = getSite();
  const mark = siteWordmark();
  return {
    title: {
      default: mark,
      template: `%s · ${mark}`,
    },
    description: site.description,
    other: {
      "color-scheme": "light only",
    },
  };
}

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
        {getSite().gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${getSite().gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-gtag" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${getSite().gaId}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
