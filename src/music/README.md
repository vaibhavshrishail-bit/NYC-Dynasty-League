# Licensed music for the films

To give a film a real track instead of the built-in score:

1. Put the audio file here, named after the franchise slug: `vaibhav.mp3` (mp3, m4a, wav, ogg or flac).
2. Add an entry to `credits.json` in this folder:

```json
{ "vaibhav": { "title": "Track name", "artist": "Artist name", "license": "CC BY 4.0", "url": "https://where-it-came-from", "start": 12 } }
```

`start` is the second in the track where the film should begin (optional).

The film is only built with the track when both the file and a credits entry with a `license` exist. The credit line is drawn on the closing card.

Only add music whose licence allows redistribution in a public video: CC0, CC BY, or a licence you have bought that covers public web video.
A track that is merely "free to stream" or "no copyright" on a video site is not enough.
