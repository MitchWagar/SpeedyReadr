# Speedy Readr

Finished word-at-a-time reader, including all requested controls and import formats.

## Website

GitHub Pages publishes this repository from main. The existing CNAME points to speedyreadr.com. The root index opens dist/index.html.

The full private app with saved bookmarks remains at https://still-word-reader.mitchwagar.chatgpt.site .

## Features

- Paste text, or automatically load DOCX, EPUB, PDF, and TXT uploads.
- Hold mouse, touch, or Space to read. Release to pause and rewind ten words.
- Adjustable speed, natural punctuation and paragraph pauses, and longer timing for hyphenated and em-dash words.
- Preserve document italics where available; PDF paragraph boundaries are inferred from layout. Image-only PDFs need OCR first.
- Percentage slider and exact position jump above the reading box.
- Side-by-side Clear text and Load text into reader buttons.
- Private bookmarks store the extracted document, formatting, and position when the server is available.

## Hosting distinction

GitHub Pages serves static files only. Reading, text pasting, document imports, timing, and scrubbing work there. The bookmark API cannot run on GitHub Pages, and existing saved books are not copied into this public repository. On Pages the interface directs users to the private app for bookmarks.

The backend source is included in server/worker.mjs. It requires an R2 bucket bound as BUCKET and a trusted gateway supplying oai-authenticated-user-id. Do not deploy the Worker behind a gateway that lets visitors spoof that header. Connecting a different backend or changing the private Site audience requires separate hosting configuration.

## Build the full app

Use Node.js 20 or newer. No npm dependencies are required.

    npm run build

This generates dist/server/index.js, embedding the frontend assets, and copies the hosting manifest into dist/.openai. The Worker exports a fetch handler. Generated output is ignored by Git; source assets are tracked in dist.

The .openai/hosting.json manifest identifies the existing private Site and its storage binding; it contains no credentials. Do not reuse its project ID for an unrelated Site.

The PDF.js 5.6.205 legacy browser modules are vendored in dist/vendor with their Apache-2.0 license.

## Source and history

This package is ready to replace the previous application. Uploading and committing the replacement will preserve earlier versions in Git history. The existing CNAME domain setting is included. No uploaded documents, bookmarks, credentials, or account records are included.
