# Zaney Kakuro Product Plan

## Launch Shape

- Daily puzzle shared by everyone, keyed by date and mode.
- Puzzle library generated from deterministic seeds and validated before publishing.
- Five modes: Classic, Mini, Expert, Weekend Monster, and Lightning.
- Explain Mode teaches the next reasoning step without revealing the answer.
- Smart Notes show possible values, eliminated numbers, and remaining combinations.
- Share cards use spoiler-free progress text.
- AdSense slot stays below the primary play area to avoid interrupting solving.

## Library Guarantee

The current prototype guarantees finishability by deriving every puzzle from a complete solved grid and then calculating clue sums from that solution. The validation script checks 5,000 generated puzzles.

Before production, add a uniqueness solver if every puzzle must have exactly one logical solution. Finishable and uniquely solvable are different quality bars.

## Monetization

- Add Google AdSense after domain approval.
- Keep ads out of the active grid and Explain Mode panel.
- Start with one responsive display slot below the game.
- Use `ads.txt` with the real AdSense publisher id.

## Growth Features

- Account-free local stats first, cloud sync later.
- Streaks and friend challenge links.
- Tutorial campaign from simple sums to advanced elimination.
- Weekend Monster leaderboard once anti-cheat and account identity exist.
