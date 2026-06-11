@echo off
rem ── Host Regicide at https://regicide.llgames.ca ────────────────────────────
rem Double-click this. Two windows open: the game server and the Cloudflare
rem tunnel. Close them to take the game offline. (The server also serves the
rem built client — run "npm run build" in client/ after UI changes.)

start "regicide-server" cmd /k "cd /d %~dp0 && npm run dev:server"
start "regicide-tunnel" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run regicide"
