# VitalRoad Health Tracker

VitalRoad is a full-stack mini project for tracking daily steps, sleep, water intake, mood, and notes. It uses a React frontend, a RESTful Node.js API, and MongoDB for persistent data.

The app includes login and signup. Signup stores each user's name, email, password hash, and age, then keeps health entries private to that account.

## Run Instructions

```powershell
npm install
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:MONGODB_DB="vitalroad"
$env:MONGODB_COLLECTION="entries"
$env:MONGODB_USERS_COLLECTION="users"
$env:JWT_SECRET="change-this-to-a-long-random-secret"
node server.js
```

Open [https://health-tracker-1-2v8r.onrender.com/]

The frontend still has no build step. MongoDB requires the `mongodb` Node package, which is listed in `package.json`.

For Vercel deployment, use MongoDB Atlas instead of local MongoDB.

## Marking Scheme Mapping

| Requirement | Project evidence |
| --- | --- |
| Problem Statement | Health Tracker Application for tracking daily steps, sleep, water intake, mood, and notes. |
| Frontend Implementation | `public/index.html`, `public/styles.css`, and `public/app.js` use HTML5, CSS3, JavaScript ES6+, React components, hooks, forms, cards, and responsive design. |
| Backend Development | `server.js` runs local REST endpoints, and `api/` provides Vercel serverless REST endpoints. |
| Database Integration | MongoDB Atlas stores persistent entries in the `vitalroad.entries` collection on Vercel. A JSON fallback remains available locally only when `MONGODB_URI` is not set. |
| Deployment & Output | Local deployment uses `node server.js`; Vercel deployment serves `public/` and `/api/*` serverless functions. |

## Course Outcomes Mapping

| Course Outcome | Implementation |
| --- | --- |
| CO1 | Responsive React frontend with dashboard statistics, form validation messages, recent entries, documentation, and mobile-friendly CSS. |
| CO2 | RESTful API and MongoDB database integration using `fetch()` from the client and the MongoDB Node driver on the server. |
| CO3 | Deployment documentation, `Dockerfile`, `.dockerignore`, and `.github/workflows/ci.yml` for syntax-check CI/CD evidence. |
| CO4 | Basic PWA support through `public/manifest.json`, `public/service-worker.js`, service worker registration, theme color, and app icon. |
| CO5 | Security and emerging technology notes through backend input validation, safe static path handling, and IoB-style Health Insight suggestions from behavior data. |

## Frontend Implementation

- HTML5 metadata, viewport, manifest link, semantic sections, and form inputs.
- CSS3 custom properties, grid layout, responsive media queries, and accessible visual states.
- ES6+ JavaScript modules, arrow functions, async/await, template literals, destructuring, and spread syntax.
- React components for statistics, daily entry form, entry list, and Health Insight.
- Health Insight card uses average steps, sleep, and water data to generate a short wellness suggestion.

## Backend Development

`server.js` provides a Node.js HTTP server for local development. For Vercel, the same shared database logic is used by serverless functions in `api/`.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check server health |
| `POST` | `/api/auth/register` | Create a user account with name, email, password, and age |
| `POST` | `/api/auth/login` | Log in and receive an auth token |
| `GET` | `/api/entries` | List all health entries |
| `POST` | `/api/entries` | Create a health entry |
| `DELETE` | `/api/entries/:id` | Delete a health entry |
| `GET` | `/api/stats` | Calculate dashboard statistics |

Example `POST /api/entries` body:

```json
{
  "date": "2026-05-14",
  "steps": 8200,
  "sleep": 7.5,
  "water": 8,
  "mood": "Focused",
  "notes": "Balanced day with a long walk."
}
```

## MongoDB Database Integration

Install the MongoDB driver:

```powershell
npm install
```

Set MongoDB environment variables in PowerShell:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:MONGODB_DB="vitalroad"
$env:MONGODB_COLLECTION="entries"
node server.js
```

For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string:

```powershell
$env:MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
```

The backend stores entries in:

```text
Database: vitalroad
Collection: entries
```

Check the active database mode:

```text
http://localhost:3000/api/health
```

Expected MongoDB response:

```json
{
  "status": "ok",
  "service": "VitalRoad API",
  "database": "mongodb"
}
```

## Deployment Instructions

Local deployment:

```bash
node server.js
```

Vercel deployment:

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Keep the framework preset as `Other`.
4. Leave the build command empty or set it to `npm install`.
5. Set the output/static directory to `public` if Vercel asks.
6. Add these Environment Variables in Vercel Project Settings:

```text
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=vitalroad
MONGODB_COLLECTION=entries
MONGODB_USERS_COLLECTION=users
JWT_SECRET=change-this-to-a-long-random-secret
```

7. In MongoDB Atlas, allow Vercel to connect by setting Network Access to `0.0.0.0/0`, or use a stricter IP allowlist if your deployment setup provides stable egress IPs.
8. Deploy, then check:

```text
https://your-vercel-app.vercel.app/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "VitalRoad API",
  "database": "mongodb"
}
```

Docker deployment:

```bash
docker build -t vitalroad-health-tracker .
docker run -p 3000:3000 -e MONGODB_URI="mongodb://host.docker.internal:27017" vitalroad-health-tracker
```

Without MongoDB:

```bash
docker build -t vitalroad-health-tracker .
docker run -p 3000:3000 vitalroad-health-tracker
```

CI/CD evidence:

```text
.github/workflows/ci.yml
```

The workflow runs:

```bash
node --check server.js
node --check public/app.js
```

## PWA Notes

VitalRoad includes:

- `public/manifest.json` for installable app metadata.
- `public/service-worker.js` for basic app shell caching.
- `public/icon.svg` for the app icon.
- Service worker registration in `public/app.js`.
- Theme color and manifest link in `public/index.html`.

## Security And Emerging Technology Notes

- Server-side validation checks date, steps, sleep, water, and mood before saving data.
- User signup validates name, email, password length, and age.
- Passwords are hashed with `bcryptjs`, and authenticated routes use JWT bearer tokens.
- Health entries are scoped to the logged-in user's account.
- API responses return validation errors instead of storing invalid records.
- Static file serving normalizes paths to reduce directory traversal risk.
- The Health Insight card demonstrates an IoB-style idea by converting behavior data into simple health feedback.

## Conclusion

VitalRoad satisfies the mini project requirements by combining a responsive React frontend, RESTful Node API, MongoDB persistence, deployment assets, and PWA support.
