/*
  Panel: the raised surface used for every grouped section in the app.

  Design spec:
  - Background: linear-gradient(cover-raised → cover) — subtle warmth top-to-bottom
  - Border: 1px hairline at faded-ink/12 — visible but not stark
  - Shadow: the two-layer shadow from the design token (shadow-panel)
  - Border-radius: 10px (--radius-md)

  Usage:
    <Panel>
      ...content...
    </Panel>

    <Panel className="p-0">         ← override padding
      <LedgerRow>...</LedgerRow>    ← inside panel, no padding on panel itself
    </Panel>

  The 'as' prop lets you render the panel as any HTML element (article,
  section, aside, etc.) for correct semantics. Defaults to <div>.
*/

export default function Panel({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}) {
  return (
    <Tag
      className={`panel ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
