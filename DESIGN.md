---
name: Splitmate
description: Expense splitting for friend groups and roommates — no awkward money conversations.
colors:
  bonfire-orange: "#EA580C"
  bonfire-orange-deep: "#C2410C"
  canvas: "#F8F7F4"
  surface: "#FFFFFF"
  line: "#E8E4DE"
  ink: "#1C1917"
  ink-soft: "#78716C"
  ink-muted: "#A8A29E"
  pos-bg: "#ECFDF5"
  pos: "#065F46"
  neg-bg: "#FEF2F2"
  neg: "#991B1B"
  mute-bg: "#F5F5F4"
  mute: "#57534E"
  pending-bg: "#FFFBEB"
  pending: "#92400E"
  danger: "#DC2626"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.bonfire-orange}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.bonfire-orange-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  pill-positive:
    backgroundColor: "{colors.pos-bg}"
    textColor: "{colors.pos}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  pill-negative:
    backgroundColor: "{colors.neg-bg}"
    textColor: "{colors.neg}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  pill-neutral:
    backgroundColor: "{colors.mute-bg}"
    textColor: "{colors.mute}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Splitmate

## 1. Overview

**Creative North Star: "The Honest Ledger"**

Splitmate's visual language is built around one conviction: when money is involved, clarity is kindness. The interface doesn't fuss with decoration; it makes the numbers impossible to misread and the actions impossible to miss. The warm off-white canvas — the color of an old receipt pad — paired with crisp white cards creates a surface that feels familiar and trustworthy without being clinical. The single Bonfire Orange accent exists to mark the one right next move, and nothing else.

Tactile and direct: buttons have weight, cards have crisp edges, spacing creates breathing room without softness. The interface behaves like a friend who is good with numbers — confident, unpretentious, always ready with the answer.

This system explicitly rejects the aesthetic of enterprise accounting software (form-heavy, sterile, built for accountants), the earnestness of serious fintech (dark navy, gold accents, excessive trust-signals), and the clutter of social apps that bury the core task under feeds and notifications.

**Key Characteristics:**
- Flat surfaces, border-only elevation, no decorative shadows
- Single Inter typeface with weight contrast carrying all hierarchy
- One accent color (Bonfire Orange) reserved for primary actions only
- Semantic color vocabulary for financial states — green, red, amber — never decorative
- Tabular numerals everywhere money appears
- Warm stone neutrals; the canvas tilts slightly toward stone, never pure gray


## 2. Colors: The Bonfire Palette

A warm, stone-tinted neutral field punctuated by one decisive accent. Financial state colors function as a second vocabulary: they carry meaning, not decoration.

### Primary
- **Bonfire Orange** (`#EA580C`): The sole action color. Primary buttons, active links, focus rings, brand text. Its rarity is the point — the eye finds it instantly because nothing else competes.
- **Bonfire Deep** (`#C2410C`): Hover and pressed state for all Bonfire Orange elements. Never appears at rest.

### Secondary
- **Settled Green** (`#065F46` on `#ECFDF5`): Positive balances — you are owed money. Always paired: text on tinted background.
- **Owed Red** (`#991B1B` on `#FEF2F2`): Negative balances — you owe money. Same paired treatment.
- **Pending Amber** (`#92400E` on `#FFFBEB`): Unresolved status, pending members. Same paired treatment.
- **Neutral Mute** (`#57534E` on `#F5F5F4`): Settled or zero balances. Same paired treatment.

### Tertiary
- **Danger Red** (`#DC2626`): Destructive actions only — delete buttons, irreversible confirmations. Never used for negative balances (that is Owed Red's job).

### Neutral
- **Warm Canvas** (`#F8F7F4`): Page background. Slightly warm stone, never pure gray or pure white.
- **Clean Surface** (`#FFFFFF`): Card and input backgrounds. The one true white in the system.
- **Stone Line** (`#E8E4DE`): All borders and dividers. Warm enough to feel intentional, light enough to recede.
- **Deep Ink** (`#1C1917`): Primary text — almost black, with a warm brown undercurrent.
- **Soft Ink** (`#78716C`): Secondary text, descriptions, contextual labels.
- **Muted Ink** (`#A8A29E`): Placeholders, timestamps, tertiary metadata.

### Named Rules

**The One Accent Rule.** Bonfire Orange appears on 10% or less of any given screen. When everything competes for attention, nothing gets it. The orange exists to answer "what do I do next?" — and only that.

**The Semantic Lock Rule.** Green and red are financial state signals, full stop. Using either color for decorative purposes — success toasts, illustrations, icons — corrupts the vocabulary. If a user sees green, it means "you are owed money."


## 3. Typography

**Body Font:** Inter (ui-sans-serif, system-ui, sans-serif)

A single-family system. Inter carries everything: headlines through labels, amounts through descriptions. No display serif, no decorative pairing. Expressiveness comes from weight contrast and scale, not from mixing families.

**Character:** Neutral and precise, with enough personality at heavier weights to feel confident rather than corporate. Tight letter-spacing at display size and tabular numeral features keep money figures scannable at speed.

### Hierarchy

- **Display** (700, 30px / 36px, −0.01em tracking): Page-level titles, used once per screen. Group names, top-line totals.
- **Headline** (600, 24px / 30px): Section headings within a page. Expense lists, balance summaries.
- **Title** (600, 16px / 24px): Card headings, modal titles, prominent member names.
- **Body** (400, 14px / 20px): All running text. Descriptions, notes, helper copy. Max line length 65ch.
- **Label** (500, 12px / 16px, +0.01em tracking): Badges, status text, timestamps, form labels. Uppercase only at this size and only sparingly.

### Named Rules

**The Tabular Numerals Rule.** Every currency amount, balance figure, and split total uses `font-variant-numeric: tabular-nums`. Numbers that shift width as they update are numbers that cannot be trusted.

**The Weight Contrast Rule.** Adjacent text elements must differ by at least one weight step (400 to 500, 500 to 600, 600 to 700). A flat-weight page signals that nothing matters more than anything else.


## 4. Elevation

Splitmate is a flat-surface system. Depth is conveyed through background contrast (canvas to surface) and border definition, not shadow. Cards sit white on the warm canvas; modals are the one exception.

No decorative drop-shadows at rest. The 1px Stone Line border does the structural work.

### Shadow Vocabulary

- **Modal lift** (`0 20px 60px -10px rgba(28, 25, 23, 0.18)`): Modals only. A single diffuse shadow that separates the overlay from the underlying content without theatrical depth. Not used on cards, panels, or hover states.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. The one shadow in the system belongs to modals. Introducing a shadow on a card or hover state imports visual noise without earning it.


## 5. Components

### Buttons

Solid, rectangles with gently curved edges. No gradients, no icons by default, no shadows. Weight comes from the filled background.

- **Shape:** Gently curved (8px radius) — not pill-shaped
- **Primary:** Bonfire Orange fill, white text, 10px / 16px padding, 14px / 500 weight
- **Hover:** Bonfire Deep, immediate color shift, no transform or movement
- **Focus:** 3px ring at 15% Bonfire Orange opacity, offset 0
- **Secondary:** White fill, Stone Line border, Deep Ink text. Hover: Warm Canvas background.
- **Danger:** Danger Red fill, white text. Hover: 90% opacity. For irreversible actions only.
- **Link:** Bonfire Orange text, no fill or border. Hover: Bonfire Deep. Inline and de-emphasis contexts.

### Cards

The core structural unit. White on canvas; border-only definition.

- **Corner Style:** Softly rounded (12px radius)
- **Background:** Clean Surface (`#FFFFFF`)
- **Shadow Strategy:** None. Border and background contrast carry the elevation.
- **Border:** 1px Stone Line (`#E8E4DE`)
- **Internal Padding:** 20px uniform

### Inputs / Fields

- **Style:** White fill, Stone Line stroke (1px), 8px radius, 10px / 14px padding
- **Focus:** Border shifts to Bonfire Orange; 3px ring at 15% orange opacity appears simultaneously
- **Error:** Border shifts to Owed Red; red background tint (`#FEF2F2`) on the field
- **Placeholder:** Muted Ink (`#A8A29E`)

### Balance Pills (Signature Component)

The financial state indicator — the product's most important output. Medium-weight, fully rounded, always text and tinted background as a pair.

- **Positive (owed):** Settled Green text on green tint. Tabular numerals, 13px / 600.
- **Negative (owes):** Owed Red text on red tint. Same treatment.
- **Neutral (settled):** Muted stone text on stone tint. Same treatment.
- **Rule:** The label always includes a sign (`+` / `−`) or a plain-language verb. Color alone is never the only signal.

### Status Badges

Small indicators for member state (active / pending). Fully rounded, 12px / 500. Smaller than balance pills; used for status meta, not amounts.

- **Active:** Settled Green palette
- **Pending:** Pending Amber palette

### Modals

- **Width:** Max 480px, centered
- **Corner Style:** Generously rounded (16px radius)
- **Background:** Clean Surface with modal lift shadow
- **Padding:** 24px


## 6. Do's and Don'ts

### Do

- **Do** use Bonfire Orange exclusively for primary CTAs, active links, and focus indicators. Rarity creates instant visual priority.
- **Do** pair financial state colors as text-on-tinted-background. Both elements travel together; neither works alone.
- **Do** use `font-variant-numeric: tabular-nums` on every currency amount, balance, and split figure.
- **Do** use Stone Line (`#E8E4DE`) to define card boundaries. Warm enough to feel intentional, light enough to recede.
- **Do** put balances and settlements on the surface, visible without navigating. They are the product's core output.
- **Do** include a sign (`+` / `−`) or plain-language label alongside any color-coded balance for accessibility and unambiguous scanning.
- **Do** treat Warm Canvas (`#F8F7F4`) as the default page background. Clean white is for cards and inputs only.

### Don't

- **Don't** use enterprise accounting aesthetics — heavy forms, sterile grays, accountant-facing density. Splitmate is for friends, not finance departments.
- **Don't** use serious fintech patterns — dark navy, gold accents, excessive trust-signal imagery. The product earns trust through clarity, not credentialing.
- **Don't** bury the core task under feeds, notifications, or feature clutter. Every screen should answer "what do I owe or what am I owed?" within one glance.
- **Don't** use green or red decoratively — for illustrations, success toasts, icons, or non-financial UI. Those colors carry a specific meaning in this system; using them elsewhere breaks the vocabulary.
- **Don't** add drop shadows to cards or panels at rest. Flat-by-default is a rule, not a preference.
- **Don't** use a border-left or border-right stripe as a colored accent on cards or list items. Use a background tint, a leading icon, or nothing.
- **Don't** mix font families. Inter does all the work. Resist adding a display serif or script for personality.
- **Don't** use gradient text or glassmorphism. Clarity is the personality.
