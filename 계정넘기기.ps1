# 사용법:
#   .\계정넘기기.ps1 -NewOwner 받을아이디
#   .\계정넘기기.ps1 -NewOwner 받을아이디 -InviteAdminOnly
#
# 소유권을 넘기면 상대 GitHub 계정에 수락 요청이 갑니다. (보통 하루 안에 수락)
# 비번은 이 스크립트에 넣지 마세요. GitHub 로그인은 gh auth login 화면에서 합니다.

param(
  [Parameter(Mandatory = $true)]
  [string]$NewOwner,
  [switch]$InviteAdminOnly
)

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;" + $env:Path
$Repo = "NonsenseMaker-1/food-mall"

function Has-Cmd($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Has-Cmd gh)) {
  Write-Host "GitHub CLI가 없습니다. 설치 후 창을 다시 여세요:"
  Write-Host "  winget install --id GitHub.cli -e --source winget"
  exit 1
}

$auth = gh auth status 2>&1 | Out-String
if ($auth -notmatch "Logged in") {
  Write-Host "GitHub 로그인이 필요합니다. 브라우저에서 직접 로그인하세요."
  gh auth login
}

$NewOwner = $NewOwner.Trim().TrimStart("@")
if (-not $NewOwner) {
  Write-Host "받을 GitHub 아이디를 넣어 주세요."
  exit 1
}

$me = gh api user --jq .login
if ($me -eq $NewOwner) {
  Write-Host "지금 로그인된 계정($me)과 받을 계정이 같습니다."
  exit 1
}

try {
  $target = gh api "users/$NewOwner" --jq .login
} catch {
  Write-Host "GitHub에 '$NewOwner' 계정이 없습니다. 아이디를 다시 확인해 주세요."
  exit 1
}

Write-Host "받을 계정: $target"
Write-Host "저장소: https://github.com/$Repo"
Write-Host ""

if ($InviteAdminOnly) {
  gh api -X PUT "repos/$Repo/collaborators/$target" -f permission=admin | Out-Null
  Write-Host "관리자 초대를 보냈습니다. $target 계정이 GitHub 알림에서 수락하면 같이 관리할 수 있습니다."
  Write-Host "소유권까지 넘기려면 이 스크립트에서 -InviteAdminOnly 없이 다시 실행하세요."
  exit 0
}

$ErrorActionPreference = "Continue"
$raw = gh api -X POST "repos/$Repo/transfer" -f new_owner="$target" 2>&1
$code = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($code -eq 0) {
  Write-Host "소유권 이전 요청을 보냈습니다."
  Write-Host "$target 계정으로 GitHub에 로그인한 뒤, 메일 또는 알림에서 수락하세요."
  Write-Host "수락하면 주소가 https://github.com/$target/food-mall 로 바뀝니다."
  Write-Host "그다음 Vercel → 프로젝트 → Settings → Git 에서 새 저장소를 다시 연결하세요."
  exit 0
}

Write-Host "자동 이전 API가 막혔습니다. 관리자 초대로 넘깁니다."
Write-Host $raw
gh api -X PUT "repos/$Repo/collaborators/$target" -f permission=admin | Out-Null
Write-Host ""
Write-Host "관리자 초대를 보냈습니다. $target 이 수락하면 저장소를 같이 관리할 수 있습니다."
Write-Host "소유권 화면: https://github.com/$Repo/settings/transfer"
Write-Host "그 페이지에 $target 을 넣고 Transfer 하면 됩니다."
exit 1
