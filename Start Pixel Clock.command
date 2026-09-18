#!/bin/zsh
# Double-click in Finder; leave this Terminal window open while using the clock.
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  print 'Node.js/npm is not available. Install Node.js 22.18 or newer, then retry.'
  read '?Press Return to close.'
  exit 1
fi
print 'Starting Pixel Clock — your browser will open automatically.'
print 'If it does not open, use the Local URL printed below.'
print 'Leave this window open. Press Control-C to stop the server.'
# Vite 8 uses module.register(); Node 26 emits DEP0205 for that dependency.
# Filter only this known notice, preserving other warnings and user options.
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--disable-warning=DEP0205" PIXEL_CLOCK_OPEN_BROWSER=1 npm run dev
read '?Press Return to close.'
