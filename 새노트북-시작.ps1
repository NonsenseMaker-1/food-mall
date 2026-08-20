# 다른 노트북에서 food-mall 폴더를 연 뒤 이 스크립트를 실행하세요.
# GitHub 비번은 채팅이 아니라 gh auth login 화면에 입력합니다.

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;" + $env:Path

Write-Host "=== 회사 홈페이지 이전 점검 ==="
Write-Host ""

function Has-Cmd($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Has-Cmd git)) {
  Write-Host "Git이 없습니다. 설치 후 창을 다시 여세요:"
  Write-Host "  winget install --id Git.Git -e --source winget"
  exit 1
}
Write-Host "Git: OK"

$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0 -or -not $remote) {
  Write-Host "이 폴더는 Git 저장소가 아닙니다. 아래를 실행하세요:"
  Write-Host "  git clone https://github.com/NonsenseMaker-1/food-mall.git"
  exit 1
}
Write-Host "저장소: $remote"

if (-not (Has-Cmd gh)) {
  Write-Host "GitHub CLI가 없습니다. 설치 후 창을 다시 여세요:"
  Write-Host "  winget install --id GitHub.cli -e --source winget"
  Write-Host "그다음: gh auth login"
  exit 1
}

$auth = gh auth status 2>&1 | Out-String
if ($auth -match "Logged in") {
  Write-Host "GitHub 로그인: OK"
} else {
  Write-Host "GitHub에 아직 로그인되어 있지 않습니다."
  Write-Host "브라우저가 열리면 GitHub에서 직접 로그인하세요. 비번은 채팅에 치지 마세요."
  gh auth login
}

if (-not (Test-Path (Join-Path $PSScriptRoot "admin-pass.txt"))) {
  Set-Content -Path (Join-Path $PSScriptRoot "admin-pass.txt") -Value "admin" -Encoding ascii
  Write-Host "admin-pass.txt 를 만들었습니다. 로컬 미리보기용이며 GitHub에는 올라가지 않습니다."
}

Write-Host ""
Write-Host "준비 끝. 공개 사이트:"
Write-Host "  https://temporary-instant-poplar-2ji4sna.vercel.app"
Write-Host "고친 뒤 올리기:"
Write-Host "  git add ."
Write-Host "  git commit -m `"사이트 수정`""
Write-Host "  git push origin main"
