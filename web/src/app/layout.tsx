import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "My Reader",
  description: "A curated collection of articles",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} scroll-smooth`}>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent-foreground">
        
        <header className="sticky top-0 z-40 w-full glass border-b border-border/40 transition-all duration-300">
          <div className="max-w-[1200px] mx-auto px-6 h-16 flex justify-between items-center">
            <a href="/" className="font-serif text-2xl tracking-tight text-foreground hover:opacity-70 transition-opacity">
              My Reader
            </a>
            <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a href="/" className="hover:text-foreground transition-colors relative group">
                Articles
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full"></span>
              </a>
              <a href="#" className="hover:text-foreground transition-colors relative group">
                About
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full"></span>
              </a>
            </nav>
          </div>
        </header>

        <main className="max-w-[1200px] mx-auto px-6 py-16 min-h-[calc(100vh-160px)]">
          {children}
        </main>

        <footer className="border-t border-border mt-auto bg-muted/50">
          <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} My Reader.</p>
            <p className="font-serif italic">Designed with Trae</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
