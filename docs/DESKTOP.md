# Desktop Packaging

Master Canvas uses Tauri for desktop packaging and Vite for the renderer build.

## Local Desktop Run

```bash
npm install
npm run tauri:dev
```

This starts Vite and opens the app in a Tauri desktop window.

## Renderer Build

```bash
npm run build
```

This creates the web renderer output in `dist/` for browser hosting or Tauri packaging.

## Desktop Build

```bash
npm run tauri:build
```

This runs `vite build` and then `tauri build --no-bundle`, producing a local desktop binary without an installer bundle.

## Installers

```bash
npm run tauri:installer
npm run tauri:msi
```

Installer artifacts are written under `src-tauri/target/release/bundle/`. The current Windows-oriented scripts cover NSIS and MSI smoke validation.

## Signing

Unsigned local/test builds work as desktop apps, but macOS/Windows may show first-launch security warnings. Public releases should be signed and notarized or code-signed with the relevant platform credentials.

## File Associations

The Tauri bundle registers `.mastercanvas` and `.mcproject` project files. On Windows, `scripts/installer-smoke.ps1` validates first launch, file association launch, writable app/project directories, and uninstall cleanup for generated installers.

## Data Storage

The desktop app stores project data locally in the browser/Tauri runtime and in user-selected project files. Nothing is uploaded to a server.
