# Trail Maps NZ

A responsive static website for selling 3D printed trail maps of New Zealand's Great Walks.

## Pages

- Home
- Store with 9 featured trail maps plus a custom GPX route
- About us
- Contact us

## Cart

The store page includes a browser-based cart that saves to local storage and keeps quantities while you browse.

## Checkout

The checkout button now posts the cart to a local endpoint at `/checkout`. If Stripe credentials are configured, the server creates a real Stripe Checkout session; otherwise, it returns a local fallback message so the storefront remains usable during development.

Set these environment variables before launching the server:

- `STRIPE_SECRET_KEY`
- `STRIPE_SUCCESS_URL` (optional)
- `STRIPE_CANCEL_URL` (optional)
- `RESEND_API_KEY`
- `RESEND_FROM` (optional)
- `CONTACT_TO_EMAIL` (optional)

You can place them in a local `.env` file in the project root. The server reads that file automatically when it starts.

## Contact form email delivery

The contact form now sends real email messages through Resend when the following environment variables are available:

- `RESEND_API_KEY`
- `RESEND_FROM`
- `CONTACT_TO_EMAIL` (optional, defaults to hello@trailmapsnz.co.nz)

To test locally, run:

```bash
C:/Python313/python.exe server.py
```

Then open http://127.0.0.1:8000/ in your browser.

## Security notes

- Prices are set on the server (`PRICE_LIST` in `server.py`), not taken from the browser. Keep them in sync with `catalogProducts` / `customRouteSizes` in `script.js`.
- The server only answers POSTs from its own pages. If you host it on a real domain, set `ALLOWED_HOSTS` (e.g. `ALLOWED_HOSTS=trailmapsnz.co.nz`) or checkout and contact requests will be blocked.
- `/checkout` and `/contact` are rate limited per visitor, request bodies are size-capped, and the contact form has a hidden spam-trap field.
- Every page has a Content-Security-Policy `<meta>` tag. If you add a script, font or image from another site, add its domain to the policy in each HTML page and in `CONTENT_SECURITY_POLICY` in `server.py`.
- Never commit `.env`; it is listed in `.gitignore`.

## Deploy to GitHub Pages

This project deploys by publishing the site files to the `gh-pages` branch with the workflow in `.github/workflows/deploy.yml`.

1. Push the repository to GitHub.
2. In GitHub, open **Settings > Pages**.
3. Set **Build and deployment** to **Deploy from a branch**.
4. Choose the `gh-pages` branch and the `/ (root)` folder.
5. Push to `main` to trigger the workflow, or run it manually from the **Actions** tab.

After the workflow completes, open your site in a browser at:

`https://<your-github-username>.github.io/<your-repo-name>/`

If you use a GitHub organization, replace `<your-github-username>` with the org name.

## How to view locally

Open `index.html` in a browser, or use a local static server if you prefer.
