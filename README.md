# MascotGO — NCAA Hero Images

An internal pipeline and human review tool for acquiring, filtering, and approving high-quality campus images for 1,097 NCAA member schools.

---

## What's Built

### Image Review Interface (complete)
A password-protected web app where reviewers can browse schools, view candidate images, and cast Approve/Reject votes.

- **Login** — email + shared password; issues a signed 7-day JWT stored as an httpOnly cookie
- **School list** — accordion of all 1,097 NCAA schools, alphabetically sorted, with image count per school
- **Image review** — lazy-loads images per school; shows thumbnail, dimensions, Azure CV score, and current status
- **Voting** — Approve/Reject buttons with live counts; one vote per reviewer per image; votes can be changed; optimistic UI updates
- **Route protection** — Next.js middleware verifies the JWT on every `/review/*` request before it reaches any page or component

### Database (complete)
Neon (serverless PostgreSQL) with three tables managed by Prisma:

| Table | Purpose |
|---|---|
| `School` | One row per NCAA institution (1,097 rows, real names) |
| `Image` | One row per candidate image; stores source URL, blob URL, dimensions, Azure score, status |
| `Vote` | One vote per reviewer per image; unique constraint on `(userEmail, imageId)` |

### API Routes (complete)

| Route | Description |
|---|---|
| `POST /api/auth/login` | Validates shared password, issues JWT cookie |
| `POST /api/auth/logout` | Clears session cookie |
| `GET /api/auth/me` | Returns current user's email from session |
| `GET /api/schools` | All schools with image counts, alphabetically |
| `GET /api/schools/[name]` | Single school with all images and votes |
| `POST /api/vote` | Record or update a vote; email read from JWT (never from request body) |

### Seed Script (complete)
`npm run seed` — populates the `School` table from the source CSV files.

Join logic: `NcaaSchools.csv.UrbanCollegeId` → `UrbanColleges.csv.Id` → `InstName`

---

## What's Not Built Yet (needs API credentials)

The image acquisition pipeline — the loop that runs for each school and fills the `Image` table:

1. **Serper.dev** — search `"[School Name] campus"` → collect image URLs and metadata
2. **Metadata filter** — reject by dimensions, aspect ratio, or license
3. **Azure Computer Vision** — score images for quality, watermarks, campus relevance
4. **Azure Blob Storage** — download passing images and store them permanently
5. **DB write** — `Image.create(...)` with all metadata, blobUrl, azureScore

Once this pipeline runs, images will automatically appear in the review UI with no frontend changes needed.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend / Backend | Next.js 16 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Neon (serverless PostgreSQL) |
| ORM | Prisma 7 with `@prisma/adapter-neon` |
| Auth | JWT via `jose` (HS256, httpOnly cookie) |
| Image Search | Serper.dev *(pending credentials)* |
| Image Analysis | Azure Computer Vision *(pending credentials)* |
| Image Storage | Azure Blob Storage *(pending credentials)* |
| Deployment | Vercel |
| Tests | Vitest + @testing-library/react |

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env`
```env
DATABASE_URL=...           # Neon connection string (pooled)
DIRECT_URL=...             # Neon direct connection string (for migrations)
REVIEW_PASSWORD=...        # Shared password for all reviewers
SESSION_SECRET=...         # Random 32+ character string for signing JWTs
```

### 3. Apply the database schema
```bash
npx prisma migrate deploy
```

### 4. Generate the Prisma client
```bash
npx prisma generate
```

### 5. Seed schools
```bash
npm run seed
```
Populates the `School` table with 1,097 NCAA institution names. Safe to re-run.

### 6. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Log in with any email and the `REVIEW_PASSWORD` you set.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run seed` | Seed the School table from CSV data |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Watch mode |

---

## Data Files

| File | Description |
|---|---|
| `data/UrbanColleges.csv` | Master institution directory — `Id`, `InstName`, location, and other fields |
| `data/NcaaSchools.csv` | Filtered subset of `UrbanCollegeCharacteristics.csv` where `MemberNcaa = Yes` |
| `data/UrbanCollegeCharacteristics.csv` | Full IPEDS characteristics dataset (source for `NcaaSchools.csv`) |

---

## Project Structure

```
src/
  app/
    page.tsx                  # Login page
    review/
      page.tsx                # Review shell (server component, reads session)
      ReviewClient.tsx        # Review UI (client component — accordion, voting)
    api/
      auth/login/route.ts     # POST — issue JWT
      auth/logout/route.ts    # POST — clear cookie
      auth/me/route.ts        # GET — current user
      schools/route.ts        # GET — all schools
      schools/[name]/route.ts # GET — single school with images + votes
      vote/route.ts           # POST — record vote
  lib/
    db.ts                     # Prisma singleton (Neon adapter)
    session.ts                # JWT helpers: createSession, getSession, verifyToken
  middleware.ts               # Protects /review/* — verifies JWT at edge
  generated/prisma/           # Auto-generated Prisma client (gitignored)

prisma/
  schema.prisma               # DB schema (School, Image, Vote)
  migrations/                 # Applied migrations

scripts/
  seed-schools.ts             # Populate School table from CSV
```
