import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { LenisProvider } from "@/components/lenis-provider";
import { PageTransition } from "@/components/page-transition";
import { MouseGlow } from "@/components/mouse-glow";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Curated Finds",
    template: "%s | Curated Finds",
  },
  description: "A curated collection of premium affiliate product recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${inter.variable}`}>
      <body>
        <CartProvider>
          <LenisProvider>
            <PageTransition>
              <MouseGlow />
              {children}
            </PageTransition>
          </LenisProvider>
        </CartProvider>
      </body>
    </html>
  );
}
