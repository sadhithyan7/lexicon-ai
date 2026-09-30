<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PROJECT DEVELOPMENT RULES

## Design System Is Mandatory

Before modifying any frontend UI, read:

- /design/DESIGN_DIRECTION.md
- /design/DESIGN_SYSTEM.md
- /design/COMPONENT_RULES.md
- /design/PAGE_RULES.md
- /design/REFERENCES.md

These files are the source of truth for the visual design of this
application.

Do not invent a new visual style when implementing new pages or components.

---

# FRONTEND DESIGN STANDARD

The application must look like a professionally designed digital product.

The design should feel:

- precise
- formal
- restrained
- modern
- editorial
- functional
- mature
- intentional

It must NOT look like a generic AI-generated website.

---

# FORBIDDEN UI PATTERNS

Never introduce these unless explicitly requested:

- emojis
- emoji icons
- glowing backgrounds
- neon gradients
- purple/blue AI gradients
- gradient text
- glassmorphism
- decorative blobs
- floating particles
- unnecessary 3D
- excessive blur
- excessive shadows
- excessive rounded cards
- giant pill buttons
- random decorative icons
- random illustrations
- unnecessary animations
- generic AI marketing copy

---

# DESIGN PRIORITY

When making visual decisions, prioritize:

1. Information hierarchy
2. Typography
3. Layout
4. Spacing
5. Alignment
6. Color
7. Component consistency
8. Interaction
9. Decoration

Decoration must never compensate for weak hierarchy.

---

# IMPLEMENTATION RULES

Reuse existing components before creating new ones.

Reuse existing design tokens before creating new colors.

Do not introduce arbitrary spacing values.

Do not introduce arbitrary border radii.

Do not introduce a new font without explicit approval.

Do not introduce gradients without explicit approval.

Do not introduce new visual patterns without checking the design system.

---

# BEFORE IMPLEMENTING A NEW PAGE

First determine:

- page purpose
- primary user action
- information hierarchy
- layout structure
- responsive behavior
- components required

Then implement.

---

# AFTER IMPLEMENTATION

Perform a visual consistency audit.

Check:

- typography
- spacing
- colors
- borders
- radius
- icons
- hierarchy
- responsive behavior
- accessibility
- consistency with existing pages

Fix inconsistencies before considering the task complete.