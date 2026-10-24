import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fonts are bundled with the app (app/fonts) instead of downloaded at build time, so a build never
// depends on Google's servers and the first paint doesn't wait on a third party.
// Atkinson Hyperlegible was designed by the Braille Institute for readers with low vision.
const atkinson = localFont({
  variable: "--font-atkinson",
  display: "swap",
  src: [
    { path: "./fonts/Atkinson-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Atkinson-700.woff2", weight: "700", style: "normal" },
  ],
});
// Punjabi and Hindi need their own fonts or they print as empty boxes. Each file is a variable font
// covering both weights.
const gurmukhi = localFont({ variable: "--font-gurmukhi", display: "swap", src: "./fonts/NotoSansGurmukhi.woff2", weight: "400 700" });
const devanagari = localFont({ variable: "--font-devanagari", display: "swap", src: "./fonts/NotoSansDevanagari.woff2", weight: "400 700" });

const TITLE = "CareSheet: hospital papers to a medicine plan families can follow";
const DESCRIPTION =
  "Turn hospital discharge papers and pill bottles into a weekly medicine plan: every dose traced to the doctor's words, anything unsure sent to the pharmacist, and a printable fridge sheet in Punjabi, Hindi or Spanish.";

export const metadata: Metadata = {
  metadataBase: new URL("https://caresheet.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://caresheet.vercel.app",
    siteName: "CareSheet",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CareSheet: a fridge medicine sheet with a STOP list, tick boxes and a pharmacist question" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${gurmukhi.variable} ${devanagari.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
