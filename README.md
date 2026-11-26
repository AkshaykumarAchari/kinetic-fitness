KINETIC — Fitness Dashboard
Move with purpose. Stronger starts here.

KINETIC is a responsive personal fitness web application that combines animated exercise demonstrations, workout timers, a weekly training planner and activity insights in a dark, minimal dashboard. Guests can browse exercises and use training tools without signing in; Google authentication enables personal workout-plan synchronization through Cloud Firestore.

Status: Initial prototype / pre-production. The static guest experience is implemented; cloud features require Firebase configuration and security validation.
Features
- Exercise library: 10 curated movements, six-second stylized 3D MP4 demonstrations, WebP previews, technique cues, muscle targets, equipment and difficulty information.
- Search and filters: Filter by muscle group or search by exercise name, target and equipment.
- Training tools: Countdown (30, 60, 90 or 300 seconds), stopwatch, pause/resume and reset.
- Weekly planner: Monday–Sunday default program; add/remove exercises, customize sets (1–10), reps/hold seconds (1–180) and rest (0–300 seconds). Complete today's exercises and manually save each day.
- Progress dashboard: Today's exercise completions, weekly activity, device-local timer statistics and training time.
- Google sign-in: Firebase Authentication with popup and redirect fallback; per-user Firestore documents.
- Responsive UI: Mobile bottom navigation, desktop sidebar, accessible labels, keyboard-aware controls and web app manifest.
Technology
Layer	Implementation
Frontend	HTML5, CSS3, vanilla JavaScript ES modules
Authentication	Firebase Authentication / Google provider
Data	Cloud Firestore; browser localStorage for timer statistics
Media	Bundled MP4, WebP and SVG
Hosting	Static HTTP(S) hosting; GitHub Pages or Firebase Hosting
Build	None; no npm dependencies required for the app


Project structure
kinetic-fitness/
├── index.html
├── styles.css
├── manifest.webmanifest
├── assets/
│   ├── favicon.svg
│   ├── clips/                 # 10 exercise videos
│   └── posters/               # 10 exercise previews
├── src/
│   ├── app.js                 # UI, events and application state
│   ├── auth.js                # Firebase auth and Firestore operations
│   ├── exercises.js           # Catalog and default program
│   ├── firebase-config.js     # Null by default; public web configuration
│   ├── timers.js              # Countdown and stopwatch logic
│   └── workout.js             # Plan normalization and activity helpers
├── tests/                     # Added pure-module tests
├── firestore.rules            # Proposed rules; test before deployment
├── .gitignore
├── SECURITY.md
├── CHANGELOG.md
├── RELEASE_CHECKLIST.md
└── README.md
Run locally
Requires a modern browser and any static HTTP server. Python 3 is one option.
python -m http.server 8000
On Windows, py -m http.server 8000 also works if the Python launcher is installed.

Open http://localhost:8000. Do not open index.html via file:// because ES module loading may be restricted.

The exercise library and timers work without Firebase configuration. Google sign-in and saving workout plans are disabled until configuration is supplied.
Enable Google sign-in and Firestore
1. Create a Firebase project at https://console.firebase.google.com/ and register a Web app.
2. Enable the Google provider in Authentication > Sign-in method.
3. Add localhost and your actual deployment hostname to Authentication > Settings > Authorized domains as appropriate.
4. Create a Cloud Firestore database in production mode. Do not enable public read/write access.
5. Replace null in src/firebase-config.js with the actual Firebase Web app configuration from the console:
export const firebaseConfig = {
  apiKey: "YOUR_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_WEB_APP_ID",
  messagingSenderId: "YOUR_SENDER_ID"
};
Firebase Web configuration is not a service-account credential. Never commit private keys, admin SDK credentials or service-account JSON files.
6. Review firestore.rules, an initial proposed rule set added to this repository. Test it using the Firestore emulator or Rules Playground, including cross-account denial and malformed documents, before publishing it in Firestore > Rules. Do not use this file as proof of security.
7. Verify the Firebase CDN SDK version pinned in src/auth.js (13.4.0 in the supplied source) is available and compatible, and check Google popup and redirect flows on the actual host. Redirect sign-in may need additional same-origin auth configuration depending on the hosting environment.
8. Test sign-in, save a day, reload, sign out and sign in with a second account. Confirm the second account cannot access the first account's data.
See SECURITY.md and RELEASE_CHECKLIST.md.
Data model
users/{uid}/plans/{day}
day is one of mon, tue, wed, thu, fri, sat, sun.

Example document (illustrative JSON; updatedAt is actually a Firestore server timestamp):
{
  "day": "mon",
  "items": [
    {
      "id": "squat",
      "sets": 3,
      "reps": 12,
      "restSec": 60,
      "completedOn": null
    }
  ],
  "updatedAt": "<server timestamp>"
}
The application reads seven explicit day documents and writes individual days. Missing days receive a default program; Sunday starts empty. The UI normalizes values, rejects duplicate exercises and limits a day to 12 rows (only 10 distinct catalog IDs currently exist). Completion is stored as a date on each plan row, not as a permanent workout-history ledger. Saves overwrite a day document; simultaneous multi-device edits are not conflict-merged.

Timer statistics are stored under kinetic-session-stats-v1 in browser localStorage, shared by people using the same browser profile and not synchronized to Firebase. The current timer session count increments on completed countdowns; stopwatch time contributes to training duration when qualifying running segments are paused or reset.
Tests
With Node.js 22 or later, run the supplied dependency-free tests:
node --experimental-default-type=module --test tests/*.test.mjs
If your shell does not expand the wildcard, use tests/core.test.mjs.

Initial import verification: 8/8 tests passed on Node.js 22.16.0. All six original JavaScript modules passed syntax checks. Browser smoke testing could not be completed in the review environment because local browser navigation was blocked.

These tests cover pure timer and workout helpers, catalog integrity and normalization. They are not end-to-end, Firebase integration, security or accessibility acceptance tests.
Deploy using GitHub Pages
1. Push the project files to a repository's main branch.
2. In GitHub, open Settings > Pages.
3. Select Deploy from a branch, then main and / (root), and save.
4. Use the URL displayed by GitHub Pages. If using Firebase, authorize that hostname and test the authentication flow.
GitHub Pages availability for private repositories depends on the GitHub plan. A private source repository does not automatically make the deployed website private. Alternatively, deploy the same files using a suitable static hosting provider. The guest experience requires no backend or build step.
Current limitations and release gates
- Firebase is unconfigured in the supplied ZIP; live sign-in and cloud persistence have not been verified.
- No original Firestore security rules, test suite or CI configuration was supplied. The added rules are proposed and untested against an emulator.
- The Content Security Policy should be checked against inline styling used for activity bars and Google/Firebase sign-in requirements; avoid broadening the policy indiscriminately.
- The manifest is present, but there is no service worker, offline cache strategy or verified installability.
- Timer counters are device-local totals, not account-specific daily history.
- No membership management, gym billing, attendance scanner, native desktop app or medical coaching functionality.
- Verify ownership and redistribution rights for the bundled media before publishing.
Roadmap (proposed, not implemented)
- Complete Firebase integration and authorization tests.
- Harden persistence, unsaved-change handling and concurrent edits.
- Add durable workout history and account-specific progress insights.
- Improve timer statistics, mobile accessibility and automated browser testing.
- Add offline/PWA support if required.
License and usage
No open-source license was included in the original package. Licensing and media rights must be confirmed by the owner before public redistribution. Do not assume this code or the bundled media is open source.

Exercise animations are simplified visual references, not individualized medical or coaching advice.
