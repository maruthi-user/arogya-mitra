# ఆరోగ్య మిత్ర (Arogya Mitra)

Telugu, audio-first app to find nearby doctors, clinics and pharmacies. Frontend only: plain HTML, CSS and JavaScript, with all data in the browser's `localStorage`. No build step and no server.

## Run on localhost

Needs only Node.js 16 or newer. There are no packages to install.

```
npm start
```

Then open http://localhost:5500. Other ways to start it:

- `npm run dev` serves on http://localhost:5501.
- `node server.js 5000` serves on any port you give (use this if 5500 is busy).
- Double-click `start.bat` (Windows) to start the server and open the browser.

Run it through localhost rather than double-clicking `index.html`: voice input, recorded audio and the intro video work more reliably over http. Use Chrome or Edge for the best voice support. To try it on a phone, connect both to the same Wi-Fi and open `http://<your-PC-IP>:5500`. Note that browsers allow the microphone only on localhost or https, so voice input on a phone needs an https tunnel.

## Git

This folder is a git repository on branch `main`. `.gitignore` skips `node_modules`, logs and editor folders. `.gitattributes` normalizes line endings and marks audio and video as binary. Recorded voice files (`assets/audio/te|en/*.mp3`) and the intro videos are tracked, so keep them small.

```
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

## What works

- Intro (first launch only): plays `assets/intro-te.mp4` if you add it, otherwise a 4-step narrated tour. Replay from the Help button.
- Village setup, symptom picker, nearby providers sorted by open status and distance, call buttons (`tel:`).
- Booking: pick today or tomorrow and a time slot, confirm, see and cancel in My bookings.
- Medicine search: which pharmacy has it, with a prescription notice.
- Emergency (108) screen, reachable from home and from the danger-sign tiles.
- Voice search (Chrome/Edge, te-IN): say a symptom, medicine or "108".
- Provider view (Settings > provider view): toggle open/closed, pharmacy stock, and mark bookings done or cancelled. This is how you test the other side on one device.

## Languages

Telugu and English. The user picks on first launch, and can change it from the home screen link or Settings. The choice is saved in localStorage. All text, voice scripts, intro tour and demo names exist in both languages: UI text in `js/strings.js` (`STR_TE`, `STR_EN`, `VOICE_TE`, `VOICE_EN`), and names in `js/data.js` (`te` / `en` fields, `EN_NAMES`). To add a language, add an entry to `LANGS` in `js/strings.js`.

## Voice and audio

Every screen speaks a script in the chosen language (see `VOICE_TE` and `VOICE_EN` in `js/strings.js`).

1. If `assets/audio/<lang>/<key>.mp3` exists (for example `assets/audio/te/home.mp3` or `assets/audio/en/home.mp3`), that recorded voice plays. Recorded human voice is the recommended option.
2. Otherwise the browser's text-to-speech is used (te-IN or en-IN). If the device has no voice for that language, Settings shows a notice.
3. Voice input also follows the chosen language. Voice search understands both Telugu and English words in either mode.
4. The intro video is `assets/intro-te.mp4` or `assets/intro-en.mp4`; without it the narrated tour plays.

Audio keys: `intro, step1..step4, setup, home, symptoms, providers, meds, medResults, book, confirmed, bookings, emergency, settings, dash`.

## Data

Stored under the localStorage key `arogyaMitra.v1`: settings, providers, pharmacies (with stock) and bookings. Demo providers, shops and phone numbers are in `js/data.js` and are fake. Settings > delete data resets everything.

## Files

```
index.html
server.js       local dev server (npm start)
package.json    npm scripts, no dependencies
start.bat       Windows launcher
css/styles.css
js/strings.js   Telugu text and voice scripts
js/data.js      villages, symptoms, medicines, demo providers
js/storage.js   localStorage wrapper
js/voice.js     audio playback, TTS, speech recognition
js/app.js       screens, navigation, actions
assets/audio/te, assets/audio/en   optional recorded voice files
```

## Known limits (frontend-only)

- Bookings are visible only on the device that created them. Sharing between patient and provider needs a backend.
- No SMS or reminders; they need a server.
- Medicine stock and provider hours are not real until providers update them.
