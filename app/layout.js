/*
  Root layout — wraps every page in the app.

  Key change from Task 8 → Task 9:
  The layout is now a flex row: a fixed 220px Sidebar on the left,
  and a scrollable <main> to the right that takes up the remaining width.
  Each page fills its section without needing to handle the sidebar itself.

  Sidebar is a Client Component (uses usePathname), so it can't be imported
  directly into a Server Component file. It IS fine to do so in Next.js App
  Router — the layout file is a server component, but it can render client
  components. The "use client" boundary is inside Sidebar.js.
*/

import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

/*
  Fraunces: variable font — one file covers all weights (100–900)
  and optical sizes. SOFT + WONK axes unlock its full expressiveness.
*/
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  weight: "variable",
  display: "swap",
});

/*
  IBM Plex Sans: not a variable font — list only the weights we use
  to keep the bundle lean.
*/
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Lexicon — Your Personal Knowledge Library",
  description: "Save and semantically search everything you read",
  openGraph: {
    title: "Lexicon — Your Personal Knowledge Library",
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
      <body className="min-h-full bg-ink text-parchment">
        {/*
          App shell: sidebar (fixed, 220px) + main content area.
          margin-left on <main> offsets it from the fixed sidebar.
          overflow-y-auto on <main> lets each page scroll independently.
        */}
        <div className="flex min-h-screen">
          <Sidebar />
          <main
            className="flex-1 min-h-screen overflow-y-auto"
            style={{ marginLeft: "220px" }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
