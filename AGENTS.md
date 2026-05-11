# DriverDash UI & Responsivity Rules (MANDATORY)

Every modification to DriverDash MUST adhere to these global standards to maintain the Cyber/Tesla premium aesthetic without sacrificing mobile usability.

## 1. Responsivity & Widths
- Support a full range from **320px** to **430px** (Mobile) up to full **Desktop**.
- **NO horizontal overflow** (horizontal scroll) is permitted on any page.
- Components must use fluid layouts: `flex-1 min-w-0`, `w-full`, and grid systems that stack on mobile.

## 2. Text & Legibility
- **No text overlap**: Ensure enough line-height (`leading`) and gap between elements.
- **Natural wrapping**: Avoid `whitespace-nowrap` on mobile labels or descriptive text.
- **Tracking**: Avoid excessive tracking (e.g., `tracking-[0.3em]`) on mobile if it causes label collisions or poor legibility.
- **Truncation**: Use `truncate` only for secondary info. Primary operation data must be visible.

## 3. Navigation (BottomNav)
- **Minimum clickable area**: 44px for every nav item.
- **Item distribution**: Use `flex-1 min-w-0` for equal distribution across the screen width.
- **Labels**: Must be centered, strictly legible, and never overlap neighbors.
- **Safe Area**: ALWAYS respect `env(safe-area-inset-bottom)`. Nav bar height must be consistent (e.g., 64px) + safe area.

## 4. Container Constraints
- **Avoid `h-screen`**: Use `min-h-[100dvh]` or natural flow to prevent layout breakage with mobile browser toolbars or keyboards.
- **Avoid `overflow-hidden` on Root**: Do not trap the user or hide content that needs to be scrolled.
- **Bottom Padding**: Every main page container must have `pb-32` (or sufficient padding) to ensure content isn't hidden behind the fixed BottomNav.

## 5. Touch & Interactive
- **Touch Targets**: Minimum 44px for all buttons and interactive elements.
- **Haptics**: Always include haptic feedback triggers on primary navigation and confirmation actions.
- **Keyboard Hygiene**: Check that inputs are not covered by fixed elements when the keyboard is open.

## 6. Performance & Aesthetics
- **Blur**: Use `backdrop-blur` selectively. Avoid heavy blurs on mobile devices to maintain 60fps.
- **Animations**: Use `motion` for state transitions, but keep them subtle and short.
- **Decorative Elements**: Elements like "glows" or background patterns should not compete with content or cause performance drops on Android.

## 7. Audit Checklist (Before Finishing)
- [ ] No vertical/horizontal collision of labels?
- [ ] No horizontal scrollbars?
- [ ] Safe area at bottom respected?
- [ ] Minimum 44px touch targets?
- [ ] Works at 320px width?
- [ ] Words don't break character-by-character awkwardly?
