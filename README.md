# Zaney Kakuro

Crossword meets arithmetic.

Zaney Kakuro is a dependency-free web game prototype for a polished Kakuro experience with daily modes, Explain Mode, Smart Notes, sharing, stats, and an AdSense-ready layout.

## Run Locally

```bash
npm install
npm run dev
```

No runtime packages are required; `npm install` is optional for this prototype.

## Validate The Library

```bash
npm test
```

The validation script generates 5,000 deterministic puzzles across the supported modes and checks that every puzzle has a completed solution matching its clue sums with no duplicate digits inside a run.

## Vercel

This app is ready for Vercel as a static project. Replace the placeholder publisher id in `public/ads.txt` and the ad slot markup in the app after Google AdSense approval.
