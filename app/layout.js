import { Fraunces, IBM_Plex_Sans } from "next/font/google";
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

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  weight: "variable",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Lexicon AI — Your Personal Knowledge Library",
  description: "Save and semantically search everything you read",
  openGraph: {
    title: "Lexicon AI — Your Personal Knowledge Library",
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
      className={`${fraunces.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full bg-ink text-parchment relative">
        {/* Ambient atmospheric glows */}
        <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-gold-leaf/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="fixed top-[40%] right-[30%] w-[400px] h-[400px] bg-lamp-green/10 rounded-full blur-[100px] pointer-events-none z-0" />

        <div className="flex min-h-screen relative z-10">
          <Sidebar />
          <main
            className="flex-1 min-h-screen overflow-y-auto"
            style={{ marginLeft: "240px" }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
