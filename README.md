# SoftSkill Institute — Node.js / Express Version (Vercel-ready)

This is the Node.js + Express rewrite of the site, built specifically so it can be pushed to
GitHub and deployed live on **Vercel**. Same features as before:

- Public website with courses loaded from a database
- Admin panel: add / edit / delete courses, upload Excel/CSV to power certificate verification, view contact messages
- Certificate Verification page for visitors (roll number lookup)
- Contact form that saves to the database and auto-opens WhatsApp with the enquiry pre-filled

---

## Why this version is different from the PHP one

Vercel runs your backend as **serverless functions**, not a normal always-on server. That changes a few things under the hood (you don't need to worry about most of this — it's already handled in the code):

| | PHP version | This Node version |
|---|---|---|
| Admin login | PHP `$_SESSION` | JWT stored in an httpOnly cookie (works statelessly across serverless requests) |
| Excel upload | Saved temporarily, then read from disk | Parsed directly in memory, never touches disk (Vercel's filesystem is read-only/ephemeral) |
| Database | Local MySQL | Any **remote** MySQL you can reach over the internet (Vercel can't see your local computer's database) |

---

## 1. Project structure

```
softskill-node/
├── api/index.js          <- Express app + Vercel serverless entry point
├── routes/
│   ├── site.js             <- public homepage route
│   ├── api.js               <- /api/contact, /api/verify-certificate
│   └── admin.js             <- entire admin panel
├── middleware/auth.js     <- JWT cookie login/logout helpers
├── views/                 <- EJS templates (index.ejs + admin/*.ejs)
├── public/                <- styles.css, script.js, main.js, logo.png, admin.css
├── db.js                  <- MySQL connection pool
├── database.sql           <- run this once to create tables + seed data
├── vercel.json             <- tells Vercel how to build/route this app
├── package.json
└── .env.example            <- copy to .env for local dev
```

---

## 2. Run it locally first (recommended before deploying)

1. Install [Node.js](https://nodejs.org) (v18+) if you don't have it.
2. Get a MySQL database running — either local (XAMPP/MySQL Workbench) or a free cloud one (see step 3 below; you can use the same one for local testing).
3. In the project folder:
   ```bash
   npm install
   cp .env.example .env
   ```
4. Edit `.env` with your database details and a random `JWT_SECRET` (any long random string works).
5. Import `database.sql` into your database (via phpMyAdmin, MySQL Workbench, or `mysql -u root -p yourdb < database.sql`).
6. Start it:
   ```bash
   npm start
   ```
7. Visit `http://localhost:3000` for the site and `http://localhost:3000/admin/login` for the admin panel.

   Default login: `admin` / `Admin@123` — change it immediately from **Change Password** in the sidebar.

---

## 3. Get a free cloud MySQL database (required for Vercel)

Pick one — all have free tiers that work well with Vercel:

- **[Railway](https://railway.app)** — click New Project → Database → Add MySQL. Gives you host/user/password/database instantly.
- **[Aiven](https://aiven.io)** — free MySQL plan, good for small projects.
- **[PlanetScale](https://planetscale.com)** — MySQL-compatible (note: some PlanetScale plans use a serverless driver instead of standard MySQL protocol — check their Node.js connection docs if you pick this one).

Once you have one, import `database.sql` into it (most of these give you a web console or connection string you can use with any MySQL client, e.g. TablePlus, DBeaver, or MySQL Workbench).

---

## 4. Push to GitHub

```bash
cd softskill-node
git init
git add .
git commit -m "Initial commit - Node/Express version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

`.env` is already in `.gitignore` so your real credentials never get committed — only `.env.example` (with placeholder values) goes to GitHub.

---

## 5. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up/log in with GitHub.
2. Click **Add New** → **Project** → import your GitHub repo.
3. Vercel auto-detects `vercel.json` and the Node entry point — you don't need to change any build settings.
4. Before clicking Deploy, open **Environment Variables** and add every value from your `.env` file:
   ```
   DB_HOST=...
   DB_PORT=3306
   DB_NAME=...
   DB_USER=...
   DB_PASS=...
   JWT_SECRET=...
   WHATSAPP_NUMBER=919852525294
   ```
   If your database provider requires SSL (most cloud MySQL providers do), also add:
   ```
   DB_SSL=true
   ```
5. Click **Deploy**. Vercel gives you a live URL like `yourapp.vercel.app` within a minute or two.
6. Visit `yourapp.vercel.app` for the site, and `yourapp.vercel.app/admin/login` for the admin panel.

Every time you `git push` to `main` from now on, Vercel automatically redeploys the latest version — that's the "push to GitHub → goes live" workflow you were after.

---

## 6. Using the Admin Panel

Identical to the PHP version:

- **Courses** — add/edit/delete, organized by category, with Featured/Visible toggles.
- **Certificates** — upload an `.xlsx` or `.csv` file (first row = headers: `roll_no, student_name, course_name, duration, grade, issue_date, father_name, extra_info`). Re-uploading the same roll number updates that record instead of duplicating it.
- **Messages** — view/delete contact form submissions, reply via WhatsApp with one click.
- **Change Password** — do this first, before anything else.

Visitors verify certificates at `yourapp.vercel.app/#verify`.

---

## 7. Known limitation: WhatsApp auto-send

Same as the PHP version — this opens WhatsApp with the message pre-filled, but the visitor still needs to tap **Send** (a browser can't silently send WhatsApp messages without the user's tap). Fully invisible automatic sending requires the paid WhatsApp Business Cloud API, which is a separate integration.

## 8. Known limitation: xlsx package security advisories

The `xlsx` (SheetJS) npm package has a couple of open security advisories with no patched version currently published to the public npm registry. Since certificate uploads require an authenticated admin login, the practical risk is low (an attacker would already need your admin password), but if you want to eliminate it entirely, you can swap in the `exceljs` package instead — ask and this can be done as a follow-up change.

---

## 9. What was tested before delivery

- All JS files pass `node --check` syntax validation.
- Homepage renders dynamic courses correctly from the database.
- `/api/contact` saves to DB and returns a working WhatsApp link.
- `/api/verify-certificate` correctly finds/rejects roll numbers.
- Admin login (JWT cookie), dashboard, and course add via the real running server.
- Excel (.xlsx) upload parses and stores certificate records correctly, confirmed via the public verify endpoint.
