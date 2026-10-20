# 86'd first-run screens: visual walkthrough (rendered screenshots + measurements)

Status: IN PROGRESS. Screenshots are being added one at a time; sections marked "(pending)" are not yet rendered.

Scope (narrowed by the coordinator on 2026-10-20 to save usage): iPhone 16 (393×852 pt) for every screen; iPhone SE (375×667 pt) only for the start screen and Register. Screenshots live in `screens/` next to this file. Code references are to commit 43c4757 of 86d-mobile (the code is unchanged by the later notes-only commit ae3f224).

## 1. What do the first-run screens look like on an iPhone?

### Takeaway
(pending — filled in once the renders are done)

### Cited Findings

#### The real first-run order (from the code, not from Onboarding.tsx)
- A signed-out user's first screen is the **Login** screen, not Register: `AppContent` starts with `currentScreen = 'camera'`, and for an unauthenticated user every value except `'register'`/`'forgot-password'` falls through to `<LoginScreen>`. Register is one tap away via the login screen's "Start Free Trial" button — [src/App.tsx L41, L121–146](../../src/App.tsx); [src/screens/LoginScreen.tsx L241–252](../../src/screens/LoginScreen.tsx)
- Order for an email sign-up: splash (paper-coloured `#f2ece4` card with the stamp logo, `resizeMode: contain`) → a dark "Loading..." screen while auth resolves → Login → Register → BarNameScreen (`onRegisterSuccess={() => navigate('bar-name')}`) → CameraScan, which always opens on its start screen (`showStartScreen` initialises to `true`) → the iOS camera dialog when "Start Scanning" is tapped → camera viewfinder → number pad after each shutter press — [app.json `splash`](../../app.json); [src/App.tsx L109–119, L125–131, L168–176](../../src/App.tsx); [src/screens/CameraScan.tsx L109, L253–265](../../src/screens/CameraScan.tsx)
- A Sign in with Apple user skips Register and goes to BarNameScreen only if Apple returned no `business_name` — [src/App.tsx L105–107](../../src/App.tsx)
- `src/screens/Onboarding.tsx` is **dead code**: it is defined (`export default function Onboarding`) but imported nowhere; the start screen inside CameraScan is the only onboarding that runs — repo-wide grep for `Onboarding` finds only its own definition ([src/screens/Onboarding.tsx L20](../../src/screens/Onboarding.tsx))
- The start screen's three steps and the camera heads-up appear only while nothing has been counted (`bottleCount === 0`); with bottles in the draft the same card reads "Continue Your Count" — [src/screens/CameraScan.tsx L944–982](../../src/screens/CameraScan.tsx)
- A brand-new trial is always entitled, so the paywall cannot appear during first run; it replaces the whole app only after the 15-day trial lapses — [src/App.tsx L149–154](../../src/App.tsx); [src/utils/entitlements.ts](../../src/utils/entitlements.ts)
- The trial banner shows only with ≤5 days left, so a new user never sees it — [src/App.tsx L216–221](../../src/App.tsx)

#### How the screenshots were made
- There is no iOS simulator here. Each screen is the REAL app bundle served by Expo web (Metro, `expo start --web`) and driven by headless Chromium (Playwright 1.56, Chromium build 1194), per the repo's `verify-ui` skill — [.claude/skills/verify-ui/SKILL.md](../../.claude/skills/verify-ui/SKILL.md)
- No source file was edited. Instead: the backend (`https://eight6d-api.onrender.com/v1/*`) was answered by fixtures inside the browser (Playwright `route`), signed-in sessions were seeded through localStorage (AsyncStorage's web backend stores keys verbatim), and every other outbound request (e.g. Sentry) was blocked — [node_modules/@react-native-async-storage/async-storage/lib/commonjs/AsyncStorage.js L63–69]; [src/config/api.ts](../../src/config/api.ts)
- iOS geometry was approximated in the served JavaScript, not in the repo: react-native-web's `SafeAreaView` pads with CSS `env(safe-area-inset-*)`, which is 0 in headless Chromium, so those four values were rewritten to the device's insets (iPhone 16: top 59 / bottom 34; iPhone SE: top 20 / bottom 0) — [react-native-web SafeAreaView source, node_modules/react-native-web/dist/exports/SafeAreaView/index.js]; insets: [Use Your Loaf, "iPhone 16 Screen Sizes" (2024-09-16)](https://useyourloaf.com/blog/iphone-16-screen-sizes/) (393×852 pt; portrait safe area top 59, bottom 34); SE's 20 pt status bar: [Codemia, status bar height on iOS 13+](https://codemia.io/knowledge-hub/path/how_to_get_the_status_bar_height_in_ios_13) (home-button iPhones return 20 pt) — the SE's bottom inset of 0 is an inference (it has a home button, no home indicator)
- Fonts: all text was forced to Inter, the closest installed stand-in for SF Pro (Linux has no SF Pro). This also matches iOS for the number pad: the app styles digits with `fontFamily: 'monospace'`, which iOS does not have, and React Native's iOS text code falls back to the system font for an unknown family — so on a phone those digits are SF Pro, not monospaced — [node_modules/react-native/ReactCommon/react/renderer/textlayoutmanager/platform/ios/react/renderer/textlayoutmanager/RCTFontUtils.mm, `RCTFontWithFontProperties`: "Failback to system font"; only `ui-monospace` maps to the monospaced design]; [src/screens/CameraScan.tsx L2049–2054, L2079–2084](../../src/screens/CameraScan.tsx)
- Pixel density matches the phones: iPhone 16 renders at 3×, iPhone SE at 2×, so the PNGs are 1179×2556 and 750×1334 px (the devices' native screenshot sizes).
- Camera: Chromium's fake webcam fed a synthetic portrait (720×1280) back-bar image with a labelled vodka bottle centred, so the viewfinder mask and guides can be judged against something like a shelf. It is a drawing, not a photo.

#### Screen-by-screen

**(1) CameraScan first-run start screen** — `showStartScreen`, nothing counted yet — [src/screens/CameraScan.tsx L898–998](../../src/screens/CameraScan.tsx)

- [`screens/01-start-iphone16.png`](screens/01-start-iphone16.png) (iPhone 16, 1179×2556 px). A near-black (`#0F0F0F`) screen. Top-left, just under the 59 pt status-bar area, a 40×40 pt dark-grey square holding a white hamburger icon (the only way to the rest of the app from here). The middle of the screen holds one `#1A1A1A` rounded card (24 pt radius, hairline border), 530 pt tall (y 190–720), with ~133 pt of empty black above and below it. Inside the card, top to bottom: a 72 pt red (`#C8283A`) rounded-square tile with a white camera outline and a red glow; the headline "Scan Your Inventory" (28 pt bold white, centred); the sub-line "Point, tap, type a count. AI identifies each bottle instantly." (15 pt grey, two centred lines); three left-aligned bullets with small red dots (14 pt grey): "Point camera at the bottle label", "Tap the shutter — AI identifies the bottle", "Type your total stock count on the number pad" (the third wraps); a two-line 12 pt dim-grey note "We'll ask for camera access next — it's only used to identify bottles you scan."; and a full-width red "Start Scanning" button (56 pt tall, white lightning-bolt icon, red glow beneath).
- [`screens/01-start-iphoneSE.png`](screens/01-start-iphoneSE.png) (iPhone SE, 750×1334 px). Same card, but it now fills the screen: 550 pt tall (y 85–635), starting right under the menu button (y 32–72) and ending 32 pt above the bottom edge. The second bullet also wraps ("…AI identifies the / bottle"). Nothing scrolls: the start screen's ScrollView is 583 pt tall and its content (card + 32 pt bottom padding) needs 582 pt — **1 pt of slack** at default text size.

(remaining screens pending)

### Inferences
(pending)

### Gaps
(pending)

## 2. Measured observations: fold, amount of text, hierarchy, primary button, contrast

### Takeaway
(pending)

### Cited Findings
Method: every number below comes from `getBoundingClientRect()` and computed styles in the rendered page (harness: Playwright `page.evaluate`), in points. "Words" counts every visible token containing a letter, digit or `$` (button labels included). "Tappables" counts outermost focusable/pressable elements (React Native Web renders `TouchableOpacity` as a focusable element; inputs and pressable inline text such as "Terms of Service" count too). Contrast is the WCAG 2.x ratio of the text colour (alpha and ancestor opacity composited) against the composited background behind it; WCAG AA asks 4.5:1 for normal text and 3:1 for large text (≥24 px, or ≥18.66 px bold).

**(1) Start screen** — measurements: [`screens/01-start-iphone16.png`](screens/01-start-iphone16.png), [`screens/01-start-iphoneSE.png`](screens/01-start-iphoneSE.png)
- Above the fold: everything, on both phones (no scrolling). 51 words visible; 2 tappables (menu icon 40×40 pt; "Start Scanning" 295×56 pt on iPhone 16, 277×56 pt on SE).
- Does the card scroll on the SE? **No — but only just**: scroll area 583 pt, content 582 pt (card 550 + 32 pt padding). The ScrollView added in commit 4d4d93c exists for "small phones, big text sizes", so on an SE the first larger Dynamic Type step (or a bullet wrapping onto one more line in SF Pro) is enough to make it scroll — and what goes below the fold first is the bottom of the card, i.e. the camera note and the "Start Scanning" button — [src/screens/CameraScan.tsx L923–931, L2205–2213](../../src/screens/CameraScan.tsx); `git show 4d4d93c`
- Primary button: "Start Scanning" — the only filled control, full-width, brand red `#C8283A` with a 20 pt red glow, white 16 pt semibold label (5.5:1). The camera tile above it uses the same red, a similar size class and the same glow, but is not tappable — [src/screens/CameraScan.tsx L2225–2237, L2285–2298](../../src/screens/CameraScan.tsx)
- Type scale / hierarchy: headline 28 pt bold white (17.4:1) → sub-line 15 pt grey `#A3A3A3` (6.9:1) → bullets 14 pt grey (6.9:1) → note 12 pt `#737373`.
- Low contrast: the camera heads-up — "We'll ask for camera access next — it's only used to identify bottles you scan." — is the faintest and smallest text on the screen: 12 pt `#737373` on `#1A1A1A` = **3.67:1, below AA's 4.5:1**. The code calls this sentence "the cheapest protection the permission has" — [src/screens/CameraScan.tsx L974–980, L2274–2284](../../src/screens/CameraScan.tsx)

(remaining screens pending)

### Inferences
(pending)

### Gaps
(pending)

## 3. Rendering caveats: what the real iOS screen would show instead

### Takeaway
Expo web is close for layout, copy and colour, but four things differ on a phone: the Sign in with Apple button exists only on iOS (it adds ~150 pt above both auth forms), safe areas and fonts had to be emulated, the system camera dialog cannot be drawn, and the BarNameScreen keyboard opens by itself on iOS.

### Cited Findings
- **Sign in with Apple renders nothing off iOS**: `AppleSignInButton` returns `null` unless `Platform.OS === 'ios'` and `isAvailableAsync()` resolves true — so Expo web shows no Apple button. On iOS it is a full-width white "Continue with Apple" button (`buttonType CONTINUE`, `buttonStyle WHITE`, 52 pt tall, corner radius 14), then an 11 pt grey legal line ("By continuing you agree to our Terms of Service and Privacy Policy", links underlined), then an "or" divider, with 18 pt below — placed ABOVE the email card on both Login and Register — [src/components/AppleSignInButton.tsx L23–37, L84–148](../../src/components/AppleSignInButton.tsx); [src/screens/LoginScreen.tsx L129–135](../../src/screens/LoginScreen.tsx); [src/screens/RegisterScreen.tsx L243–247](../../src/screens/RegisterScreen.tsx). The iOS-approximation screenshots insert a same-size stand-in at that spot; the `-webraw` files show what Expo web literally renders.
- **The iOS camera dialog text**: two strings are configured — `ios.infoPlist.NSCameraUsageDescription` ("86'd uses the camera to identify bottles and scan barcodes for inventory counts.") and the expo-camera plugin's `cameraPermission` ("Allow 86'd to access your camera to scan bottles."). expo-camera's config plugin writes `permissions[key] || infoPlist[key] || default`, i.e. its own option first — [app.json](../../app.json); [node_modules/expo-camera/plugin/build/withCamera.js]; [node_modules/@expo/config-plugins/build/ios/Permissions.js `applyPermissions`]. (Which one lands in the built Info.plist depends on mod order — see Gaps.)
- **Camera permission on web never reports "can't ask again"**: expo-camera's web manager hard-codes `canAskAgain: true` even for a DENIED result, so the "Camera access is turned off / Open Settings" variant can't occur in a browser; it was forced for the screenshot by flipping that one value in the served bundle — [node_modules/expo-camera/build/ExpoCameraManager.web.js L8–29, L74–79]
- **Keyboard**: BarNameScreen's name field has `autoFocus`, so on iOS the keyboard opens as the screen appears; LoginScreen deliberately has no autoFocus — [src/screens/BarNameScreen.tsx L117](../../src/screens/BarNameScreen.tsx); [CLAUDE.md "LoginScreen.tsx"](../../CLAUDE.md). Keyboard height used for the stand-in: 216 pt on Touch ID phones, ~290 pt on iPhone X-class (Face ID) phones — [Apple Developer Forums thread 90061](https://developer.apple.com/forums/thread/90061) ("Prior to the iPhone X … it's 216 pts"; the iPhone X code comment gives 290 − 216 = 74 extra)

### Inferences
(pending)

### Gaps
(pending)
