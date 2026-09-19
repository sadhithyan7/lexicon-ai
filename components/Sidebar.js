"use client";

/*
  Sidebar: shared navigation across all 5 pages.
  - Fixed 220px wide on the left
  - Lexicon wordmark (Fraunces)
  - 5 nav links with icons, active state = gold left-bar accent
  - "Signed in as" footer at the bottom
  
  Uses usePathname() to determine the active route — this is the
  client-side equivalent of knowing which page you're on. Sidebar
  must be a Client Component because it reads pathname reactively.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── Inline SVG icons — keeps the bundle lean (no icon library needed) ── */

function IconDashboard({ active }) {
  const c = active ? "#C9A227" : "#9C96A8";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={c} strokeWidth="1.75" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke={c} strokeWidth="1.75" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke={c} strokeWidth="1.75" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke={c} strokeWidth="1.75" />
    </svg>
  );
}

function IconSearch({ active }) {
  const c = active ? "#C9A227" : "#9C96A8";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.75" />
      <path d="M16.5 16.5L21 21" stroke={c} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconAsk({ active }) {
  const c = active ? "#C9A227" : "#9C96A8";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHistory({ active }) {
  const c = active ? "#C9A227" : "#9C96A8";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.75" />
      <path d="M12 7v5l3 3" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings({ active }) {
  const c = active ? "#C9A227" : "#9C96A8";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.75" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke={c}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/",         label: "Dashboard", Icon: IconDashboard },
  { href: "/search",   label: "Search",    Icon: IconSearch    },
  { href: "/ask",      label: "Ask",       Icon: IconAsk       },
  { href: "/history",  label: "History",   Icon: IconHistory   },
  { href: "/settings", label: "Settings",  Icon: IconSettings  },
];

export default function Sidebar() {
  const pathname = usePathname();

  /*
    Active route detection: exact match for root "/", prefix match for others.
    This way "/search?q=foo" correctly highlights the Search item.
  */
  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col bg-ink border-r border-faded-ink/10 z-40"
      style={{ width: "220px" }}
      aria-label="Primary navigation"
    >
      {/* ── Wordmark ── */}
      <div className="px-6 pt-7 pb-6">
        <span className="font-display font-semibold text-parchment text-xl tracking-tight select-none">
          Lexicon
        </span>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-md
                font-sans text-sm transition-colors duration-150
                ${active
                  ? "text-parchment bg-cover-raised"
                  : "text-faded-ink hover:text-parchment hover:bg-cover-raised/60"
                }
              `}
              aria-current={active ? "page" : undefined}
            >
              {/* Gold left-bar accent — visible only on the active item */}
              {active && <span className="nav-active-bar" aria-hidden="true" />}
              <Icon active={active} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Signed-in footer ── */}
      <div className="px-6 py-5 border-t border-faded-ink/10">
        <p className="font-sans text-[11px] text-faded-ink/60 uppercase tracking-widest mb-1">
          Signed in as
        </p>
        <p className="font-sans text-xs text-faded-ink truncate">
          you@lexicon.com
        </p>
      </div>
    </aside>
  );
}
