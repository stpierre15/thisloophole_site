Loophole API proxy (Cloudflare Worker)
======================================

Why the site broke
------------------
1. fetch() needs a full URL: https://your-worker.workers.dev (not just the hostname).
2. Your Worker was still returning plain "Hello World!" instead of calling Anthropic, so the page could not parse JSON or read data.content.

Deploy (fixes production)
-------------------------
1. Install: npm i -g wrangler   OR   cd worker && npm init -y && npm i wrangler
2. Login: npx wrangler login
3. From the worker folder:
     npx wrangler deploy
4. Set your Anthropic API key (never commit it). Use a key from https://console.anthropic.com/ — it must start with sk-ant-api03- or sk-ant-.
     npx wrangler secret put ANTHROPIC_API_KEY
   Paste the key once; no quotes. If you see "invalid x-api-key" in the app, the secret is wrong for this Worker: remove it and add it again, or set it in the Cloudflare dashboard under the same worker name you deployed.
5. In index.html, set PROXY_URL to https://<your-worker-name>.<your-subdomain>.workers.dev

Local preview
-------------
  cd worker && npx wrangler dev
Then temporarily point PROXY_URL in index.html to the URL wrangler prints (or use a local static server and CORS is already * on the worker).
