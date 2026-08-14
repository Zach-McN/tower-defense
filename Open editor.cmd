@echo off
rem generatedBy: claude-opus-5
rem generatedAt: 2026-08-14
rem
rem Opens this folder in the kernel-2d editor. Double-click it.
rem
rem Written by the editor, not by hand. If this folder or the editor moves,
rem run this from the kernel-2d folder and this file is rewritten:
rem
rem   npm run launcher -- <path-to-this-folder>

setlocal

rem This file, with the trailing slash cut off: the folder it is sitting in.
set "GAME=%~dp0"
set "GAME=%GAME:~0,-1%"
set "KERNEL=%GAME%\..\..\kernel-2d"

if not exist "%KERNEL%\package.json" (
  echo Could not find the editor.
  echo It should be here: %KERNEL%
  echo.
  echo If the editor folder moved, open a terminal in it and run:
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
