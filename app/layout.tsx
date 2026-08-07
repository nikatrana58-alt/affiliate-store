import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { LenisProvider } from "@/components/lenis-provider";
import { PageTransition } from "@/components/page-transition";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/components/auth-context";
import { AuthModal } from "@/components/auth-modal";
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
    default: "RA2Z | Redefining Modern Luxury & Prestige",
    template: "%s | RA2Z",
  },
  description: "Exquisite luxury curation. Redefining modern quality, luxury, and prestige.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${inter.variable}`} style={{ backgroundColor: "#0A0A0A" }}>
      <body style={{ backgroundColor: "#0A0A0A", color: "#FFFFFF", margin: 0, padding: 0 }}>
        <AuthProvider>
          <CartProvider>
            <LenisProvider>
              <PageTransition>
                {children}
              </PageTransition>
              <AuthModal />
            </LenisProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
