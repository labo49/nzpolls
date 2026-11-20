@AGENTS.md

## Modern Web Guidance (Ilan, 2026-11-20)
- Before writing or changing HTML, CSS or client-side JavaScript/TypeScript (components, dialogs, popovers, forms and
  validation, tables, layout, dark mode, accessibility, performance, sanitising HTML, dates and time zones), load the
  relevant guides from Google Chrome's Modern Web Guidance (https://github.com/GoogleChrome/modern-web-guidance, Apache 2.0):
  the `modern-web-guidance` skill. Skip it for server code, scripts, CI, tests and tooling.
- How: `.claude/settings.json` adds the `googlechrome` marketplace and turns the plugin on (by hand:
  `/plugin marketplace add GoogleChrome/modern-web-guidance`, then `/plugin install modern-web-guidance@googlechrome`).
  Use its skill when it is loaded; otherwise run `npx -y modern-web-guidance@latest search "<2–5 word query>"`, then
  `npx -y modern-web-guidance@latest retrieve "<id>"`, and read the guide before coding. One search per UI pattern.
- Search queries describe the UI pattern only ("confirmation modal dialog"), never user data or personal details.
- The guides do not override the rest of this file. Say in the pull request which guides shaped the code.
