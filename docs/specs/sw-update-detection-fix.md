# T-018 — Force SW update check on page load + visibility change

**Status:** approved (bug fix)
**Owner:** Execution Agent
**Related:** Original SW registration in v1.x · netlify.toml SW headers

---

## 1. Problem

User report: "ทำไมปิดแอปเข้าใหม่ไม่มีขึ้นให้อัปเดต" (Why doesn't the update banner appear when I close and reopen the app?)

### Root cause

Current SW registration in `index.html` (~L10470):

```js
const reg = await navigator.serviceWorker.register('./service-worker.js');
reg.addEventListener('updatefound', () => { ... });
```

**3 issues:**

1. **No `updateViaCache: 'none'` option** — default is `'imports'` which lets HTTP cache participate in SW fetch decisions. Even though netlify.toml correctly sets `Cache-Control: no-cache` on `service-worker.js`, relying on header alone isn't bulletproof across browsers.

2. **No explicit `reg.update()` call** — the spec lets the browser decide when to check for SW updates. Common behavior:
   - Browser auto-checks every **24 hours** when navigating to a page in scope
   - If user opens the app within 24h of last check → **no auto-check, no `updatefound` event, no banner**

3. **No visibility-change listener** — PWA users frequently:
   - Background the app (swipe to home / tab away)
   - Foreground it later
   - The page stays loaded; the SW is never re-checked

Combined: user closes app, server deploys a new version, user reopens within 24h → browser silently skips the update check → banner never appears → user thinks the app isn't being updated.

## 2. Fix

Three small changes to the SW registration block:

```js
// 1. Bypass HTTP cache for the SW file itself
const reg = await navigator.serviceWorker.register('./service-worker.js', {
  updateViaCache: 'none'
});

// 2. Force an update check immediately after registration
reg.update().catch(() => {});  // best-effort; ignore errors

// 3. Re-check whenever the app becomes visible (foreground from background)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    reg.update().catch(() => {});
  }
});
```

The existing `updatefound` listener + waiting-worker check + `showUpdateBanner()` chain is correct — this fix just ensures the events actually fire by forcing fresh SW fetches.

## 3. Non-goals

- ❌ Schema changes
- ❌ Service worker file changes (`service-worker.js` already correct: skipWaiting + clients.claim)
- ❌ Banner UI changes (already implemented)
- ❌ Auto-applying updates without user consent (user still taps "อัปเดต")
- ❌ Periodic background checks (visibilitychange is enough for active users)
- ❌ netlify.toml changes (headers already correct)

## 4. Affected files

| File | Change |
|---|---|
| `index.html` | Add `updateViaCache: 'none'` opt · Add `reg.update()` post-registration · Add visibilitychange listener · VERSION |
| `service-worker.js` | VERSION → v1.10.44 |
| `docs/specs/sw-update-detection-fix.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-018 entry |

## 5. Hard guardrails

- No data file changes (`meals.json`, `branded_products.json`, `audit-meals.js` byte-identical)
- VERSION sync between `index.html` and `service-worker.js`
- No new handlers
- No new event delegation patterns (the visibility listener is on `document`, not the existing delegation)
- Banner behavior unchanged when SW IS being updated (existing path preserved)

## 6. Definition of Done

- [ ] `navigator.serviceWorker.register(...)` called with `{ updateViaCache: 'none' }` option
- [ ] `reg.update().catch(() => {})` called immediately after registration
- [ ] `document.addEventListener('visibilitychange', ...)` calls `reg.update()` when state becomes visible
- [ ] Existing `updatefound` chain unchanged · banner path unchanged
- [ ] No regression on first-time install (banner does NOT show when `navigator.serviceWorker.controller` is null — correct behavior preserved)
- [ ] VERSION v1.10.43 → v1.10.44 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## 7. Test plan

1. **Background → foreground** (active SW change): open app on v1.10.44, server deploys v1.10.45, swipe app to background, foreground again → banner should appear within seconds
2. **Close → reopen** (full close): same as #1 but force-quit the PWA and reopen via icon → banner should appear after page loads
3. **First-time install** (no controller): clear browser data, open app fresh → SW registers, NO banner shown (correct — nothing to update)
4. **Within-24h update**: deploy v1.10.45 within 1 hour of user's last visit → user opens app → banner appears (broken before this fix)
5. **Already-waiting worker**: deploy new SW, open app, close before tapping banner, reopen → banner re-appears (existing `reg.waiting` check)
6. **Tap "อัปเดต"** → page reloads with new version (existing behavior preserved)
7. **Tap "ปิด"** → banner dismisses; next visibilitychange shouldn't re-show unless a NEWER version arrives

## 8. Rollback plan

`git revert <T-018 commit>` removes the 3 added lines (updateViaCache opt + reg.update call + visibility listener). Banner behavior reverts to current state (auto-check every 24h only).

## 9. Migration consideration

**Chicken-and-egg note:** users currently on v1.10.43 or earlier won't get this fix until their browser does its next 24h auto-check OR they hard-refresh. After they're on v1.10.44+, all future updates will trigger the banner reliably on close-reopen.

This is unavoidable for any SW update-flow fix; documented for transparency.
