# AGENTS.md

This document constrains AI and automation work in this app. Before editing, read `README.md`, `package.json` scripts, and `src-tauri/` configuration, then follow the existing structure with minimal, focused changes.

## Basic Rules

- Read existing code before changing it; do not perform unrelated refactors.
- Tauri commands, capabilities, filesystem access, external processes, project files, and installers are high-risk boundaries and require focused verification.
- After each change, run the smallest relevant automated check. If a check cannot run, document the reason and alternative evidence.

## OpenCodeReview Workflow

- For PR, branch, or workspace code review, prefer OpenCodeReview delegation mode: run `ocr delegate preview --format json --background "<business context>"` first, then run `ocr delegate rule --format json <files...>` for the files under review.
- This app uses a Rust/Tauri-specific `.opencodereview/rule.json`; focus review on `src-tauri/` commands, capabilities, Tauri config, renderer bridge contracts, scripts, packaging, and local file/media boundaries.
- OCR is used for deterministic file selection, include/exclude handling, and rule resolution only. The active reviewer/model still makes the actual defect judgment; do not default to OCR LLM mode as a substitute for review.
- Review output must account for every `reviewable_files` entry from preview. If a file is skipped, record the reason. Changes touching Tauri permissions, filesystem access, external processes, signing/installers, project-file migrations, or user-data writes require extra scrutiny.
- After editing `.opencodereview/rule.json`, verify representative rule matching with `ocr rules check <representative file>`.
