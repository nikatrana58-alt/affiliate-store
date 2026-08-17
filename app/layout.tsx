import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { LenisProvider } from "@/components/lenis-provider";
import { PageTransition } from "@/components/page-transition";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/components/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { constructMetadata } from "@/lib/seo";
import { OrganizationSchema, WebSiteSchema } from "@/components/structured-data";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

export const metadata: Metadata = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable} ${inter.variable}`} style={{ backgroundColor: "#0A0A0A" }}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <meta name="theme-color" content="#0A0A0A" />
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body style={{ backgroundColor: "#0A0A0A", color: "#FFFFFF", margin: 0, padding: 0 }}>
        <AuthProvider>
          <CartProvider>
            <LenisProvider>
              <PageTransition>
                {children}
              </PageTransition>
              <AuthModal />
              <SpeedInsights />
            </LenisProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
