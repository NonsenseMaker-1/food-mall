"""Copy the site to an ASCII path and publish to the same Vercel URL."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKIP_NAMES = {
    "admin-pass.txt",
    "serve.py",
    "deploy.py",
    ".deploy-state.json",
}
SKIP_DIRS = {".netlify", ".vercel", "__pycache__"}
TEMP_NAME = "brand-home-site"


def copy_tree(dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for path in ROOT.rglob("*"):
        rel = path.relative_to(ROOT)
        if rel.parts and rel.parts[0] in SKIP_DIRS:
            continue
        if path.name in SKIP_NAMES:
            continue
        target = dest / rel
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    vercel = ROOT / ".vercel"
    if vercel.exists():
        shutil.copytree(vercel, dest / ".vercel", dirs_exist_ok=True)


def ascii_env() -> dict:
    env = os.environ.copy()
    env["COMPUTERNAME"] = "DESKTOP"
    env["USERDOMAIN"] = "DESKTOP"
    env["USERNAME"] = "user"
    env["USER"] = "user"
    return env


def run_cmd(cmd: str, dest: Path, env: dict) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=dest, check=False, shell=True, env=env)


def run_deploy(dest: Path, env: dict) -> subprocess.CompletedProcess:
    return run_cmd("npx --yes vercel@latest deploy --prod --yes --temporary", dest, env)


def remove_linked_project(dest: Path, env: dict) -> None:
    run_cmd("npx --yes vercel@latest remove --yes", dest, env)


def main() -> None:
    pub = Path(tempfile.gettempdir()) / "brand-home-pub"
    if pub.exists():
        shutil.rmtree(pub, ignore_errors=True)
    dest = Path(tempfile.gettempdir()) / TEMP_NAME
    copy_tree(dest)
    env = ascii_env()
    result = run_deploy(dest, env)
    if result.returncode != 0:
        remove_linked_project(dest, env)
        stale = dest / ".vercel"
        if stale.exists():
            shutil.rmtree(stale)
        root_vercel = ROOT / ".vercel"
        if root_vercel.exists():
            shutil.rmtree(root_vercel)
        result = run_deploy(dest, env)
    if result.returncode != 0:
        sys.exit(result.returncode)
    src_anon = dest / ".vercel" / "anonymous.json"
    if src_anon.exists():
        (ROOT / ".vercel").mkdir(exist_ok=True)
        shutil.copy2(src_anon, ROOT / ".vercel" / "anonymous.json")
        proj = dest / ".vercel" / "project.json"
        if proj.exists():
            shutil.copy2(proj, ROOT / ".vercel" / "project.json")


if __name__ == "__main__":
    main()
