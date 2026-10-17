<div align="center">

# 📸 Snap Canvas

**A browser photobooth built with p5.js — live webcam feed wrapped in a full creative studio: filters, drawing tools, stickers, shapes, and instant snapshot download.**

p5.js · JavaScript · Creative Coding

<br>

![p5.js](https://img.shields.io/badge/p5.js-ED225D?style=flat-square&logo=p5dotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![Webcam](https://img.shields.io/badge/Webcam_RTC-blue?style=flat-square)

[![🚀 Live Demo](https://img.shields.io/badge/🚀_Live_Demo-snapcanvas--five.vercel.app-6E45E2?style=for-the-badge&labelColor=1a1a2e)](https://snapcanvas-five.vercel.app/)

</div>

---

## 📌 Table of Contents

- [About](#-about)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Getting Started](#-getting-started)

## 👋 About

Snap Canvas is a photobooth application for SENG-3040: point your webcam at yourself, then go creative. The whole interface is drawn on a logical **1280×720 (16:9) design surface** that scales uniformly to any monitor — every button, panel, and stamp stays pixel-perfect whether you're on a laptop or a 4K display.

## ✨ Features

- 🎥 **Live webcam capture** — real-time video feed composited onto the canvas
- 🎨 **Photo filters** — Invert, Grayscale, Posterize, and Blur, applied with one click
- ✏️ **Drawing tools** — freehand brush with stroke color, fill color, and thickness swatches
- 🟪 **Shapes** — click-and-drag rectangles and other shapes over your shot
- 🐼 **Stamps / stickers** — four loaded stamp images you can place anywhere
- 🧲 **Responsive layout** — screen coordinates map cleanly to design coordinates at any window size
- 🎛️ **Full custom UI** — top filter panel, left tool panel, right stamp panel, all drawn in-canvas

## ⚙️ How It Works

```text
┌────────────────────────────────────────────────────┐
│  Logical 1280×720 design surface (16:9)            │
│  ┌──────┬──────────────────────────────┬────────┐  │
│  │ tools│        live webcam feed      │ stamps │  │
│  │ panel│     + drawings, shapes,      │ panel  │  │
│  │      │       stamps composited      │        │  │
│  └──────┴──────────────────────────────┴────────┘  │
│      ↑ filters on top panel · scales to any screen  │
└────────────────────────────────────────────────────┘
```

- `createCapture(VIDEO)` brings in the webcam; the feed is drawn into graphics buffers so filters and edits never destroy the original
- `screenToDesign()` converts real mouse position into design-surface coordinates, so interaction works at every scale
- Stamps are preloaded in `preload()` and rendered over the composite on click
- Filters (`INVERT`, `GRAY`, `POSTERIZE`, `BLUR`) apply to the working buffer on demand

## 🚀 Getting Started

No build tools needed — it's plain p5.js:

1. Clone or download this repo
2. Serve the folder (webcams need a secure context):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

3. Allow camera access, and start snapping 📸

**Or skip all that — it's already live: [snapcanvas-five.vercel.app](https://snapcanvas-five.vercel.app/)**

---

<div align="center">

⭐ **Star this repo if you find it useful** ⭐

</div>
