@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0.build\toolchain\node-v24.22.2-win-x64\node.exe" set "PATH=%~dp0.build\toolchain\node-v24.22.2-win-x64;%PATH%"
where npm.cmd >nul 2>nul
if errorlevel 1 (
 echo Node.js est necessaire pour fabriquer une nouvelle version du jeu.
 pause
 exit /b 1
)
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto failed
call npm.cmd test
if errorlevel 1 goto failed
call npm.cmd version patch --no-git-tag-version
if errorlevel 1 goto failed
call npm.cmd run dist:win
if errorlevel 1 goto failed
echo.
echo Nouvelle version disponible dans release-final.
echo Le nettoyage des anciennes versions est automatique apres verification.
echo Les anciens fichiers bloques sont signales et leur suppression sera retentee au prochain build reussi.
echo Le jeu installe detectera cette version, puis l'installera a sa fermeture.
pause
exit /b 0
:failed
echo.
echo La fabrication a echoue. Le precedent installateur reste disponible.
pause
exit /b 1
