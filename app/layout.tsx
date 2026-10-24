import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for readers with low vision.
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });
// Punjabi and Hindi need their own fonts or they print as empty boxes.
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-gurmukhi", subsets: ["gurmukhi"], weight: ["400", "700"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "CareSheet",
  description:
    "Turn hospital discharge papers and pill bottles into a medication plan your family can follow, in your family's language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${gurmukhi.variable} ${devanagari.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
