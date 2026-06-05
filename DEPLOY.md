# Deploying Comp

Comp is a **static site** (Vite build → `dist/`). There's no backend, so hosting is free —
the only recurring cost is the domain (~$10–13/year). The one hard requirement is **HTTPS**,
because the Web MIDI API refuses to run on insecure origins. Cloudflare Pages gives you HTTPS
automatically.

Everything below is one-time setup. After it's wired up, you just `git push` and the site
redeploys itself.

---

## 1. Put the code on GitHub

```bash
git init
git add -A
git commit -m "Comp — initial commit"
```

Then connect the GitHub repo and push:

```bash
git remote add origin https://github.com/thepatrat/jazz-piano.git
git branch -M main
git push -u origin main
```

## 2. Deploy on Cloudflare Pages

1. Sign up / log in at <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**.
2. Authorise GitHub and pick the repo.
3. Build settings:
   - **Framework preset:** Vite (or "None")
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Node version is pinned by the repo's `.nvmrc` (20); nothing to set.
4. **Save and Deploy.** In ~1 minute you get a live URL like `comp-xyz.pages.dev` (already
   HTTPS). Every push to `main` redeploys automatically.

> The repo's `public/_headers` adds long-term caching for fingerprinted assets — it's copied
> into `dist/` on build, no action needed.

## 3. Buy a domain & connect it

Cheapest is **Cloudflare Registrar** (sells at cost):

1. Cloudflare dashboard → **Domain Registration** → **Register Domain** → search & buy
   (e.g. `comptrainer.com`). ~$10–13/yr for a `.com`.
2. In your Pages project → **Custom domains** → **Set up a domain** → enter your domain.
   Because the domain is already in your Cloudflare account, DNS records are added
   automatically and HTTPS is issued in a couple of minutes.

(Using Namecheap/Porkbun instead works too — you'd add the CNAME/records Cloudflare shows you.)

## 4. Donate button (Ko-fi)

1. Create a page at <https://ko-fi.com> (free; 0% platform fee on one-time tips — only the
   payment processor's ~3% applies). Pick a handle, e.g. `ko-fi.com/comptrainer`.
2. Edit [`index.html`](index.html): replace `YOUR_HANDLE` in the footer link
   `https://ko-fi.com/YOUR_HANDLE` with your real handle.
3. Commit & push — the button goes live on the next deploy.

---

## Updating the site later

```bash
git add -A
git commit -m "..."
git push          # Cloudflare Pages rebuilds & redeploys in ~1 min
```

## Notes

- **No data leaves the browser.** Progress (SRS schedules, drill stats, exercise position)
  lives in the visitor's own IndexedDB. Nothing to store server-side, nothing to back up.
- **Browser support:** Web MIDI works in Chrome / Edge / Opera. Safari/Firefox visitors can
  still read the Theory and Circle sections, but won't get live note input.
- **Analytics (optional):** Cloudflare Pages → your project → enable **Web Analytics** for a
  free, privacy-friendly visit counter (no cookies).
