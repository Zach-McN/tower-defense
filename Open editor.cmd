@echo off
rem generatedBy: claude-opus-5
rem generatedAt: 2026-08-14
rem
rem Opens this folder in the kernel-2d editor. Double-click it.
rem
rem Written by the editor, not by hand. If this folder or the kernel-2d folder
rem moves, the location below is stale: ask Claude to refresh this launcher, or
rem run this from the kernel-2d folder yourself:
rem
rem   npm run launcher -- <path-to-this-folder>

setlocal

rem This file, with the trailing slash cut off: the folder it is sitting in.
set "GAME=%~dp0"
set "GAME=%GAME:~0,-1%"
set "KERNEL=%GAME%\..\..\kernel-2d"

if not exist "%KERNEL%\package.json" (
  echo Could not find the editor. It should be here:
  echo.
  echo     %KERNEL%
  echo.
  echo This folder or the kernel-2d folder has moved, so this launcher is
  echo pointing at the wrong place. Nothing is lost and nothing is broken.
  echo.
  echo   ASK CLAUDE TO REFRESH THIS LAUNCHER
  echo.
  echo and it will rewrite this file with the new location. Or do it yourself,
  echo from the kernel-2d folder:
  echo.
  echo     npm run launcher -- "%GAME%"
  echo.
  pause
  exit /b 1
)

title tower-defense - kernel-2d editor
echo Starting the editor on tower-defense.
echo Close this window to stop it.
echo.

cd /d "%KERNEL%"
call npm run editor -- "%GAME%"

rem A window that vanishes takes the reason with it, so anything that went
rem wrong waits to be read.
if errorlevel 1 (
  echo.
  echo The editor stopped without finishing. The message above says why.
  pause
)
