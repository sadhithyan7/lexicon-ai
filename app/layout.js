import { Inter, IBM_Plex_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

if (typeof window === "undefined") {
  const REQUIRED_ENV = [
    "GEMINI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
  ];
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[Lexicon] Missing required environment variable${missing.length > 1 ? "s" : ""}:\n` +
      missing.map((k) => `  • ${k}`).join("\n") +
      "\n\nAdd them to .env.local and restart the dev server."
    );
  }
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Lexicon AI — Personal Knowledge Engine",
  description: "Save and semantically search everything you read",
  openGraph: {
    title: "Lexicon AI — Personal Knowledge Engine",
    description: "Save and semantically search everything you read",
    url: "https://lexicon-portfolio.vercel.app",
    siteName: "Lexicon",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full bg-canvas text-primary relative font-sans">
        <div className="flex min-h-screen relative z-10">
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-y-auto md:ml-[240px]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
