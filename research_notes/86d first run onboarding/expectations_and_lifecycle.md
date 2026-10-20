# What 86'd promises before the first run, and what it sends after it

_Sources fetched 2026-10-19 (App Store listing, iTunes lookup API, my86d.com, the live API-hosted support/legal pages); code read at 86d-api `4268313` and 86d-mobile `43c4757`. Screenshots saved in `screens/appstore/` (next to this file). Line numbers are 1-indexed. Both repos were only read. Nothing was sent, and no authenticated API was called._

## 1. What does the live App Store listing say, and how does it frame the app?

### Takeaway
The listing sells the order, not the scan. It has no subtitle. The promotional text leads with "Count your bar, and your distributor orders are built for you". The four screenshots run Order summary → Orders sent → Review & Par → Scan, so the step a new user actually does first ("Snap a bottle. AI names it.") comes last. Apple shows only the first one to three screenshots in search results, so a shopper there never sees the scan. Nothing claims fill-level reading or automatic counting, and the copy says the user types or taps the count. But screenshot 1 says the AI splits the order by distributor "on its own. No organizing required."

### Cited Findings
**Listing details**
- Title: "86'd Bar Inventory". Seller and developer: "Stephan Khouri".
- Category: Business (genre 6000). Price: Free. Rating: 4+. Size: 34 MB (`fileSizeBytes` 34034688).
- Requires iOS 15.1 or later. English only.
- First release 2026-08-17. Current version 1.0.5, released 2026-10-09T13:56:40Z. `sellerUrl` is https://my86d.com.
- Source: [iTunes lookup API](https://itunes.apple.com/lookup?id=6798359825&country=us)

**Subtitle**
- None is set. The page data has `topLockup.subtitle: null`, and the app's lockup shows the category ("Business") where a subtitle would go — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825) (embedded `serialized-server-data` JSON).
- Apple: a subtitle "can be up to 30 characters long and appears below your app's name throughout the App Store" — [Apple: Creating your product page](https://developer.apple.com/app-store/product-page/)

**Promotional text**
- Verbatim: "Count your bar, and your distributor orders are built for you. Case or bottles, sent in one tap. Try it free for 15 days. No card needed."
- It shows at the top of the description on the page. It is not in the lookup API's `description`, which is how it can be identified as the promotional-text field — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825); [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us)
- Apple: promotional text "appears at the top of the description and is up to 170 characters long". Also: "The first sentence of your description is the most important — this is what users can read without having to tap to read more." — [Apple product page guidance](https://developer.apple.com/app-store/product-page/)

**Description** (verbatim) — [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us):
  > Your bar's inventory, handled.
  >
  > 86'd takes the busywork out of stock. Count your shelves, and the app builds your distributor orders and sends them for you.
  >
  > Saves you time
  > • AI identifies each bottle. You just type the count
  > • Par levels, prices and distributors are set once and remembered
  > • Orders write themselves and go out sorted by distributor, with your order number and account number on every email
  > • Everything saves as you go, even on slow bar wifi
  >
  > Saves you money
  > • Shows exactly what you're short, so you don't run dry or double up
  > • Smart ordering picks cases for fast movers and bottles for slow ones, so you aren't stuck with dead stock
  > • Itemized orders with an order number make invoices easy to match
  > • Get warned if a distributor's email is bouncing, so an order never silently goes missing
  >
  > Built for real bars
  > Multiple locations. Staff counts. Sign in with Apple.
  >
  > Try it free for 15 days. No card needed. A subscription is required after the trial. Manage or cancel any time.
  >
  > iPhone only.

**What's New, 1.0.5 (Oct 9, 2026)** (verbatim) — [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us); [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825):
  > • Sharper scanning, double-checked by a second AI
  > • Orders now decide case or bottles for you
  > • Clean order emails with your order and account numbers
  > • A warning if a distributor's email bounces
  > • New logo-red look, and each distributor gets its own color
  > • Stays signed in on spotty wifi, plus Sign in with Apple

**Version history** (verbatim, from the page JSON) — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825). A WebFetch summary of the same page mislabelled these versions by one; the raw JSON below is the reliable reading.
- **1.0.4 (Sep 24):** "Minor improvements and bug fixes."
- **"iOS App Version 1.0.3" (Sep 16):** "Set a bottle up once and 86'd remembers it. • Par levels and distributors are now saved per bottle. Count the same bottle next week and it arrives already parred and already grouped under its distributor — no reassigning it every time. • New Bottle Book: review and edit price, par and distributor for every bottle in one place, and see at a glance which ones still need setting up. You can also set a bottle up from the catalog before it's ever been scanned. • A bottle's distributor now stays visible on its card after you assign it, and stays tappable so a wrong one can be corrected. • Distributor badges show the correct initials instead of a generic "D"."
- **1.0.2 (Sep 8):** "Refreshed app icon and branding / Fixed an issue where editing or removing a distributor contact info would not save / Added Manage Subscription to Settings for active subscribers / Fixed a display issue in Review & Par where the par count did not visually match the on-hand count / General bug fixes and polish"
- **1.0.1 (Aug 25):** "• Price Book — set a bottle's price once and it fills in automatically on every future scan. • Keep scanning without waiting. Add a bottle and move straight to the next one while the AI identifies it in the background. • More reliable ordering. If an order to one distributor doesn't go through, your counts stay put and nobody gets emailed twice. • Better on weak Wi-Fi. Screens load from your last known data and retry on their own once you're back online. • Layout, spacing, and stability fixes throughout."
- **1.0 (Aug 17):** no notes.

**Ratings, links, privacy and media**
- Ratings and reviews: none. `userRatingCount: 0`, and the page says "This app hasn't received enough ratings or reviews to display an overview." — [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us); [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825)
- Developer links on the page: "Website" goes to https://my86d.com. "Support" goes to **https://eight6d-api.onrender.com/legal/privacy**, which is the privacy policy, not a support page — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825)
- Privacy labels: Data Linked to You (App Functionality) covers Purchases, Contact Info, User Content and Identifiers. Data Not Linked to You (Analytics) covers Diagnostics — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825)
- Media: no app preview video. The phone media shelf holds exactly 4 PNG screenshots — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825)

**Screenshots, in listing order** (each 1206×2622 PNG, saved in `screens/appstore/`). The captions are baked into the images.
  1. **Position 1 — file `86d-3-Order`** ([local copy](screens/appstore/listing-position-1_86d-3-Order-1206x2622.png); [mzstatic](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/ec/ad/25/ecad25ba-93e6-f2be-a0e7-c8bcd366384e/86d-3-Order-1206x2622.png/1206x2622bb.png)).
     - Headline: "One tap. / Every distributor."
     - Sub-caption: "AI organizes the order and splits it by distributor on its own. No organizing required."
     - The phone shows "Order summary", "7 to order · The Copper Room" and "BY DISTRIBUTOR".
     - Card "Southern Glazer's" (SG badge): Belvedere Vodka ×2, Tito's Handmade Vodka ×4, Don Julio Blanco ×3.
     - Card "Crescent Beverage Co." (CB): Maker's Mark Bourbon ×2, Jameson Irish Whiskey ×3, Tanqueray London Dry Gin ×3, Bulleit Rye ×2.
     - Red button with a paper-plane icon: "Send 2 orders".
  2. **Position 2 — `86d-4-SendEmail`** ([local copy](screens/appstore/listing-position-2_86d-4-SendEmail-1206x2622.png); [mzstatic](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b3/99/a4/b399a4ed-cd69-9df8-fe45-ae68b3113376/86d-4-SendEmail-1206x2622.png/1206x2622bb.png)).
     - Headline: "AI sends / the order."
     - Sub-caption: "After your approval, AI emails the orders directly to your distributors with your restaurant, manager's name and order #."
     - The phone shows "Orders sent" and "2 distributors · The Copper Room".
     - An EMAIL card with a green "Sent 11:42 PM" tag: "To: Southern Glazer's rep", "Order #1042 · The Copper Room", "Please send the following for The Copper Room:", Belvedere Vodka ×2, Tito's Handmade Vodka ×4, Don Julio Blanco ×3, then "Thanks, / Jess Moreno, Bar Manager / The Copper Room".
     - A second card: "Crescent Beverage Co. / Order #1043 · 4 items / Sent".
     - A green pill: "✓ 2 orders sent".
  3. **Position 3 — `86d-2-Par`** ([local copy](screens/appstore/listing-position-3_86d-2-Par-1206x2622.png); [mzstatic](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/d2/f1/fe/d2f1fe78-1615-8368-cdd4-848aa84f7f0a/86d-2-Par-1206x2622.png/1206x2622bb.png)).
     - Headline: "Set once. / Done forever."
     - Sub-caption: "AI remembers which distributor carries each bottle after your first order."
     - The phone shows "Review & Par", a "10 BOTTLES" pill, a "Search bottles" field and a red "+".
     - Group "SOUTHERN GLAZER'S": Belvedere VODKA (highlighted) ON HAND 4 with a gold "2 SHORT" badge, PAR 6; Tito's VODKA 2 / 6; Patrón SILVER **3.5** / 3; Don Julio BLANCO 1 / 4.
     - Group "CRESCENT BEVERAGE CO.": Hendrick's GIN **4.75** / 4; Maker's Mark BOURBON 4 / 6.
     - Every value sits in a −/+ stepper. Every bottle is already parred and already under a distributor.
  4. **Position 4 — `86d-1-Scan`** ([local copy](screens/appstore/listing-position-4_86d-1-Scan-1206x2622.png); [mzstatic](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/21/88/db/2188dba9-9fc9-5852-ec07-c1f0608ca018/86d-1-Scan-1206x2622.png/1206x2622bb.png)).
     - Headline: "Snap a bottle. / AI names it."
     - Sub-caption: "No barcodes, no typing. / You just tap the count."
     - The phone header shows a back arrow, "Scanning" and "Pause".
     - The viewfinder has corner guides around one white bottle on a blurred back bar, with a red scan line.
     - Below it: a green pill "✓ Belvedere Vodka", a large "4", "BOTTLES ON HAND", and the 1–9 keys of a keypad (cropped at the bottom).

**Screenshot order and Apple's search-result rule**
- The file names number the shots 1-Scan, 2-Par, 3-Order, 4-SendEmail. The listing orders them 3, 4, 2, 1. This is the same in the lookup API's `screenshotUrls` and in the page's `product_media_phone_` shelf — [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us); [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825)
- Apple: "Depending on the orientation of your screenshots, the first one to three images will appear in search results when no app preview is available, so make sure these highlight the essence of your app." — [Apple product page guidance](https://developer.apple.com/app-store/product-page/)

**How the listing frames the scan**
- The word "snap" appears only in screenshot 4 ("Snap a bottle."). The description says "AI identifies each bottle. You just type the count". Screenshot 4 says "No barcodes, no typing. You just tap the count." — [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us); [screenshot 4](screens/appstore/listing-position-4_86d-1-Scan-1206x2622.png)
- Barcodes: the app does use them as an option (`BarcodeScannerModal`, `productForBarcode`). The camera usage string in app.json's `infoPlist` reads "86'd uses the camera to identify bottles and scan barcodes for inventory counts." — [app.json](/home/user/86d-mobile/app.json); [86d-mobile CLAUDE.md](/home/user/86d-mobile/CLAUDE.md)
- Fill level: no listing text or caption claims fill-level reading or automatic counting.
- Screenshot 3 shows fractional on-hand counts (3.5, 4.75) with nothing explaining them. The app's number pad has a "." key, so partial bottles are typed in by hand — [CameraScan.tsx:84](/home/user/86d-mobile/src/screens/CameraScan.tsx)

### Inferences
- **First impression is ordering, not scanning.** A search shopper sees the promotional text and screenshots 1–3: "your orders are built and sent for you". The scan-and-type step that the first run starts with never appears in search results. The file names suggest the 3-4-2-1 order was an upload slip rather than a choice (inference).
- **The screenshots show a bar that is already set up.** Screenshots 1 and 2 ("splits it by distributor on its own. No organizing required."; "AI emails the orders") describe a bar whose distributors are in place. Screenshot 3 shows the second count, with pars and distributors already set. The only hints that the first count includes assigning distributors are screenshot 3's own caption ("after your first order") and the 1.0.3 release note ("no reassigning it every time").
- **"AI sends the order" over-claims the AI's role.** It suggests an AI writes the email to the rep. In fact the email is a fixed template (see questions 4 and 7). Some owners may be wary of an AI writing to their rep (inference).
- **Fractional counts could be misread.** A 4.75 shown with no explanation could look like a measured fill level to someone skimming. The listing never says how partial bottles are entered (inference).
- **No social proof.** With 0 ratings, the promotional text and screenshots carry the whole decision (inference).

### Gaps
- No App Store Connect analytics (impressions, product page views, conversion) were available, so I couldn't measure how the screenshot order affects installs.
- Only the US iPhone listing was checked. No custom product pages or other storefronts were looked at.

## 2. What does my86d.com say about how it works and how to get started?

### Takeaway
my86d.com is a single page; every other path tried returns 404. It promises "Count the bar. Send every order. 15 minutes." and "No setup day: the first count builds the bottle book". It describes the real four-step flow accurately (camera → label ID → number pad → email) and offers the founder's own phone, text and email. It shows no picture of the app: the step screenshots, hero video and founder photo are commented-out "PHASE 2" slots, and those files return 404. Its sample order card still shows a "Deliver by" date that the app no longer sends.

### Cited Findings
**Page basics and hero**
- `<title>`: "86'd: Bar inventory and distributor orders in 15 minutes | iPhone app".
- Meta and OG description: "Point your iPhone at each bottle, tap the count, and every distributor gets their order at once. 15 days free, no card."
- Smart App Banner: `<meta name="apple-itunes-app" content="app-id=6798359825">`, with no `app-argument`.
- Source: [my86d.com](https://my86d.com) (raw HTML, fetched 2026-10-19)
- Navigation: "How it works" (#how-it-works), "Pricing" (#pricing), "FAQ" (#faq), and "Start free trial", which goes to the App Store listing — [my86d.com](https://my86d.com)
- Hero (verbatim): "Count the bar. / Send every order. / 15 minutes." then "Point your iPhone at each bottle, tap the count, and every distributor gets their order at once." Below that: an App Store badge, a QR code ("Scan with your iPhone camera"), and "15 days free · no card · iPhone" — [my86d.com](https://my86d.com)
- "Sound familiar?": "Still counting on a clipboard after close?" / "Texting five reps one at a time?" / "Out of your top seller on a Friday?" — [my86d.com](https://my86d.com)

**How it works** (verbatim) — [my86d.com](https://my86d.com):
  1. "Point the camera at a bottle — The AI reads the label and identifies it: name, brand, category."
  2. "Tap in the count — A number pad, one bottle at a time. Then straight on to the next."
  3. "It sorts by distributor as you go — Every bottle lands under the distributor you buy it from. No sorting afterwards."
  4. "Tap "Email" — Every distributor gets its order at once. The count and the orders take about 10–15 minutes instead of an evening."

**"The order your rep actually gets"**
- A sample email card (verbatim): "Marlins Seafood and Grille / to Metro Beverage — orders / 4:12 PM / Order #1042 from Marlins Seafood and Grille / Acct #4471 / **Deliver by Fri, Oct 10** / Tito's Handmade Vodka 1L — 2 cases / Espolòn Reposado 750ml — 1 btl / Bulleit Bourbon 750ml — 3 btl / Campari 1L — 1 btl / **Liquor order sent by** Dana Reyes, Bar Manager at Marlins Seafood and Grille. Please put order #1042 on the invoice."
- Caption: "Every order numbered, so the invoice matches."
- Source: [my86d.com](https://my86d.com)

**"Set it once"** (verbatim) — [my86d.com](https://my86d.com):
- "Set the first time you count a bottle. Every count after that only asks for the number."
- "Price — What you pay for the bottle."
- "Par — How many you want on the shelf."
- "Distributor — Who the order goes to."
- "**No setup day: the first count builds the bottle book.**"

**Founder and pricing**
- "From the founder" (verbatim): "86'd is built by Stephan Khouri. Questions before you try it? Call or text me." It links tel:+19103352760 ("910-335-2760") and mailto:stephan@my86d.com — [my86d.com](https://my86d.com)
- Pricing (verbatim): "$49.99 /month", "15 days free · no credit card", "Cancel any time from the app." — [my86d.com](https://my86d.com)
- Included features: "AI bottle scanning", "Unlimited bars", "Saved prices, pars and distributors", "One-tap orders to every distributor", "Order history". Then "iPhone only · iOS 15.1 or later" — [my86d.com](https://my86d.com)

**FAQ ("Straight answers")** (verbatim) — [my86d.com](https://my86d.com):
  - "Is there an Android version?" — "No. iPhone only, iOS 15.1 or later. Whoever counts needs an iPhone."
  - "Does it work in a dark bar?" — "Usually. For a very dark corner, step closer or use the phone's light."
  - "What if it reads a bottle wrong?" — "Two AIs read every label. When they disagree, the app flags the bottle for a quick look instead of guessing. If one's wrong, remove that row and add the right bottle."
  - "Does it connect to my POS?" — "No. It counts what's on the shelf and orders from that."
  - "How do orders reach my distributors?" — "By email, to the rep or order address you add once."
  - "Do I need a card for the trial?" — "No. 15 days free, then $49.99/month. Cancel from the app."
  - "Can I run more than one bar?" — "Yes. One account, each bar kept separate, no extra fee. Each bar keeps its own counts, prices and distributors."
  - "Can my staff count?" — "Yes. Add their names and each count records who did it. No extra logins."

**Closing, footer and other pages**
- Closing call to action: "Try it on your next count." with the badge, QR code and "15 days free · no card" — [my86d.com](https://my86d.com)
- Footer: Privacy (eight6d-api.onrender.com/legal/privacy), Terms (…/legal/terms), stephan@my86d.com, 910-335-2760, App Store, and "© 2026 Southport AI Solutions" — [my86d.com](https://my86d.com)
- No other pages exist. /support, /help, /faq, /how-it-works, /privacy, /terms, /contact, /getting-started and /start all return HTTP 404 — [my86d.com](https://my86d.com) (curl, 2026-10-19)

**No app imagery**
- The hero `<video>` (hero.mp4/webm) and the four step screenshots sit inside HTML comments marked "PHASE 2 SLOT: add … then uncomment". The step images are `assets/screens/step-1.webp`…`step-4.webp`, with alt text "Scanning a bottle in the 86'd app", "Tapping a count into the 86'd number pad", "Orders grouped by distributor in the 86'd app" and "Sending every distributor order from the 86'd app". The founder photo is commented out the same way.
- Those files return 404. The hero shows the app icon instead.
- Source: [my86d.com](https://my86d.com)

**Linked legal pages** (live; each says "Last updated July 19, 2026")
- Terms: "Subscription & trial — New accounts get a free 15-day trial with no card required. After that, continued use requires a paid subscription, billed through Stripe. Cancel anytime; your data stays intact and access resumes if you re-subscribe."
- Terms: "Important: verify your orders — AI bottle identification and inventory math can contain errors. Order quantities are suggestions calculated from the counts and par levels you enter. Always review an order before sending it…"
- Terms: ""Sent" means our email provider accepted the message."
- Sources: [Terms](https://eight6d-api.onrender.com/legal/terms); [main.py:3986-4018](/home/user/86d-api/main.py)
- Privacy: "Bottle photos are sent to our AI providers (OpenAI and Google) solely to identify the bottle, and are not stored on our servers after identification." — [Privacy](https://eight6d-api.onrender.com/legal/privacy); [main.py:3959-3983](/home/user/86d-api/main.py)

### Inferences
- **The flow is accurate; the headline promises fit a repeat count.** The site's description of the flow matches the app better than the App Store screenshots do, because it leads with the camera step. But "15 minutes" and "No setup day" describe a repeat count. On the first count the user must also set a par and a distributor for every bottle (see question 7).
- **Visitors never see the app.** The site shows no app screen, only the HTML order card. So any picture a prospect has of the first screens comes from the App Store screenshots alone (inference).
- **The sample email is from a fully set-up bar.** It has an account number, a delivery date and case lines. The delivery-date line cannot appear on an order sent from the current app (see question 7).

### Gaps
- The page loads Google Analytics 4 (comment in the HTML). Its traffic and conversion data weren't accessible.

## 3. What does the sales pitch promise a prospect who agrees to try it, and is there a hand-off into the app?

### Takeaway
The founder's outreach (the CRM drafter's `pitch.py` and the sales school's `coach.py`) promises "Just download and go", "no setup day", the four steps, 15 days free with no card, and his direct line. Its first ask is "Try it on their next count: download from the App Store, 15 days free, no card." The only bridge from the sales conversation into the app is a plain App Store link. There is no deep link, invite, pre-created account, referral code, or "what to do first" message. The CRM learns that a prospect signed up only afterwards, by matching email, email domain or business name.

### Cited Findings
**Constants behind the pitch**
- Owner "Stephan", title "Owner of 86'd", phone "910-335-2760", price "$49.99/month" — [pitch.py:25-32](/home/user/86d-api/pitch.py)
- `TRIAL_DAYS = 15`, commented "One number for the product AND the pitch, so what we promise is what they get" — [pitch.py:25-32](/home/user/86d-api/pitch.py)
- `APP_URL` defaults to https://apps.apple.com/us/app/86d-bar-inventory/id6798359825. The website is https://my86d.com — [pitch.py:89-91](/home/user/86d-api/pitch.py)
- Signature: "Stephan Khouri / Owner of 86'd Bar inventory / Website: My86d.com" — [pitch.py:94-95](/home/user/86d-api/pitch.py)

**The owner's reference email** (`EXAMPLE_EMAIL`, verbatim) — [pitch.py:119-140](/home/user/86d-api/pitch.py):
  > Subject: Cut bar inventory to 15 minutes
  > Hi [Name],
  > I built 86'd, an app that turns bar inventory and ordering into a 10–15 minute task.
  > Here's how it works:
  > 1. Open the app and point your camera at a bottle. AI identifies it instantly.
  > 2. Enter your current count and move to the next bottle.
  > 3. In the background, AI organizes everything by distributor.
  > 4. Tap "Email." Orders go out to all your distributors at once, without ever opening your inbox.
  > Each order is sent with its own order number, your restaurant's name and your bar manager's name. You set each product's distributor and price once, and the app remembers it from then on. Every order is saved, so you can look back at your ordering history anytime.
  > The first 15 days are free, with no credit card required. Just download and go. After that, it's $49.99/month.
  > If you have any questions, call me directly at 910-335-2760.

**The master sheet** (what every draft and prep sheet may say)
- HOW IT WORKS (verbatim): "1. Point the camera at a bottle. AI identifies it (name, brand, category). 2. Tap in the current count on a number pad, move to the next bottle. 3. The app sorts everything by distributor in the background. 4. Tap "Email": every distributor gets its order at once, sent by the app. Nobody has to open their inbox or write an order by hand." — [pitch.py:183-189](/home/user/86d-api/pitch.py)
- DETAILS THAT ARE TRUE (verbatim excerpts) — [pitch.py:191-200](/home/user/86d-api/pitch.py):
  - "Every order goes out with its own order number (#1001, #1002, … for each bar), the restaurant's name and the bar manager's name on it, and the bar gets a copy."
  - "Each bottle's distributor, price and par level are set once; the app remembers them, so the next count only asks for the number. The first count builds the book as you go: there's no setup day."
  - "Nothing to buy or install beyond the app: no scale, no scanner, no hardware."
- PRICE (verbatim): "15 days free. No credit card needed to start: download and go." and "After that, $49.99/month. Cancel any time, from the app." — [pitch.py:202-205](/home/user/86d-api/pitch.py)
- WHAT IT DOES NOT DO (verbatim excerpts) — [pitch.py:211-219](/home/user/86d-api/pitch.py):
  - "No Android version."
  - "It doesn't connect to a POS or read sales; the count is what's on the shelf."
  - "It doesn't measure how full a bottle is: the count is tapped in by hand."
  - "It doesn't order through distributor websites or portals…"
  - "No customer numbers, testimonials, case studies or percentages exist to quote."
- HONEST ANSWERS TO THE USUAL PUSHBACK (relevant excerpts) — [pitch.py:236-245](/home/user/86d-api/pitch.py):
  - ""I don't have time." That's the point: the count and the orders take 10-15 minutes. Offer a five-minute call outside service, or just the link to try it on the next count."
  - ""I order through my rep." Nothing changes with the rep: the app emails them the order."
  - ""Send me something." Send the App Store link and one line on how it works, and ask when to follow up."
- WHAT WE ASK FOR (verbatim): "(one per email or call, never all three)" then "Try it on their next count: download from the App Store, 15 days free, no card.", "A short call with Stephan to see it: 910-335-2760." and "The name of whoever counts and orders, and when they're in." — [pitch.py:247-250](/home/user/86d-api/pitch.py)

**Drafting rules and the sales school**
- Drafts must "Include the App Store link, on its own line, unless the salesperson says not to. It is the ONLY link in the body: the website is already in the signature." — [pitch.py:340-341](/home/user/86d-api/pitch.py)
- Every outreach email ends with: "Not the right person, or not something you need? Just reply and say so, and I won't email again." — [pitch.py:104-106](/home/user/86d-api/pitch.py)
- The school's `PRODUCT` says: "...Point the camera at a bottle and AI identifies it, tap in the count, and it sorts everything by distributor and emails every distributor its order in one tap, with the restaurant's and bar manager's names on it. Each bottle's price, par and distributor are set once and remembered..." — [coach.py:195-207](/home/user/86d-api/coach.py)
- The school's `ASKS` are "try it on their next count: download from the App Store, 15 days free, no card", "a short call with the founder to see it" and "the name of whoever counts and orders, and when they're in" — [coach.py:212-217](/home/user/86d-api/coach.py)
- Clicking the CRM page's title copies the App Store link (`COMPANY_APP_URL`, or `pitch.APP_URL` via `/mail/status`) — [crm.py:2121-2122, 4045-4046](/home/user/86d-api/crm.py); [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md)

**No hand-off into the app**
- app.json declares no URL `scheme`, so there is no custom deep link — [app.json](/home/user/86d-mobile/app.json)
- The website's Smart App Banner has no `app-argument` — [my86d.com](https://my86d.com)
- Searching main.py, crm.py, pitch.py and coach.py for deep link, universal link, invite, pre-created account, setup call, onboarding call, walk-you-through or walkthrough found nothing — (repo search)
- Attribution happens only afterwards. `rematch_attribution()` joins crm_leads to users by exact email, then by a unique non-free-mail email domain, then by a unique normalized business name. It writes only `matched_user_id`, `matched_at` and `match_method`; it never changes the lead's status — [crm.py:1475-1533](/home/user/86d-api/crm.py)
- The only signup-side handle: the bar-name screen asks for "Your phone (optional, for setup help)". It is saved as `users.phone` and shown on the CRM's Customers page. No code schedules or alerts anything from it — [BarNameScreen.tsx:122](/home/user/86d-mobile/src/screens/BarNameScreen.tsx); [models.py:39](/home/user/86d-api/models.py); [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md)

### Inferences
- **The prospect starts cold.** A prospect who says yes on a call gets, at most, an email with the App Store link and the four steps. From there they start from nothing: they re-type their name, email, bar name, and every distributor's address, some of which the founder may already know (inference).
- **The pitch sets up a quick first session.** "Just download and go", "no setup day" and "a 10–15 minute task" all point that way. The master sheet's own line "The first count builds the book as you go" is accurate, but it presents setup as invisible rather than as most of the first session.
- **"Setup help" has no process behind it in code.** The phone field promises help, but nothing in code acts on it. The founder may call manually (inference from absence).

### Gaps
- The owner's standing AI instructions (the AI Brain page, `crm_ai_brain.owner_notes`) and the learned playbook live in the production database. They can change what drafts say and couldn't be read here.
- Actual sent emails (`crm_sent_emails`) and call transcripts (CloudTalk) weren't accessible. What prospects were really told can only be inferred from the drafting rules.

## 4. What does a new account receive after sign-up?

### Takeaway
Almost nothing. There is no welcome email, no "do your first count" nudge and no push notification. The backend sends exactly three kinds of customer email through Resend: distributor order emails (with a BCC copy to the user), one trial-ending reminder about 5 days before the trial ends, and password-reset codes. All three come from the shared "86'd Orders" sender. None of them tells a new user what to do first or how to scan.

### Cited Findings
**What gets sent, and from whom**
- There are only three customer-facing send sites: order emails at [main.py:3282](/home/user/86d-api/main.py), the trial reminder at [main.py:3460](/home/user/86d-api/main.py), and the password reset at [main.py:4425](/home/user/86d-api/main.py). This comes from a grep for `_send_via_resend(` across 86d-api.
- Registration commits the user and returns tokens. It sends no email — [main.py:320-366](/home/user/86d-api/main.py)
- All three use `ORDER_EMAIL_FROM` as the sender, or the sandbox default "86'd Orders <onboarding@resend.dev>" if it's unset. The code says: "From is exactly ORDER_EMAIL_FROM (e.g. "86'd Orders <orders@my86d.com>"), the same for every bar" — [main.py:3003-3016](/home/user/86d-api/main.py)
- The production sender is "86'd Orders <orders@my86d.com>" per [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md)

**Trial reminder**
- Trigger and timing: `TRIAL_REMINDER_DAYS_BEFORE = 5`, checked every 6 hours (`TRIAL_REMINDER_CHECK_INTERVAL_SECONDS = 6 * 60 * 60`). It is sent once per account (`trial_reminder_sent_at IS NULL`) to users with `subscription_status = 'trial'` whose `trial_ends_at` falls within 5 days and is still in the future. The code comment reads: "Trial ending is a hard, silent cliff otherwise — a heads-up email a few days out, on top of the in-app banner" — [main.py:3406-3438](/home/user/86d-api/main.py)
- Copy (verbatim). Subject: `Your 86'd trial ends in {days_left} day{s}`. Body:
  > Hi {display_name},
  >
  > Your free trial of 86'd ends on {Month DD, YYYY}. After that, you'll need an active subscription to keep scanning, ordering, and tracking your bar's inventory — nothing you've entered will be lost, but you won't be able to use the app again until you subscribe.
  >
  > Open the 86'd app and tap Subscribe to keep going without any interruption.
  >
  > Thanks,
  > The 86'd team
- `display_name` is `manager_name`, else `name`, else "there". `days_left` is whole days rounded down (`(ends - now).days`). No reply-to is set — [main.py:3440-3460](/home/user/86d-api/main.py)

**Password reset**
- Subject: "Your 86'd password reset code".
- Body (verbatim): "Hi {name}, / Your password reset code is: {code} / This code expires in 30 minutes. If you didn't request this, you can ignore this email. / (sent via 86'd bar inventory)"
- A repeat request within 60 seconds does not send a second code.
- Sources: [main.py:4425-4434](/home/user/86d-api/main.py); [auth.py:13-14](/home/user/86d-api/auth.py)

**Order emails and the user's BCC copy**
- Every distributor email is BCC'd to `users.order_reply_to` if set, else the login email. The code comment: "BCC the bar's own email: proof in the manager's inbox that the order went out" — [main.py:3277-3284](/home/user/86d-api/main.py)
- What the email contains — [helpers.py:742-797](/home/user/86d-api/helpers.py), with constants at [helpers.py:639](/home/user/86d-api/helpers.py) and [helpers.py:739](/home/user/86d-api/helpers.py):
  - Subject "Order #{n} from {bar}". Numbers start at 1001 (`FIRST_ORDER_NUMBER`).
  - "Acct #…" when an account number is saved.
  - One "- {item} — {qty}" line per item, then "Total: …".
  - "Order sent by {person}, {title} at {bar}. Please put order #… on the invoice." The title defaults to "Bar Manager" (`DEFAULT_SENDER_TITLE`).
  - "Sent with 86'd bar inventory".

**What is not sent**
- No push notifications: `expo-notifications` is not in package.json or src, and nothing in main.py sends pushes — (repo search)
- After Stripe checkout the browser shows "You're all set!" / "Head back to the 86'd app — your subscription is active.", or on cancel "No charge made" / "You can head back to the 86'd app any time to subscribe." — [main.py:4040-4049](/home/user/86d-api/main.py)
- The CRM measures activation but doesn't act on it. `/v1/crm/funnel` reports signed_up, started_a_count, completed_a_count and never_started_pct, with the comment "a bar that signs up and never finishes a first count never converts, and nothing surfaced that before". It also buckets trials by days left ("the save-motion worklist"). Nothing in it sends a message — [crm.py:1540-1650](/home/user/86d-api/crm.py)

**Sales follow-ups after a signup**
- A signup does not automatically stop sales outreach. Attribution sets only `matched_user_id` [crm.py:1519-1527](/home/user/86d-api/crm.py).
- The Follow-ups queue excludes only leads with status `won` or `dead` [crm.py:1978-1980](/home/user/86d-api/crm.py).
- A scheduled email is held as "they signed up since this was queued" only if the lead's status is `'won'` [crm.py:4311-4326](/home/user/86d-api/crm.py).

### Inferences
- **Nothing reaches a new user until the reminder.** From sign-up (day 0) to the reminder (about day 10), a user who hasn't sent an order gets no email at all. The first lifecycle email they see is about paying, not about getting started (inference from the send inventory).
- **The voice and reply path change after sign-up.** Sales email comes from "Stephan Khouri" (Spacemail, per [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md)). The reminder comes from "86'd Orders", signed "The 86'd team", with no reply-to. Replies go to orders@ rather than the mailbox the CRM inbox reader watches (`SPACEMAIL_USER`, Stephan@my86d.com). A prospect told "call me directly" receives nothing with his number after signing up (inference).
- **A signed-up bar can still be pitched.** Unless someone marks the lead `won` (by hand, or the call-notes AI on words like "signed up"), a bar that already signed up can still get "worth trying on your next count?" follow-ups or another call. This is inferred from the code paths; actual operator practice is unknown.
- **Hidden-email users get mail at a relay.** Apple "Hide My Email" users receive these emails at a relay address (inference).

### Gaps
- Stripe's own customer emails (receipts, trial-ending notices, failed payments) depend on Stripe Dashboard settings that aren't in either repo.
- Two things can't be confirmed from code: whether orders@my86d.com is a monitored mailbox, and the exact `ORDER_EMAIL_FROM` value on Render (it is known only from CLAUDE.md).
- No delivery or open data for the reminder was accessible.

## 5. When does the trial clock start, what does the user see about it in the app, and what does the paywall say?

### Takeaway
The 15-day clock starts at account creation (email or Apple), not at the first count. In the app, the trial is mentioned on the sign-in and sign-up screens and then nowhere until 5 days remain. At that point a dismissible "Trial ends in N days · Subscribe" banner appears on every screen except the camera. When the trial expires, the paywall replaces everything except sign-out.

### Cited Findings
**When the clock starts**
- Email sign-up sets `trial_ends = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)`, with `trial_started_at = now` and status `'trial'` — [main.py:320-344](/home/user/86d-api/main.py)
- Sign in with Apple does the same when it creates the account — [main.py:555-566](/home/user/86d-api/main.py)
- `TRIAL_DAYS = 15` — [pitch.py:31](/home/user/86d-api/pitch.py)
- The billing comment: "No card is ever collected at signup — every account gets a TRIAL_DAYS (15) day trial (see register_user) and only talks to Stripe once they hit "Subscribe."" — [main.py:3362-3366](/home/user/86d-api/main.py)

**What the user sees before signing up**
- Login screen: "Scan it. Count it. Order it." / "Welcome back" / "Sign in to keep your bar stocked" / "New to 86'd?" with a button "Start Free Trial" — [LoginScreen.tsx:125, 139-140, 243-250](/home/user/86d-mobile/src/screens/LoginScreen.tsx)
- Register screen: "Create your account" / "Start your free 15-day trial". It gives no end date and doesn't say "no card" — [RegisterScreen.tsx:240, 251-252](/home/user/86d-mobile/src/screens/RegisterScreen.tsx)

**The trial banner**
- It shows only when the user is signed in, `currentScreen !== 'camera'`, and `trialDays <= 5` — [App.tsx:216-221](/home/user/86d-mobile/src/App.tsx)
- Its text is "Trial ends tomorrow" or "Trial ends in {N} days", followed by an underlined "Subscribe" link that opens Stripe checkout and an X to dismiss it. Dismissal lives in component state — [TrialBanner.tsx:16-46](/home/user/86d-mobile/src/components/TrialBanner.tsx)
- Days are computed as `Math.ceil(msLeft / 1 day)` — [entitlements.ts:21-28](/home/user/86d-mobile/src/utils/entitlements.ts)

**Elsewhere in the app**
- Settings shows no trial status. "Manage Subscription — Update payment method, view invoices, or cancel" appears only when `subscription_status === 'active'` — [SettingsScreen.tsx:534-544](/home/user/86d-mobile/src/screens/SettingsScreen.tsx)

**The paywall**
- The gate: `if (!isEntitled(user)) return <PaywallScreen />`, commented "block everything except the paywall itself (which has its own sign-out)" — [App.tsx:148-154](/home/user/86d-mobile/src/App.tsx)
- PaywallScreen copy (verbatim) — [PaywallScreen.tsx:37-111](/home/user/86d-mobile/src/screens/PaywallScreen.tsx):
  - Title: "Your free trial has ended" (status still `'trial'`) or "Subscription needed".
  - Subtitle: "Subscribe to keep scanning, ordering, and tracking your bar's inventory."
  - Price from `GET /billing/price` ("$49.99" if offline) + "/month".
  - Button: "Subscribe Now".
  - Hint: "You'll be taken to a secure checkout page. Once you've subscribed, come back here."
  - Secondary: "I've subscribed — refresh" and "Sign out".
  - Errors: "Couldn't start checkout" / "Check your connection and try again.", and "Couldn't check just now" / "We couldn't reach the server. Check your connection and tap refresh again — if you've paid, you're all set once it connects."
  - There's no support contact on it.

**Subscribing early**
- Subscribing during the trial keeps the remaining free days. Stripe Checkout gets `trial_end` set to the account's own trial end when at least 48h + 5 min remain — [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md) (BILLING)
- The app never uses `/billing/price`'s `first_charge_date` (no reference in src) — (repo search)

### Inferences
- **The banner may not be seen.** A user whose app opens straight to the camera (the default screen, and the one most often resumed) may not see the banner until they move to Review or Order. The reminder email's "tap Subscribe" only works through that banner (inference).
- **The clock runs before the first count.** Because it starts at sign-up, a prospect who installs on a Tuesday to "try it on the next count" on Sunday has used about 5 of the 15 days before counting anything (inference).
- **The email and the banner disagree by a day.** The email rounds days down and the banner rounds up, so at the moment the email goes out it will usually say "4 days" while the banner says "5 days" (inference from code).
- **Early subscribing isn't explained.** Nothing tells a trial user they can subscribe early without losing free days, so a cautious user may wait for the paywall (inference).

### Gaps
- How many users reach the paywall without ever completing a count (the CRM funnel numbers live in production).

## 6. Is there any help, FAQ, video or support path in the app or on the website?

### Takeaway
Inside the app there is none: no help, FAQ, tutorial, video, support email or phone. An onboarding screen exists in the code but is never shown. On the web there is the website's eight-question FAQ and the founder's phone, text and email. A /support page exists on the API host, but nothing links to it, its answers are out of date, and the App Store's "Support" link goes to the privacy policy instead.

### Cited Findings
**Inside the app**
- Searching the app's src for mailto, tel:, support, faq, help, video, tutorial and my86d.com finds only the bar-name screen's "for setup help" label and OrderSummary's `tel:` for calling a distributor — (repo search); [OrderSummary.tsx:359](/home/user/86d-mobile/src/screens/OrderSummary.tsx)
- The sidebar holds "New Scan" (or "Continue Scanning"), "Review & Par", "Order History", "Discard Count", "Bottle Book", "Settings" and "Sign Out". There is no help item — [Sidebar.tsx:137-208](/home/user/86d-mobile/src/components/Sidebar.tsx)
- The paywall has no contact path — [PaywallScreen.tsx](/home/user/86d-mobile/src/screens/PaywallScreen.tsx)
- `Onboarding.tsx` (copy: "Inventory at the…", "Get Started", "By continuing, you agree to our Terms of Service.") is not exported from `screens/index.ts` and not imported by `App.tsx`, so it never renders — [Onboarding.tsx:85-123](/home/user/86d-mobile/src/screens/Onboarding.tsx); [screens/index.ts](/home/user/86d-mobile/src/screens/index.ts); [App.tsx:11-24](/home/user/86d-mobile/src/App.tsx)
- The only first-run instruction in the app is the camera start screen, shown only while nothing has been counted — [CameraScan.tsx:946-991](/home/user/86d-mobile/src/screens/CameraScan.tsx):
  - "Scan Your Inventory"
  - "Point, tap, type a count. AI identifies each bottle instantly."
  - "Point camera at the bottle label"
  - "Tap the shutter — AI identifies the bottle"
  - "Type your total stock count on the number pad"
  - "We'll ask for camera access next — it's only used to identify bottles you scan."
  - Button: "Start Scanning"

**The /support page**
- Live copy (verbatim) — [Support page](https://eight6d-api.onrender.com/support); [main.py:4021-4037](/home/user/86d-api/main.py):
  - "Get help — Questions, bugs, or feature requests — email [a personal @hotmail.com address] and we'll get back to you."
  - "A bottle scanned wrong. Tap the bottle in Review, then retry the scan or correct the name/count by hand — the count always overrides what the camera read."
  - "Two bottles for the same product. Open Pricing under Management, find the duplicate under "Needs a price," and tap the merge icon to combine it with the correct one."
  - "An order didn't reach a distributor. Check the address in Settings under Distributors, then resend from Order History."
  - "Forgot your password. Use "Forgot password?" on the sign-in screen."
- The contact address is the default of `LEGAL_CONTACT` [main.py:3937](/home/user/86d-api/main.py). The same address is the "Questions:" line on the privacy and terms pages [main.py:3940-3956](/home/user/86d-api/main.py). It is not stephan@my86d.com.

**The /support answers are stale**
- That screen is now "Bottle Book", not "Pricing". Its sections are NEEDS SETUP and YOUR BOTTLES, and duplicates are merged under "Same bottle twice?".
- A scanned row's product can't be changed in Review; a wrong bottle is fixed by removing the row.
- Sources: [86d-mobile CLAUDE.md](/home/user/86d-mobile/CLAUDE.md); [Sidebar.tsx:182](/home/user/86d-mobile/src/components/Sidebar.tsx)
- The website's FAQ gives the current answer: "If one's wrong, remove that row and add the right bottle." — [my86d.com](https://my86d.com)

**The App Store support link**
- The listing's "Support" link goes to https://eight6d-api.onrender.com/legal/privacy — [App Store page](https://apps.apple.com/us/app/86d-bar-inventory/id6798359825)
- Apple guideline 1.5: "People need to know how to reach you with questions and support issues. Make sure your app and its Support URL include an easy way to contact you… Failure to include accurate and up-to-date contact information not only frustrates customers, but may violate the law in some countries or regions." — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**On the website**
- The FAQ section plus "From the founder" (phone, text, email). There are no separate help pages (those paths return 404) and no published video — [my86d.com](https://my86d.com)

### Inferences
- **Three contact points, none in the app.** Where a user looks decides what they find: the website gives stephan@my86d.com and 910-335-2760; the support and legal pages give a personal Hotmail address; the app gives nothing. The app is exactly where a confused first-run user is (inference).
- **The App Store support link is a UX gap and a review risk.** The link does reach an email address, in the privacy page's footer, but no support content. That leaves a gap for users and exposure under Apple's guideline 1.5 (inference).

### Gaps
- No code evidence either way on whether the founder calls new signups who left a phone number "for setup help".

## 7. Where do the pre-install promises and the actual first run diverge? (mismatch register)

### Takeaway
Before install, the story is: count, and your orders are built and sent for you, in 15 minutes, with no setup. The first run is different:
1. A "Welcome back" sign-in screen.
2. A four-field sign-up form, or Sign in with Apple.
3. A bar-name screen.
4. A camera-permission pre-prompt.
5. Scanning, with three tips.
6. A Review screen where every bottle is "Unassigned". Generating the order is blocked until every bottle has a par.
7. A send button that reads "Assign All Distributors" until every bottle has a distributor with an email.

No pre-install source says the first count is where pars and distributors get set. And there's no help path in the app to explain it.

### Cited Findings
Each item: what was promised, then what the first run actually does.

**1. "Sorted by distributor on its own" vs. every bottle Unassigned on the first count**
- Promised:
  - Screenshot 1, the first in the listing: "AI organizes the order and splits it by distributor on its own. No organizing required." — [screenshot 1](screens/appstore/listing-position-1_86d-3-Order-1206x2622.png)
  - Website step 3: "It sorts by distributor as you go — Every bottle lands under the distributor you buy it from. No sorting afterwards." — [my86d.com](https://my86d.com)
  - Pitch: "The app sorts everything by distributor in the background." / "In the background, AI organizes everything by distributor." — [pitch.py:183-189](/home/user/86d-api/pitch.py); [pitch.py:119-140](/home/user/86d-api/pitch.py)
- What happens:
  - Review groups bottles with no distributor under "Unassigned" with the hint "Tap item to assign" — [ReviewGrid.tsx:211, 321](/home/user/86d-mobile/src/screens/ReviewGrid.tsx)
  - A new distributor is created in the assign sheet, and both name and email are required ("That email address looks incomplete.") — [ReviewGrid.tsx:98-109](/home/user/86d-mobile/src/screens/ReviewGrid.tsx)
  - The order screen's main button is disabled and reads "Assign All Distributors" while any item is unassigned; otherwise it reads "Confirm & Email Distributors" — [OrderSummary.tsx:884-895](/home/user/86d-mobile/src/screens/OrderSummary.tsx)
  - A distributor with no email shows "{who}: no email on file — add one in Settings" — [OrderSummary.tsx:306](/home/user/86d-mobile/src/screens/OrderSummary.tsx)
  - The only honest hints in the listing are screenshot 3's caption ("after your first order") and the 1.0.3 release note ("no reassigning it every time").

**2. "15 minutes", "No setup day", "Just download and go" vs. a first count that is the setup**
- Promised:
  - "Count the bar. Send every order. 15 minutes." and "No setup day: the first count builds the bottle book." — [my86d.com](https://my86d.com)
  - "Just download and go." — [pitch.py:134](/home/user/86d-api/pitch.py)
  - "turns bar inventory and ordering into a 10–15 minute task" — [pitch.py:123](/home/user/86d-api/pitch.py)
- What happens:
  - "Generate Order Summary" is blocked by the alert "Set par levels first — {N} items still have the default par level (1). Set a real par level for each below before generating an order — order quantities are calculated from it." The footer meanwhile reads "{N} items missing a par level" — [ReviewGrid.tsx:144-152, 506](/home/user/86d-mobile/src/screens/ReviewGrid.tsx)
  - Every bottle also needs a distributor (item 1).
  - The website's own "Set the first time you count a bottle" is accurate. The unqualified "15 minutes" headline is not, for the first count.

**3. Price "set the first time you count" vs. price never asked during a count**
- Promised: "Set the first time you count a bottle… Price — What you pay for the bottle." — [my86d.com](https://my86d.com)
- What happens:
  - Neither the scan screen nor Review prompts for a price; Review only reads it from the book (`priceFor`) — [CameraScan.tsx](/home/user/86d-mobile/src/screens/CameraScan.tsx); [ReviewGrid.tsx](/home/user/86d-mobile/src/screens/ReviewGrid.tsx)
  - ManualAdd: "No price here on purpose — prices live in the Pricing screen" — [ManualAdd.tsx:172](/home/user/86d-mobile/src/components/ManualAdd.tsx)
  - Prices are set only in the Bottle Book — [86d-mobile CLAUDE.md](/home/user/86d-mobile/CLAUDE.md)

**4. The sample order email doesn't match what the app sends**
- **"Deliver by" date:** the website card shows "Deliver by Fri, Oct 10" — [my86d.com](https://my86d.com). But the owner decided on 2026-10-08 that the order screen has no delivery date and sends no `deliver_by` — [86d-mobile CLAUDE.md](/home/user/86d-mobile/CLAUDE.md); no `deliver_by` in [OrderSummary.tsx](/home/user/86d-mobile/src/screens/OrderSummary.tsx)
- **Closing wording:** the card says "Liquor order sent by Dana Reyes…", while the real email says "Order sent by {person}, {title} at {bar}." — [helpers.py:784](/home/user/86d-api/helpers.py)
- **Screenshot 2's body is a different format.** It reads "Please send the following for The Copper Room: … Thanks, / Jess Moreno, Bar Manager". The real email carries "Order #N from {bar}", "Acct #…", "- item — qty" lines, "Total: …", the "Please put order #N on the invoice" closing and "Sent with 86'd bar inventory" — [screenshot 2](screens/appstore/listing-position-2_86d-4-SendEmail-1206x2622.png); [helpers.py:766-796](/home/user/86d-api/helpers.py)
- **Order numbers:** screenshot 2 gives the two distributors in one send different numbers (#1042, #1043). The backend draws one number per send and shares it ("if order_number is None: order_number = _draw_order_number(user_id)") — [main.py:3267-3270](/home/user/86d-api/main.py); [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md)
- **The sender's title:** unless the user sets YOUR TITLE in Settings → Restaurant, the email signs the sender as "Bar Manager", even for an owner — [helpers.py:739, 782-785](/home/user/86d-api/helpers.py); [86d-mobile CLAUDE.md](/home/user/86d-mobile/CLAUDE.md)

**5. "AI sends the order" vs. a fixed template**
- Promised: "AI sends the order. After your approval, AI emails the orders directly to your distributors…" — [screenshot 2](screens/appstore/listing-position-2_86d-4-SendEmail-1206x2622.png)
- What happens: the server fills a fixed `order_email()` template and sends it through Resend; no AI writes it — [helpers.py:742-797](/home/user/86d-api/helpers.py); [main.py:3282](/home/user/86d-api/main.py)
- The Terms meanwhile say: "Always review an order before sending it" and ""Sent" means our email provider accepted the message." — [Terms](https://eight6d-api.onrender.com/legal/terms)

**6. "No typing" vs. "type the count"**
- Screenshot 4: "No barcodes, no typing. You just tap the count."
- Description: "AI identifies each bottle. You just type the count".
- Start-screen tip: "Type your total stock count on the number pad" — [CameraScan.tsx:970](/home/user/86d-mobile/src/screens/CameraScan.tsx)
- The app also does read barcodes. The camera-permission string in app.json's `infoPlist` mentions barcodes, though Expo's plugin string ("Allow 86'd to access your camera to scan bottles.") overrides it in the build: `permissions[permission] || infoPlist[permission] || description` — [app.json](/home/user/86d-mobile/app.json); [node_modules/@expo/config-plugins/build/ios/Permissions.js:32](/home/user/86d-mobile/node_modules/@expo/config-plugins/build/ios/Permissions.js)

**7. The scan screenshot comes last**
- The step the first run starts with (scan) is the 4th of 4 screenshots. Apple shows only the first one to three in search results — [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us); [Apple product page guidance](https://developer.apple.com/app-store/product-page/)

**8. Screenshot 3 shows the second count, with unexplained decimals**
- Screenshot 3 shows every bottle parred and grouped under a named distributor, with no Unassigned group and no "missing a par level" footer. The first run shows both (items 1–2).
- Its on-hand values 3.5 and 4.75 are typed by hand on the pad's "." key, and the listing never says so — [screenshot 3](screens/appstore/listing-position-3_86d-2-Par-1206x2622.png); [CameraScan.tsx:84](/home/user/86d-mobile/src/screens/CameraScan.tsx)

**9. "Download and go" vs. a returning-user screen first**
- A fresh install opens on the Login screen, because the unauthenticated default case renders `LoginScreen` — [App.tsx:135-144](/home/user/86d-mobile/src/App.tsx)
- That screen says "Welcome back / Sign in to keep your bar stocked". The way to sign up is the "New to 86'd?" button, "Start Free Trial" — [LoginScreen.tsx:139-140, 243-250](/home/user/86d-mobile/src/screens/LoginScreen.tsx)
- Then come four fields (Full Name, Email, Confirm Email, Password) plus a terms checkbox, or Sign in with Apple — [RegisterScreen.tsx:251-300](/home/user/86d-mobile/src/screens/RegisterScreen.tsx)
- Then the bar-name screen: "Welcome, {first name}" / "What's your bar called?" / "It goes at the top of the order emails you send to distributors." / optional phone / "Continue" / "Skip for now" — [BarNameScreen.tsx:91-158](/home/user/86d-mobile/src/screens/BarNameScreen.tsx)
- A fresh account also gets a default location named "My Bar" — [LocationContext.tsx:62-65](/home/user/86d-mobile/src/context/LocationContext.tsx)

**10. No hand-off from the sales conversation**
- No deep link, invite or pre-filled account, and attribution happens only afterwards (question 3). A prospect who has already told the founder their distributors re-enters everything — [app.json](/home/user/86d-mobile/app.json); [crm.py:1475-1533](/home/user/86d-api/crm.py)

**11. "Setup help" promised, no process behind it**
- The bar-name screen says "(optional, for setup help)"; the number only appears on a CRM list — [BarNameScreen.tsx:122](/home/user/86d-mobile/src/screens/BarNameScreen.tsx); [86d-api CLAUDE.md](/home/user/86d-api/CLAUDE.md)

**12. The founder's personal voice disappears after sign-up**
- Before: "If you have any questions, call me directly at 910-335-2760", and the website's "Call or text me." — [pitch.py:136](/home/user/86d-api/pitch.py); [my86d.com](https://my86d.com)
- After: the only lifecycle email is from "86'd Orders", signed "The 86'd team". Neither the app nor any email repeats the number — [main.py:3440-3460](/home/user/86d-api/main.py); question 6 repo search

**13. Trial messaging**
- The register screen promises "Start your free 15-day trial", but the clock started at sign-up, not at the first count — [main.py:324](/home/user/86d-api/main.py)
- Nothing in the app shows the trial until 5 days remain, and then not on the camera screen — [App.tsx:216-221](/home/user/86d-mobile/src/App.tsx)
- The email says "tap Subscribe"; the only Subscribe control during the trial is that banner — [main.py:3455](/home/user/86d-api/main.py); [TrialBanner.tsx:40-42](/home/user/86d-mobile/src/components/TrialBanner.tsx)

**14. Support paths contradict each other and the app**
- The App Store "Support" goes to the privacy policy. The /support page is unlinked and describes old screens ("Pricing under Management", "Needs a price", editing a scan in Review). The app has no help at all (question 6).

**15. A signup can still receive cold follow-ups**
- Unless the lead is marked `won` (question 4) — [crm.py:1519-1527, 1978-1980, 4311-4326](/home/user/86d-api/crm.py)

**Where messaging and app agree**
- Camera ID by label, then a manual count on a number pad. No fill-level or pen claims anywhere: [my86d.com](https://my86d.com); [iTunes lookup](https://itunes.apple.com/lookup?id=6798359825&country=us); [pitch.py:211-219](/home/user/86d-api/pitch.py); [CameraScan.tsx:954-970](/home/user/86d-mobile/src/screens/CameraScan.tsx)
- The camera pre-prompt ("We'll ask for camera access next — it's only used to identify bottles you scan." — [CameraScan.tsx:979](/home/user/86d-mobile/src/screens/CameraScan.tsx)) matches the dialog text Expo writes ("Allow 86'd to access your camera to scan bottles." — [app.json](/home/user/86d-mobile/app.json) plugin config)
- "15 days, no card" is true in code (no card collected at sign-up) — [main.py:3362-3366](/home/user/86d-api/main.py)
- "Cancel from the app" is true for subscribers (Settings → Manage Subscription) — [SettingsScreen.tsx:534-544](/home/user/86d-mobile/src/screens/SettingsScreen.tsx)
- "The bar gets a copy" is true (BCC) — [main.py:3277-3284](/home/user/86d-api/main.py)
- Order numbers on every email are true — [helpers.py:742-797](/home/user/86d-api/helpers.py)

### Inferences
- **Most likely to make it "feel complicated"** (my ranking, inference):
  - **First:** items 1 and 2. The user arrives expecting orders to sort themselves in 15 minutes. Instead the first Review shows a list of "Unassigned" bottles, a blocking "Set par levels first" alert, and a disabled "Assign All Distributors" button. Nothing before this point warned them, and there's no help in the app to explain why.
  - **Second:** items 9, 10 and 12. The warm, founder-led sales conversation ends in a cold, generic sign-in screen and no follow-up from the founder.
  - **Third:** items 7 and 8. The listing's search-visible screenshots set up the steady state, not the first day.
- **Small copy fixes would close most of the gap.** For example: say "your first count takes longer: you set each bottle's par and distributor once"; reorder the screenshots to Scan first; drop "no typing"; and add one line on the start screen about Review asking for pars and distributors on the first count. This is my inference, offered for the report writer, not a tested result.
- **The trial clock adds time pressure.** Because the clock starts at sign-up and the reminder is the first email, "try it on your next count" turns into a countdown that may run while the bar waits for its count day (inference).

### Gaps
- How long the first session really takes (sign-up to first sent order), and where users drop off: the CRM's `/funnel` activation and `/app-funnel` numbers are in production and weren't read.
- Only code paths were checked, not real devices or production builds. The rendered first-run screens were not seen (the parent's other workstream covers the first-run flow).
- The App Store screenshots may predate parts of the current UI (they show no case/bottle chips or "Add account #" boxes on the order screen). Their creation date is unknown.
