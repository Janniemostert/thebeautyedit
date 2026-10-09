# EJ Edit — Project Summary

## Overview

A Next.js 14 creator portfolio for photo and video work. Images are uploaded to Cloudinary, videos are linked (YouTube / Vimeo embed), visitors sign in with Google, and an admin panel manages users and work. Forked from the Olive Foodie project and re-themed as a dark creator site.

- **Live URL**: _(set after first Netlify deploy, e.g. https://ejedit.netlify.app)_
- **GitHub**: _(create a new repo and add the remote)_
- **Framework**: Next.js 14 (App Router)
- **Deployment**: Netlify (`@netlify/plugin-nextjs`)

---

## Tech Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Frontend   | Next.js 14 App Router, CSS Modules |
| Auth       | NextAuth v4, Google OAuth provider |
| Database   | MongoDB Atlas (via Mongoose)       |
| Images     | Cloudinary (folder `ej-edit/work`) |
| Video      | YouTube / Vimeo links, embedded    |
| Deployment | Netlify                            |

---

## Theme

Dark creator theme. All colours live as CSS variables in `app/globals.css`:

| Token          | Hex       | Use                     |
| -------------- | --------- | ----------------------- |
| `--bg`         | `#0b0b0d` | Page background         |
| `--surface`    | `#141418` | Cards, header, footer   |
| `--surface-2`  | `#1c1c23` | Inputs, hover states    |
| `--border`     | `#2a2a33` | Borders                 |
| `--text`       | `#f3f3f5` | Body text               |
| `--muted`      | `#9a9aa6` | Secondary text          |
| `--accent`     | `#8b5cf6` | Violet accent           |
| `--accent-2`   | `#ec4899` | Pink accent             |
| `--gradient`   | violet → pink | Buttons, logo mark  |

Fonts: **Space Grotesk** (headings) + **Inter** (body), from Google Fonts.
Branding, tagline, contact email and social links are in `lib/site.js`.

---

## Environment Variables

Set in Netlify → Environment Variables and locally in `.env.local`:

```
MONGODB_URI=           # MongoDB Atlas connection string (database: ej-edit)
CLOUDNAME=             # Cloudinary cloud name
CLOUDAPIKEY=           # Cloudinary API key
CLOUDINARYSECRET=      # Cloudinary API secret
GOOGLE_CLIENT_ID=      # Google OAuth client ID
GOOGLE_CLIENT_SECRET=  # Google OAuth client secret
NEXTAUTH_SECRET=       # Random secret string (32+ chars)
NEXTAUTH_URL=          # http://localhost:3000 locally / https://<site>.netlify.app on Netlify
ADMIN_EMAILS=          # Comma-separated list of admin Gmail addresses
```

The local `.env.local` was copied from Olive Foodie with the database name changed to `ej-edit`. The same Cloudinary account is used; uploads go to a separate `ej-edit/work` folder.

---

## Content Model: Work

Stored in the `works` collection (`lib/models/Work.js`):

| Field              | Notes                                                        |
| ------------------ | ------------------------------------------------------------ |
| `title`, `slug`    | Slug is generated from the title and must be unique          |
| `type`             | `photo` or `video`                                           |
| `coverImage`       | Cloudinary URL. Falls back to first gallery image            |
| `images[]`         | Gallery images (Cloudinary URLs)                             |
| `videoLink`        | Required for `video` type. YouTube / Vimeo are embedded      |
| `description`      | Plain text (sanitised with `xss`, line breaks preserved)     |
| `tags[]`           | Comma separated in the form                                  |
| `featured`         | Shown first on the home page                                 |
| `isSubscriberOnly` | Members-only. Gated behind an approved account               |
| `status`           | `published` or `draft`. Admins can preview drafts            |

---

## Access & Admin

- Anyone can browse public work.
- Signing in with Google creates a `pending` user. Admins approve users at `/admin` (tiers are kept from the original project).
- `active` users and admins can comment and see members-only work.
- Admin role is assigned on first login if the Google email is in `ADMIN_EMAILS`. For an existing user, change `role` to `admin` in MongoDB Atlas.
- Admin pages: `/admin` (users), `/admin/work` (list, publish/draft and featured toggles), `/admin/work/new`, `/admin/work/[id]/edit`.

---

## Upload Limits

Images are sent through a Next.js server action. The body size limit is set to 10 MB in `next.config.js`, but Netlify functions cap request bodies at about 6 MB. Keep each save under roughly 4 MB of images in total; add more images in a second edit if needed.

---

## Key File Structure

```
app/
  layout.js                 # Root layout — Header + Footer + Providers
  page.js                   # Home: hero + featured work + about
  work/                     # All work listing + /work/[slug] detail
  photos/, videos/          # Filtered listings
  admin/                    # Users + work management (role-protected)
  auth/signin/              # Google sign-in page
  pending/                  # Pending / suspended account page
  api/auth/[...nextauth]    # NextAuth route
  components/
    header/                 # Sticky header, nav, auth bar, mobile menu
    footer/                 # Footer with social links
    work/                   # WorkCard, WorkListing, Gallery (lightbox), VideoEmbed
    comments/               # Comments component
lib/
  site.js                   # Branding, tagline, contact, socials
  video.js                  # YouTube / Vimeo embed + thumbnail helpers
  work.js                   # Read helpers (getPublishedWork, getWorkBySlug, getViewer)
  workActions.js            # Create / update / delete / toggle server actions (Cloudinary)
  adminActions.js           # User approval / status actions
  commentActions.js         # Comment server actions
  db.js                     # MongoDB connection
  models/                   # Mongoose models: User, Work, Comment
```

---

## Google OAuth Setup (required for the new domain)

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → the OAuth client used by `GOOGLE_CLIENT_ID`:

Add to **Authorised JavaScript origins**:

```
https://<site>.netlify.app
```

Add to **Authorised redirect URIs**:

```
https://<site>.netlify.app/api/auth/callback/google
```

`http://localhost:3000` and `http://localhost:3000/api/auth/callback/google` are needed for local development (already present if the Olive Foodie client is reused).

---

## Local Development

```bash
npm install
npm run dev     # http://localhost:3000
```

Requires `.env.local` with all variables above.

---

## Deploying to Netlify

1. Push the repo to GitHub.
2. Netlify → Add new site → Import from Git → pick the repo. The build settings come from `netlify.toml`.
3. Add all environment variables above, with `NEXTAUTH_URL` set to the Netlify URL.
4. Add the Netlify URL to the Google OAuth client (see above).

Netlify auto-deploys on every push to `main`.
