# ClinicBrief UI Design Brief

## Product Feel

ClinicBrief should feel like a calm appointment-prep workspace, not a generic AI dashboard or a hospital brochure. The interface should make a patient or carer feel organized, oriented, and in control.

Primary user task:

- Turn messy health context into a clinician-ready appointment brief.

Primary business/hackathon goal:

- Judges should understand the product value in under 2 minutes and believe it is genuinely usable.

Target stack:

- Next.js App Router, TypeScript, Tailwind, shadcn-style components, Lucide icons.

Density:

- Balanced. Use enough detail for a real tool, but keep the synthetic demo easy to scan.

Viewport range:

- 320px mobile through 1920px desktop.

## Visual System

Use the current scaffold tokens unless there is a strong reason to adjust:

- Primary: `#0891B2`
- Primary dark: `#0E7490`
- CTA/success: `#059669`
- Background: `#ECFEFF`
- Text: `#164E63`
- Muted text: `#47656F`
- Line: `#B6E7F2`
- Panel: `#FFFFFF`

Typography:

- Use system sans with Figtree/Noto Sans feel: clean, accessible, medical, professional.
- Do not fetch remote fonts in build unless deployment/network behavior is confirmed.
- No negative letter spacing. Do not scale font size with viewport width.

Shape and spacing:

- Cards and controls use 6-8px radius.
- Touch targets must be at least 44px high.
- Use spacing tokens and `gap`, not random margins.
- Mobile spacing should not collapse below 12px between related controls and 16px between cards.

Motion:

- Restrained hover/focus transitions only.
- Respect `prefers-reduced-motion`.

## Visual Assets Strategy

Use the product itself as the visual asset.

Preferred visual signals:

- Synthetic document stack with labels like referral letter, medication list, symptom diary.
- Timeline rows grouped by date/month.
- Confidence/source chips.
- One-page brief preview.
- Rehearsal chat panel.
- Export/download state.

Avoid:

- Stock photos of doctors, hospitals, stethoscopes, or patients.
- Purple/pink AI gradients.
- Decorative gradient orbs, bokeh blobs, or abstract SVG hero art.
- Landing-page-only polish that leaves the actual app thin.

If an image-like asset is needed, create a generated or CSS-rendered product screenshot/mock document preview, not a generic medical photo.

## Interaction Patterns

- Buttons should use Lucide icons when the action is tool-like: upload, download, edit, delete, check, message, mic, file.
- Use tabs or segmented controls for brief modes.
- Use filters for timeline event types.
- Use toggles/checkboxes for consent and privacy options.
- Use editable cards for extracted facts with confirm/edit/reject actions.
- Use badges/chips for confidence, source, status, and fact category.

## Screen Guidance

Landing:

- First viewport should immediately show ClinicBrief name, tagline, primary CTA, demo CTA, and safety copy.
- Keep a hint of the product workflow visible above the fold.

Demo:

- Lead with the synthetic pre-op case.
- Show the transformation from messy documents to organized brief.
- Avoid asking judges to configure credentials before seeing value.

Review:

- Every fact card should show category, source, confidence, status, and edit controls.

Timeline:

- Timeline should be chronological, grouped, and filterable.
- Include "what changed since last appointment" as a clear panel.

Brief:

- Must feel printable and clinician-readable.
- Include uncertainties and source coverage.
- Required safety disclaimer must be visible.

Rehearsal:

- Appointment-prep chat, one question at a time.
- No medical advice. Redirect prohibited requests.

Export:

- PDF primary, Markdown/copy fallback.
- The output should be readable even without external services.

Privacy/Novus:

- Show consent, delete, no-training, and analytics minimization clearly.
- Demonstrate sanitized event examples only.

## Quality Gates

Before handoff, run:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
python3 /Users/abhinavgupta/.codex/skills/webdesign/scripts/website_quality_audit.py /Users/abhinavgupta/Desktop/Mind\ Prod/Clinic\ Brief/apps/web
```

Manual responsive QA:

- Check 320, 375, 414, 768, 1024, 1280, 1440, 1920 widths.
- Text must not overlap or overflow controls.
- Buttons and cards must keep stable dimensions.
- Focus states must be visible.
