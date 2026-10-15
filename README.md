# Bidari Utsav - Redesigned Cultural Portal

Welcome to the brand new, high-performance website for **Bidari Utsav** — the annual cultural & music festival of Bidari Cultural Forum, Bidar, Karnataka (headed by singer Smt. Rekha Sowdi).

---

## 🎨 New Design System & Theme

This website has been rebuilt from scratch with a completely custom, award-level design system.

### Color Tokens
- **Background (Ink Black)**: `#0B0C10`
- **Surface**: `#14161D`
- **Surface-2**: `#1C1F29`
- **Gold**: `#D4AF37`
- **Gold Soft**: `#F1DFA4`
- **Silver**: `#C9CED6`
- **Saffron (CTA / Highlights)**: `#FF8A3D`
- **Maroon (Accent Sections)**: `#7A1F3D`
- **Cream (Rhythm Contrast)**: `#FAF6EE`
- **Text**: `#ECEAE4`
- **Muted Text**: `#9AA0AE`

### Typography Stack
- **Display Serif**: *Fraunces* (with italic accents)
- **Body Font**: *Inter*
- **Vernacular Support**: *Noto Sans Kannada*

---

## 🚀 Key Visual & Performance Innovations

1. **Floating Glass Pill Navbar**: Centered floating top navigation pill with logo, clean links, and mobile slide-over overlay.
2. **Giant Typography Hero**: Full-screen layout with oversized Fraunces headlines, subtle Ken Burns background zoom, and scroll cue.
3. **Bento Stats & Mission Grid**: Modern modular layout for statistics, mission & vision tiles with maroon highlights.
4. **Interactive Award Timeline**: Vertical center-line timeline showcasing annual trophy winners with modal detail popups.
5. **Horizontal Special Guest Gallery**: Portrait cards with hover reveal and direct video performance links.
6. **Progressive Image & Lightbox System**: PhotoSwipe v5 lightbox with progressive 24-chunk scroll loading via `IntersectionObserver` and blur-up WebP placeholders.
7. **Cinema Video Layout**: Click-to-play YouTube facades (zero initial iframe lag) with featured video player and playlist sidebar.
8. **Asymmetric Bento Photo Grid**: Modern visual masonry layout for event photo previews.
9. **Oversized Brand Footer**: Clean multi-column layout with oversized watermark typography.

---

## ⚡ Performance Optimizations

- **Offline Vendor Dependencies**: All JS/CSS libraries (GSAP, ScrollTrigger, Lenis, Lucide Icons, PhotoSwipe 5, CountUp.js) are hosted locally in `assets/vendor/`. No third-party CDN dependency or render-blocking scripts.
- **Optimized WebP Image Variants**: 300+ event photos converted into 480w, 960w, 1600w WebP variants and 20px blur placeholders.
- **Hardware Acceleration Scoping**: Smooth Lenis scrolling and tilt effects enabled exclusively on fine-pointer desktop devices (disabled on touch / low-concurrency devices to eliminate lag).

---

## 🛠️ Optimization & Build Script

To regenerate optimized WebP responsive variants and blur placeholders, run:

```bash
python optimize_and_minify.py
```

No Node/npm build steps required for production runtime; all HTML, CSS, and JS run natively on GitHub Pages, Netlify, or any standard web server.
