# Galaga - Neon Retro Browser Game

A full-featured Galaga clone built with Next.js 15, TypeScript, and HTML5 Canvas. Features neon cyberpunk visuals, Web Audio API sound synthesis, mobile touch controls, and classic Galaga gameplay mechanics.

## Features

- Classic Galaga enemy formations with Bees, Butterflies, and Boss Galaga
- Enemy dive patterns with Bezier curve paths
- Boss Galaga tractor beam to capture player ship
- Double ship mechanic after rescuing captured ship
- 3 difficulty levels (Easy / Medium / Hard)
- Procedurally synthesized sound effects and background music (Web Audio API)
- Parallax star field with 3 layers
- Particle explosion effects
- Challenging bonus stages every 3rd level
- High score persistence via localStorage
- Mobile-responsive with touch controls
- Neon/cyberpunk visual style with canvas glow effects

## Controls

### Desktop
- **Arrow Left/Right** or **A/D**: Move player
- **Space** or **Z**: Shoot
- **P** or **Escape**: Pause/Resume
- **Enter**: Start / Confirm

### Mobile
- On-screen left/right buttons (bottom corners)
- Large shoot button (center bottom)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** strict mode
- **Tailwind CSS v4**
- **HTML5 Canvas** for game rendering
- **Web Audio API** for synthesized sound effects
