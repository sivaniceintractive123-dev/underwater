@echo off
title Pushing The Sea We Breathe to GitHub
color 0b
echo ===================================================================
echo   PUSHING TO GITHUB:
echo   Repo: https://github.com/sivaniceintractive123-dev/underwater.git
echo ===================================================================
echo.
echo   - 300 Full-HD frames + HTML/CSS/JS files (~468 MB)
echo   - Please wait 2-5 minutes while uploading...
echo.
echo   * If GitHub asks for credentials, enter your GitHub Username
echo     and Personal Access Token (or Sign in via Browser).
echo.
echo ===================================================================
echo.

set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
cd /d "%~dp0"

git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo   [SUCCESS] Successfully pushed all files to GitHub!
    echo   View your repository at:
    echo   https://github.com/sivaniceintractive123-dev/underwater
    echo ===================================================================
) else (
    echo ===================================================================
    echo   [NOTICE] If push stopped or asked for login:
    echo   Please use your GitHub Personal Access Token (PAT) as the password,
    echo   or push directly via VS Code's Source Control tab!
    echo ===================================================================
)

echo.
pause
