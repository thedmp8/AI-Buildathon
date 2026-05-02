ANU Degree Planner — Prototype

Run the prototype backend (Node/Express) and open the frontend.

Setup:

1. Install dependencies

```bash
npm install
```


2. Option A — Node prototype (legacy)

```bash
npm run start
```

Open http://localhost:3000 in your browser.

2. Option B — Blazor Server (recommended)

Follow `BLAZOR_SETUP.md` to scaffold a Blazor Server app and integrate the CSV data.

What this scaffold includes:
- Minimal Express server with `/api/degrees` and `/api/courses` endpoints
- Sample data in `data/` (now stored as CSV files `courses.csv` and `degrees.csv`)
- Tiny frontend in `public/` that accepts start date + degree and lists courses

Next steps: implement prerequisite and offering checks in the backend, build course selection UI, and add a graduation requirements validator.
