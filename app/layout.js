/*
  next/font/google downloads fonts at build time and serves them from
  your own domain — zero network requests to Google at runtime, no
  privacy or performance cost. Both fonts are loaded here once and
  injected as CSS custom properties (--font-fraunces, --font-ibm-plex-sans)
  that @theme in globals.css picks up.
*/
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

/*
  Fraunces is a variable font — one file covers all weights (100–900)
  and optical sizes. We set axes: ["wght", "opsz", "SOFT", "WONK"] to
  unlock all its expressive range for the display role.
*/
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  weight: "variable",
  display: "swap", // show fallback text immediately, swap when loaded
});

/*
  IBM Plex Sans is not a variable font, so we list the weights we'll
  actually use rather than loading all of them (keeps the bundle lean).
*/
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "Lexicon — Your Personal Knowledge Engine",
  description:
    "Lexicon captures the pages you actually read and lets you search, revisit, and ask questions across everything you've saved.",
};

export default function RootLayout({ children }) {
  return (
    /*
      Both font CSS variables are attached to <html> so they cascade
      to every element. globals.css @theme picks them up via
      var(--font-fraunces) and var(--font-ibm-plex-sans).
    */
    <html
      lang="en"
      className={`${fraunces.variable} ${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
