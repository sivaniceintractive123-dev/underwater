# The Sea We Breathe — Interactive 3D Underwater Experience

An immersive scroll-driven web experience inspired by "The Sea We Breathe", featuring a 300-frame full-HD 3D dive sequence, real-time depth telemetry HUD, and procedural underwater audio synthesis.

## Features

- **Hero Banner**: Geometric typography using the *Rajdhani* font family, featuring stroke outline, heavy solid title, and delicate interactive corner-bracket action button.
- **300-Frame Scroll Scrubbing**: High-performance HTML5 Canvas renderer with smooth linear interpolation (lerp) for 60FPS/120FPS fluidity.
- **Progressive Preloader & Fallback**: Instant frame 1 display, progressive background buffering, and nearest-loaded frame fallback to eliminate blank flashes.
- **Procedural Underwater Audio (Web Audio API)**: Real-time synthesis of deep-ocean hydrostatic pressure resonance, dynamic low-pass depth filter modulation, and gentle procedural bubble sounds without external audio dependencies.
- **Interactive Depth Telemetry HUD**: Live updates for Depth (0m to 1,250m), Water Temperature (24.5°C to 2.8°C), Hydrostatic Pressure (1.0 ATM to 126 ATM), and Frame counter.
- **Scrollytelling Chapters**:
  1. *Surface* (0m) — The Sea We Breathe
  2. *Sunlight Zone* (45m) — The Planet's Blue Lungs
  3. *Reef Sanctuary* (180m) — Cradles of Marine Life
  4. *Twilight Realm* (520m) — The Great Twilight Migration
  5. *The Deep Abyss* (1,250m) — Protect What Keeps Us Alive

## Project Structure

```text
Under Water/
├── index.html           # Main entry document
├── start-site.bat       # One-click desktop launcher
├── css/
│   └── style.css        # Stylesheet & cinematic styling
├── js/
│   └── script.js        # Canvas renderer, audio synth & telemetry engine
└── images/              # 300 sequential animation frames (001 - 300)
```

## Running Locally

1. Open `index.html` directly in any modern browser, or double-click `start-site.bat`.
2. Or serve with any static web server:
   ```bash
   npx serve .
   ```
