# recordbox — working notes

Static site (no build step — `package.json` is empty). Deployed via Cloudflare
Pages. `_headers` sets `Cache-Control: public, max-age=31536000, immutable` on
everything under `assets/*`, so **any change to a CSS/JS asset needs its
referencing `<link>`/`<script>` cache-busted** (see "Cache busting" below) or
browsers/edge will keep serving the stale version for a year.

## Pages

- `index.html` — homepage. Own inline styles + `assets/css/style.css`
  (Webflow-derived markup, still has some dead `data-w-id`/`style="opacity:0"`
  Webflow-interaction leftovers scattered around from an incomplete IX2
  removal — don't assume every such element is broken on purpose, but don't
  scope-creep into fixing all of them either unless asked).
- `video.html` — full public video catalog, all categories. Has its own
  inline `<script>` with a `VIDEOS` array (JS object literal, one line) and
  the gallery/player logic. Links to `assets/css/watch.css`.
- `exclusive.html` — Chanel-only collection, password-gated (client-side
  `SESSION_KEY` in `sessionStorage`, resets when the tab closes). Shares the
  same watch-page JS patterns as `video.html` (same `playVideo`/`loadSource`/
  `selectVideo` shape) — when fixing a bug in one, check whether the same
  bug exists in the other; they've drifted out of sync more than once.
- `chanel.html` does **not** exist on `main` — it was deliberately dropped
  during a rename/restructure (see git history around the "chanel-experiment"
  work) and isn't linked from anywhere live. Don't resurrect it without
  checking why it was cut first.

## Git workflow (how this project actually gets shipped)

1. **Always branch from the latest `main`** before starting new work — never
   stack unrelated work onto a branch whose PR has already merged. Check
   `git branch --show-current`; if it's a merged branch, `git checkout main
   && git pull && git checkout -b <new-branch>` first (stash/pop any
   in-progress edits across the switch).
2. **Short, descriptive kebab-case branch names** (`fix-mobile-title-desc`,
   `logo-scroll`, `team-jonas-b`) — the user checks Cloudflare Pages' deploy
   list by branch name, not PR number, so make them recognizable at a glance.
   Pick the name yourself based on what the change is (don't ask unless it's
   genuinely ambiguous) — but never let it fall back to an auto-generated
   random suffix (e.g. `claude/logos-infinite-scroll-k1r7cz`); those are
   unreadable in the deploy list and are what this convention exists to
   avoid.
3. **Open a PR, do not merge it yourself.** Wait for an explicit "merge" /
   "merge all" from the user. PR body: a Summary of what changed and why, and
   a Test plan section (mark what was actually verified vs. left for their
   manual check).
4. **Small unrelated follow-ups** on the same feature area can stack as
   additional commits on an *already-open, unmerged* PR rather than opening
   a new one each time — but once a PR is merged, the next change needs a
   fresh branch (see #1).
5. Only merge PRs that came from *this* session unless the user explicitly
   says otherwise — other open PRs may be unfinished/untested work from a
   different session. If asked to "merge all," flag anything that isn't
   yours before doing it.

## Verifying changes before shipping

This environment's network egress is blocked to most third-party CDNs
(`cdn.plyr.io` notably — Plyr never actually loads here). That means:

- **Don't just read the code and assume it works** — actually serve the repo
  locally (`python3 -m http.server`) and drive it with Playwright
  (`/opt/pw-browsers/chromium` via the `playwright` package at
  `/opt/node22/lib/node_modules/playwright`) to catch real bugs. Several bugs
  in this project were only found this way (mobile relock, missing title/
  desc, hls.js falling back silently) — code review alone missed them.
- Check both desktop and mobile viewports; mobile-only bugs have been common
  here specifically because `selectVideo()` does a full `location.reload()`
  on mobile to resume playback, which desktop's code path never hits.
- A `pageerror` listener catching `Plyr is not defined` in this sandbox is
  **expected and not a real bug** — it's the CDN block, not broken code.
  Don't chase it; note it and move on.
- The homepage's `.page-loading` preloader can get stuck at `display:flex`
  in this sandbox (same CDN-block root cause) — force-hide it
  (`el.style.display = 'none'`) before screenshotting if it's blocking the
  view.

## Cache busting

`index.html` loads `assets/css/style.css?v=N`. Bump `N` any time
`style.css` changes — the immutable one-year cache means a stale `?v=`
means real users never see the update.

## Mobile playback gotcha (video.html / exclusive.html)

`selectVideo()`'s mobile path (`location.reload()` + `sessionStorage` to
resume the picked video) means `playVideo()`/`setupPlayer()`/`loadSource()`
can run **before** the deferred `plyr.polyfilled.js` / `hls.light.min.js`
scripts have executed — that's a hard ordering fact per the HTML spec, not a
flaky race. Pattern used to handle it: check `typeof X === 'undefined'`,
and if so, attach a one-time `load` listener to *that specific `<script>`
element* (found via `document.querySelector('script[src*="..."]')`) and
retry — not `window.load` (fires after every resource on the page, not just
the one script you're waiting on) and not just letting it throw. Any new
code that touches Plyr/hls.js on the mobile-resume path needs the same
guard.

## Misc conventions

- Pre-existing unrelated bugs found while working (dead Webflow markup, an
  unrelated `t is not a function` console error on the homepage) get
  flagged, not fixed, unless asked.
- Don't force-push or rewrite shared branch history without explicit
  permission. Reverting a bad merge on `main` uses `git revert -m 1
  <merge-sha>`, not a reset.
