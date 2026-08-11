# LiD Test Prep UI principles

These principles define the intended interaction and visual direction for the app. They are deliberately practical: each principle should be visible in the interface and testable during review.

## 1. Make the current task unmistakable

Each screen should have one dominant purpose and one visually strongest next action. Status information, question-level tools, session navigation, and primary navigation should not compete for attention.

- Keep the question and answer choices as the strongest content on quiz screens.
- Use filled accent buttons for the primary next step, restrained surfaces for secondary actions, and plain readouts for status.
- Separate actions by scope: question tools belong together, while leaving or restarting the session belongs in a distinct group.

## 2. Group by meaning, not merely by available space

Proximity and a shared container communicate that controls are related. Responsive wrapping must preserve those relationships instead of producing an accidental row or column.

- Place Bookmark and English in a “Question tools” group.
- Place Start and Restart in a separate “Session navigation” group.
- Allow whole groups to stack on narrow screens; never let individual buttons wrap into an ambiguous arrangement.

## 3. Prefer recognition over recall

Icons can accelerate scanning, but uncommon or ambiguous icons must not stand alone. Every quiz toolbar action keeps a concise visible text label, with a matching accessible name and tooltip where useful.

## 4. Use a small, consistent component system

Controls with the same role use the same height, corner treatment, icon scale, typography, spacing, and interaction states. Differences in shape or prominence must communicate a real difference in purpose.

- Toolbar actions use one 44px control pattern.
- Primary and secondary navigation buttons share dimensions and radii while retaining clear emphasis.
- Cards, answer options, status readouts, and grouped controls use a restrained radius scale and consistent borders.

## 5. Design for touch first

Quiz actions target a minimum height of 44 CSS pixels and retain spacing from neighboring actions. The mobile layout is checked at 390px wide for overflow and accidental target crowding. This exceeds the WCAG 2.2 AA minimum target size and follows the stronger touch-target guidance commonly used by mobile platforms.

## 6. Make state visible in more than one way

Selected, bookmarked, correct, wrong, focused, disabled, and warning states must not depend on color alone.

- Bookmark state changes the icon fill and visible label.
- Answer feedback includes a text-and-symbol badge in addition to color.
- Keyboard focus uses a high-contrast two-ring treatment.
- Disabled translation controls remain labeled and expose the reason through their accessible name/title.

## 7. Keep progress and feedback legible

Progress is both visual and programmatic. The current question, total question count, mode, timer, and score/status are concise and placed near the heading without becoming competing buttons.

## 8. Preserve calm, readable learning surfaces

The palette, spacing, typography, and motion should support sustained study. Use high-contrast text, muted supporting copy, subtle borders, short transitions, and generous line height. Avoid decorative motion or dense chrome around the answers.

## 9. Respond predictably across sizes and input methods

The visual reading order and DOM/focus order should agree. All functions remain available with keyboard input, focus remains visible, and responsive changes only alter layout—not labels, meaning, or control order.

## Review checklist

- Is the next action visually obvious?
- Are controls grouped according to their scope?
- Does every nonstandard icon have a visible label?
- Are interactive targets at least 44px high in the quiz toolbar?
- Are focus, selected, disabled, bookmarked, correct, and wrong states unambiguous without relying only on color?
- Does the interface fit at 390px without horizontal overflow?
- Is question progress exposed with progressbar semantics?
- Do the existing exam, study, translation, bookmark, home, restart, and result flows still work?

## Research basis

- [WCAG 2.2 target size (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG 2.2 target size (enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
- [WCAG 2.2 focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
- [WCAG 2.2 use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
- [WCAG 2.2 consistent identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification)
- [Apple Human Interface Guidelines: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [GOV.UK Design System: Button groups](https://design-system.service.gov.uk/components/button/)
- [Nielsen Norman Group: Recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/)
