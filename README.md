# BWDS — Beersheba Wireless Design Solutions Website

Single-page enterprise marketing site for Beersheba Wireless Design Solutions (BWDS), a NAD Network Services LLC company specializing in Ekahau-certified wireless site surveys, predictive RF design, Cisco enterprise Wi-Fi, and network infrastructure consulting.

## Tech stack

- Plain HTML5
- Tailwind CSS via the Play CDN (no build step)
- Vanilla JavaScript (no frameworks, no npm)

Everything needed to render the page lives in `index.html`; it pulls Tailwind and Google Fonts from CDNs at runtime and references local images via relative paths.

## Structure

```
index.html          The entire site (markup, styles, and script)
images/              Optimized, web-ready photos and partner logos used by index.html
*.jpeg / *.jpg / *.png (top level)   Original, full-resolution source photos supplied by BWDS
README.md            This file
```

The files directly under `images/` with clean, hyphenated names (e.g. `data-center.jpg`, `cisco.png`) are the ones actually referenced by `index.html`. The full-resolution originals are kept alongside for future re-editing or higher-quality reprocessing.

## Running locally

No build step or server required — open `index.html` directly in a browser, or serve the folder with any static file server:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Deploying

Upload `index.html` and the `images/` folder together to any static host (GitHub Pages, Netlify, Vercel, S3, etc.) — relative paths will resolve correctly as long as the two stay in the same relative position.

## Content notes

- Contact form and newsletter signup use `mailto:` links (no backend) — swap in a form service (Formspree, etc.) if server-side capture is needed.
- The Google Map embed in the Project Inquiry section is centered on ZIP 20871; update the query string once a specific street address is finalized.
- Knowledge Base articles are original BWDS content, not pulled from an external CMS.
