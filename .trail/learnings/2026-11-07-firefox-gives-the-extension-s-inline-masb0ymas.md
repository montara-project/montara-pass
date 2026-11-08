---
title: "Firefox gives the extension's inline menu frame only content-script APIs, so the background does the rest for it"
author: Masb0ymas
date: 2026-11-07
branch: dev
cost: { minutes: 21, tokens: 225123 }
id: l-c0813c5c
scope: repo
status: active
src: agent
touches:
  - apps/extension/src/inline/firefox.ts
  - apps/extension/src/entrypoints/background.ts
  - apps/extension/src/inline/main.tsx
---

## Decided
- In Firefox an extension page framed inside a web page (inline.html: the menu under a field, the corner offer, the save and passkey prompts) gets only what a content script gets: no storage.session, alarms, tabs, scripting or action. The frame crashed on `chrome.storage.session.onChanged` and showed nothing. Chrome gives the frame the full API.
- Fix: a shim loaded first in the frame fills in those APIs by asking the background (`frame:call` messages, answered only for senders whose URL is inline.html, always for the sender's own tab). Session changes reach the frame through a `frame:session` port. Fill functions are sent by name, since a function cannot cross a message.

## Tried and ruled out
- Fission or remote extensions being off: both were on (Firefox 159) and the frame was still restricted. It is how Firefox treats these frames.

## Watch out
- Any new chrome.* call in src/inline/ (or what it imports) that is not storage.local or runtime needs a case in the shim and in the background's frameCall, or it breaks in Firefox only.
- Testing in headless Firefox via geckodriver: focus events are deferred while the window is inactive (dispatch a synthetic focusin), and WebDriver cannot navigate to moz-extension URLs (open the tab from the chrome context with --allow-system-access). Zen does not expose Marionette.

In the code: apps/extension/src/inline/firefox.ts, frameCall and the onConnect listener in apps/extension/src/entrypoints/background.ts.
