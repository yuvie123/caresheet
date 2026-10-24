import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for readers with low vision.
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });
// Punjabi and Hindi need their own fonts or they print as empty boxes.
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-gurmukhi", subsets: ["gurmukhi"], weight: ["400", "700"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "700"] });

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
