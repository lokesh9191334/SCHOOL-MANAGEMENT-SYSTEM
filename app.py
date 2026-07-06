#!/usr/bin/env python3
"""
School Management System - launcher (this repo is Node.js + React, not a Python web app).

Usage (project root):
  python app.py          -> installs deps if needed, runs Vite dev server (http://localhost:5173)
  python app.py build    -> npm run build
  python app.py start    -> production: build + node server.js (http://localhost:5000)

Requires: Node.js + npm on PATH (https://nodejs.org/)
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)


def run(cmd: str) -> int:
    """Run shell command; on Windows use shell for npm.cmd resolution."""
    shell = sys.platform == "win32"
    return subprocess.call(cmd, shell=shell, cwd=ROOT)


def main() -> None:
    if not shutil.which("npm"):
        print(
            "\n[ERROR] npm not found. Install Node.js LTS from https://nodejs.org/\n"
            "Then reopen the terminal and run: python app.py\n"
        )
        sys.exit(1)

    mode = (sys.argv[1] if len(sys.argv) > 1 else "dev").lower()

    if not os.path.isdir(os.path.join(ROOT, "node_modules")):
        print("[info] node_modules missing - running npm install ...")
        if run("npm install") != 0:
            print("[ERROR] npm install failed.")
            sys.exit(1)

    if mode in ("dev", "development", "serve"):
        print("[info] Starting Vite dev server at http://localhost:5173\n")
        sys.exit(run("npm run dev"))
    if mode == "build":
        sys.exit(run("npm run build"))
    if mode in ("start", "prod", "production"):
        print("[info] Building frontend ...")
        if run("npm run build") != 0:
            sys.exit(1)
        print("[info] Starting Express at http://localhost:5000\n")
        sys.exit(run("npm start"))
    if mode in ("-h", "--help", "help"):
        print(__doc__)
        sys.exit(0)

    print(f"[ERROR] Unknown command: {mode}\nUse: python app.py  |  python app.py build  |  python app.py start")
    sys.exit(1)


if __name__ == "__main__":
    main()
