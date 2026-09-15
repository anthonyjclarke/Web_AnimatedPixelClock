#!/bin/zsh
# Double-click in Finder; leave this Terminal window open while using the clock.
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v npm >/dev/null 2>&1; then
  print 'Node.js/npm is not available. Install Node.js 22.18 or newer, then retry.'
  read '?Press Return to close.'
  exit 1
fi
print 'Starting Pixel Clock at http://127.0.0.1:3000/'
print 'Leave this window open. Press Control-C to stop the server.'
npm run dev
read '?Press Return to close.'
