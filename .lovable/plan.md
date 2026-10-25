# Remove dark mode completely

The app will always show the light look, on every phone and computer, whatever the device setting or anything saved before.

## What changes for members
- The Light / Dark / System choice disappears from Settings.
- Anyone who had dark mode on sees the light look next time they open the app.
- The launch screen and phone status-bar colour are always light.

## Technical details
- `index.html`: early theme script always adds `light`, never `dark`; drop the dark `theme-color` meta, `html.dark` splash/background rules and the `prefers-color-scheme: dark` block.
- `src/App.tsx`, `src/components/Layout.tsx`, `UnifiedThemeSettings.tsx`, `ThemeSettings.tsx`: theme logic forces light and removes any `dark` class; ignore saved `theme` values.
- Settings UI (`UserSettingsPage.tsx`, `UnifiedThemeSettings.tsx`, `UserPreferencesForm.tsx`): remove the theme picker; keep other options (colour themes, font size, etc.).
- Leave existing `dark:` utility classes in place (harmless without the `dark` class) to avoid touching hundreds of files; optionally drop the `.dark` token block in `src/index.css`.
- Save to project memory: dark mode is removed and must not be re-added.
