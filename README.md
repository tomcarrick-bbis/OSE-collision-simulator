# Collision Investigation

A small static HTML/CSS/JavaScript simulation designed for student investigation of how cart mass and launch speed affect the displacement of a box during a collision.

## Educational model

The simulation intentionally prioritises the approximate OpenSciEd relationship rather than detailed collision mechanics.

Expected box displacement is calculated as:

`distance (cm) = 4 × mass (kg) × speed² (m/s)`

Each launch then receives a uniformly random variation of up to ±10%. The resulting value is rounded to 0.1 cm and is used for both the numerical result and the final visual box position.

The spring launcher is representational only. Greater selected launch speed produces greater visible spring compression; Hooke's law is not modelled.

## Student controls

- Cart mass: 0.5, 1.0, 1.5, 2.0 kg
- Launch speed: 1.0, 1.5, 2.0, 2.5, 3.0 m/s
- Launch
- Reset

Reset returns the apparatus to its starting position while retaining the selected mass and speed.

## Technical structure

- `index.html` — semantic interface and SVG apparatus
- `style.css` — layout and visual styling
- `script.js` — configuration, state, calculation, animation, rendering, and interaction

There are no external libraries, frameworks, graphics, APIs, databases, or build tools.

## Running locally

Open `index.html` directly in a modern browser, or serve the folder with any simple static web server.

For example, with Python installed:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying with Vercel

1. Commit these four files to a GitHub repository.
2. Import the repository into Vercel.
3. Use the default static-site deployment settings.
4. No build command is required.

## Version 1 scope

Version 1 deliberately excludes graphs, trial history, automatic averages, sound, adjustable friction, adjustable box mass, kinetic-energy displays, momentum displays, timer/ticks, animation-speed controls, external graphics, accounts, and other added features.
