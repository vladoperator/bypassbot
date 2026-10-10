# ⚡ Telegram Link Bypass Bot v2.1

A high-performance Telegram bot powered by the **Bypass.vip Premium API** with an intelligent **Multi-Hop Recursive Engine** that automatically follows nested link shorteners, pastebins, and redirects until it finds your direct **Mega.nz** link, with full chat cleanup support.

Supports running locally via **long-polling** or 24/7 in the cloud on **Vercel** via **Serverless Webhooks**!

---

## ☁️ How to Deploy 24/7 on Vercel (Free Serverless)

### Step 1: Push Project to GitHub
1. Create a new repository on [github.com](https://github.com).
2. In your terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New" ➔ "Project"**.
2. Select your GitHub repository.
3. In **Environment Variables**, add:
   - `BOT_TOKEN`: `YOUR_TELEGRAM_BOT_TOKEN_HERE`
   - `BYPASS_API_KEY`: `YOUR_BYPASS_VIP_API_KEY_HERE`
   - `BYPASS_BASE_URL`: `https://api.bypass.vip/premium`
4. Click **Deploy**.

### Step 3: Link Webhook to Telegram
Once deployed, copy your Vercel URL (e.g. `https://my-bypass-bot.vercel.app`) and run:
```bash
node set_webhook.js https://my-bypass-bot.vercel.app
```
🎉 Your bot is now running 24/7 on Vercel for free without needing your PC on!

*(If you ever want to run it locally again on your PC, simply run: `node set_webhook.js delete`)*

---

## 📋 All Available Commands

| Command | Description |
| :--- | :--- |
| **`/mega <link>`** | **Auto-Bypass to Mega.nz:** Follows all redirects/hops across multiple shorteners and pastebins until the direct `mega.nz` link is reached. |
| **`/clear`** | **Delete All Bypasses & Messages:** Sweeps and deletes all previous bypass requests, intermediate messages, and bot replies to keep your chat clean. |
| **`/mode`** | **Toggle Auto-Mega Mode:** Switches default behavior between Standard (single hop with buttons) and Auto-Mega (every pasted link resolves all the way to Mega.nz automatically). |
| **`/bypass <link>`** | **Single-Hop Bypass:** Bypasses a single link using the premium database cache. |
| **`/refresh <link>`** | **Force Fresh Bypass:** Bypasses a link skipping previously cached database entries. |
| **`/status`** | **Health Check:** Shows bot uptime, roundtrip ping, and Bypass.vip API connectivity. |
| **`/help`** | **Command Reference:** Displays full usage instructions and examples. |
| **`/start`** | **Welcome & Guide:** Quick start guide and supported site listing. |

---

## ⚡ How to Run Locally

- **Start on Windows:** Double-click [`start.bat`](file:///c:/Users/arch/Documents/bypass/start.bat)
- **Manual Launch:** Run `node bot.js`
- **Live Web Dashboard:** Visit `http://localhost:3000/links` (or `https://YOUR-APP.vercel.app/links`) to view real-time bypassed links, speeds, and user handles.
