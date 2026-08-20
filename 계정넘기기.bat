@echo off
chcp 65001 >nul
set /p OWNER=받을 GitHub 아이디:
if "%OWNER%"=="" (
  echo 아이디가 비어 있습니다.
  pause
  exit /b 1
)
powershell -ExecutionPolicy Bypass -File "%~dp0계정넘기기.ps1" -NewOwner "%OWNER%"
pause
