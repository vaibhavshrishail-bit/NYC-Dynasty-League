# NYC Dynasty League — Cinematic Universe (prototype A + B)

## Outputs (site/)
- The_Pantheon_Cinematic_1080p.mp4 — 25s, 1920x1080, 30fps, H.264 + AAC
- pantheon-cinematic.html — same cinematic, browser-rendered (play, scrub, real-time export button)
- hub/index.html — interactive franchise universe (single file, no network needed)
- Pantheon_vs_Super_Lamario_Bros_Poster_2400x3600.png + pantheon-matchup-poster.html (source)
- pantheon_audio.wav — original synthesized score

## Rebuild
    npm i @fontsource/cinzel @fontsource/barlow-condensed
    python3 src/build_data.py     # needs the Sleeper snapshot JSON + Playbook text (paths at top of file)
    python3 src/audio.py          # numpy/scipy synth -> site/pantheon_audio.wav
    python3 src/build_cine.py     # -> site/pantheon-cinematic.html
    python3 src/render.py         # Playwright + ffmpeg -> frames -> mp4
    python3 src/build_hub.py      # -> site/hub/index.html
    python3 src/build_poster.py   # -> site/pantheon-matchup-poster.html (screenshot at 2x for PNG)

## Data provenance
- Rosters, jersey numbers, ages: Sleeper snapshot 2026-09-08T15:07Z (Drive "NYC DL Data Snapshots")
- History, tiers, odds, luck, schedule strength, rivalries, H2H matrix: Commissioner's Playbook 2026-27 (2026-09-08)
- Crests, colors, mottos, player epithets: original creative work, not league data
