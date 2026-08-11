# Release Guide

Master Canvas can be distributed as a Tauri desktop app through GitHub Releases.

## Quick Local Release Build

```bash
npm install
npm run tauri:installer
```

For MSI validation/builds on Windows, use:

```bash
npm run tauri:msi
```

Artifacts are created under `src-tauri/target/release/bundle/`.

## Important Signing Reality

Double-click app behavior has two levels:

1. **Unsigned local/test build:** works as a real desktop app, but macOS/Windows may show a security warning on first launch.
2. **Signed public build:** opens with the normal polished experience and fewer security prompts.

For public macOS releases, use an Apple Developer ID and notarization. For public Windows releases, use a code-signing certificate.

## GitHub Release Checklist

1. Update the version in `package.json` and `src-tauri/Cargo.toml`.
2. Run `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.
3. Build the installer with `npm run tauri:installer` or `npm run tauri:msi`.
4. Run the matching installer smoke script, for example `npm run smoke:installer:nsis` after generating an NSIS bundle.
5. Test first launch, file associations, local project read/write, and uninstall cleanup.
6. Upload installer artifacts from `src-tauri/target/release/bundle/` to a GitHub Release.
7. Include notes that the app is local-first and stores data on the user's computer.

## Recommended Future Automation

Add GitHub Actions release workflows after signing credentials are ready. Unsigned CI builds are possible, but signed releases are better for non-technical users.
