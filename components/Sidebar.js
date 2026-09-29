"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconDashboard({ active }) {
  const c = active ? "#E5B834" : "#A39BAE";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke={c} strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke={c} strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke={c} strokeWidth="1.8" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function IconSearch({ active }) {
  const c = active ? "#E5B834" : "#A39BAE";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8" />
      <path d="M16.5 16.5L21 21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconAsk({ active }) {
  const c = active ? "#E5B834" : "#A39BAE";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHistory({ active }) {
  const c = active ? "#E5B834" : "#A39BAE";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8" />
      <path d="M12 7v5l3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings({ active }) {
  const c = active ? "#E5B834" : "#A39BAE";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/",         label: "Dashboard", Icon: IconDashboard },
  { href: "/search",   label: "Search",    Icon: IconSearch    },
  { href: "/ask",      label: "Ask RAG",   Icon: IconAsk       },
  { href: "/history",  label: "History",   Icon: IconHistory   },
  { href: "/settings", label: "Settings",  Icon: IconSettings  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col bg-[#14111D]/80 backdrop-blur-2xl border-r border-white/10 z-40"
      style={{ width: "240px" }}
      aria-label="Primary navigation"
    >
      {/* ── Wordmark & Brand Emblem ── */}
      <div className="px-6 pt-7 pb-6 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gold-leaf to-amber-300 flex items-center justify-center shadow-lg shadow-gold-leaf/20 group-hover:scale-105 transition-transform duration-200">
            <span className="font-display font-bold text-ink text-lg leading-none">L</span>
          </div>
          <div>
            <span className="font-display font-bold text-parchment text-xl tracking-tight block leading-none">
              Lexicon<span className="text-gold-leaf">.ai</span>
            </span>
            <span className="font-sans text-[10px] text-faded-ink tracking-wider uppercase block mt-1">
              Personal Engine
            </span>
          </div>
        </Link>
      </div>

      {/* ── Status Pill ── */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span className="w-2 h-2 rounded-full bg-lamp-green animate-pulse" />
          <span className="font-sans text-[11px] text-parchment/90 font-medium truncate">
            MV3 Extension Active
          </span>
        </div>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`
                relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl
                font-sans text-sm font-medium transition-all duration-200
                ${active
                  ? "text-parchment bg-white/10 border border-white/10 shadow-lg shadow-black/20"
                  : "text-faded-ink hover:text-parchment hover:bg-white/5"
                }
              `}
              aria-current={active ? "page" : undefined}
            >
              {active && <span className="nav-active-bar" aria-hidden="true" />}
              <Icon active={active} />
              <span>{label}</span>
              {label === "Ask RAG" && (
                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gold-leaf/20 text-gold-leaf border border-gold-leaf/30">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Signed-in footer ── */}
      <div className="p-4 m-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-xs font-semibold text-parchment truncate">
              Adhithyan S
            </p>
            <p className="font-sans text-[11px] text-faded-ink truncate">
              Pro Library Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
