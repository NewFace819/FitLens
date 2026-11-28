# FitLens app icon

The Android launcher icon and launch logo (issue #44), made from the team's own mascot:
the "happy" face from `prototype/assets/mascot/happy.svg`, cream on the forest green used in
`prototype/assets/branding/`. No outside assets.

| File | What it is |
| --- | --- |
| `fitlens-icon.svg` | The full icon (rounded square), for slides and docs |
| `fitlens-icon-foreground.svg` | The face alone on a 108 × 108 adaptive-icon canvas |
| `render.cjs` | Writes every PNG under `mobile/android/app/src/main/res/` |

Regenerate after changing the artwork (needs Playwright with Chromium):

```sh
node design/app-icon/render.cjs
```

It writes, for each density from mdpi to xxxhdpi:

- `mipmap-*/ic_launcher.png` and `ic_launcher_round.png`: legacy icons, used by Android 7.
- `mipmap-*/ic_launcher_foreground.png`: the adaptive-icon face. `mipmap-anydpi-v26/*.xml`
  puts it on `@color/ic_launcher_background`, and reuses it as the Android 13 monochrome layer.
- `drawable-*/launch_logo.png`: the logo in the middle of the launch screen.

The launch screen: `LaunchTheme` (manifest) shows `drawable/launch_screen.xml` on the app's
background colour on Android 7–11. Android 12+ draws its own splash with the launcher icon,
coloured by `values-v31/styles.xml`. `MainActivity` switches back to `AppTheme` in `onCreate`.

Changes to the face should stay inside the 66 dp safe circle of the foreground canvas, or
launchers that mask the icon as a circle will cut the eyes off.
