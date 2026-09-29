@echo off
title Telegram Bypass Bot
setlocal enabledelayedexpansion

:: Add Node.js to session PATH in case the terminal session doesn't have it yet
set "PATH=%PATH%;C:\Users\arch\AppData\Local\Programs\nodejs;%LOCALAPPDATA%\Programs\nodejs"

cd /d "%~dp0"

echo ============================================================
echo               TELEGRAM LINK BYPASS BOT
echo ============================================================
echo.
echo Starting bot in background polling mode...
echo Press Ctrl+C to stop the bot at any time.
echo.

node bot.js

echo.
echo Bot stopped.
pause
