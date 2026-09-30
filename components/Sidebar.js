"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const PRIMARY_NAV = [
    { href: "/",         label: "Overview" },
    { href: "/search",   label: "Query Engine" },
    { href: "/ask",      label: "Synthesize" },
  ];

  const SECONDARY_NAV = [
    { href: "/history",  label: "Index Archive" },
    { href: "/settings", label: "Preferences" },
  ];

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[240px] flex flex-col bg-[#F8F9FA] border-r border-border z-40"
      aria-label="Primary navigation"
    >
      {/* ── Brand Header ── */}
      <div className="pt-8 px-6 pb-6 border-b border-border">
        <Link href="/" className="inline-block">
          <span className="font-sans font-semibold text-primary text-[15px] tracking-tight block">
            LEXICON
          </span>
          <span className="text-[11px] text-muted font-sans uppercase tracking-[0.10em] font-medium block mt-0.5">
            Knowledge Engine
          </span>
        </Link>
      </div>

      {/* ── System Status ── */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-success font-mono text-[10px]">●</span>
          <span className="text-[11px] font-sans text-secondary uppercase tracking-widest font-medium">
            System Online
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-4">
        {/* ── Workspace Navigation ── */}
        <nav className="px-4 py-2">
          <div className="px-3 mb-2">
            <span className="text-[11px] font-sans font-medium text-muted uppercase tracking-widest">Workspace</span>
          </div>
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`
                      flex items-center gap-3 px-3 py-2
                      text-[13px] transition-colors rounded-sm
                      ${active
                        ? "text-primary bg-accent/5 border-l-2 border-accent font-medium"
                        : "text-secondary hover:text-primary hover:bg-[#EEF1F4] border-l-2 border-transparent"
                      }
                    `}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── System Navigation ── */}
        <nav className="px-4 py-4 mt-2">
          <div className="px-3 mb-2">
            <span className="text-[11px] font-sans font-medium text-muted uppercase tracking-widest">System</span>
          </div>
          <ul className="space-y-0.5">
            {SECONDARY_NAV.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`
                      flex items-center gap-3 px-3 py-2
                      text-[13px] transition-colors rounded-sm
                      ${active
                        ? "text-primary bg-accent/5 border-l-2 border-accent font-medium"
                        : "text-secondary hover:text-primary hover:bg-[#EEF1F4] border-l-2 border-transparent"
                      }
                    `}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
