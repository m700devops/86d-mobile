# Activation, Trial Design and First-Run Measurement for a Small-Business iOS App (86'd)

Scope: evidence on getting a new user of a self-serve-plus-sales-assisted SMB iOS tool to first value fast. The app's setup: sign-up required before use (email + password, or Sign in with Apple), a 15-day trial with no card, then $49.99/month through web checkout. Many users come from the founder's cold calls and emails, and there are only a handful of sign-ups a week. Research date: 2026-10-19. "Vendor" means a figure published by a company that sells the related product. Older canonical sources are flagged with their year. Where I ran a calculation myself, it is in Inferences and labelled as mine.

## 1. Time to first value / the "aha moment" — does early core-action completion predict retention and paid conversion, and what are typical retention figures?

### Takeaway
Vendor product-analytics data agrees that the first days decide it. In Amplitude's 2,600-company dataset, top performers on day-7 return were usually still top performers at three months (69%). For half of all products, more than 98% of new users are inactive by day 14. In RevenueCat's Business category, 89.9% of trial starts happen on the install day. Most published D1/D7/D30 app-retention benchmarks are consumer-heavy aggregates with weak sourcing. For a tool used once a week, a "second count within ~7–10 days" milestone is a better lens than D1 retention.

### Cited Findings
#### Early activation and later retention (vendor product-analytics data)
- Amplitude's 2025 Product Benchmark Report (vendor; "over 2,600 companies"): "If you can get just 7% of your original cohort of users to return on day seven, you've crossed into the top 25% for activation performance." Amplitude uses day-7 return as its activation proxy and describes activation as the early action that signals core value, e.g. "creating the first task" — [Amplitude, "The 7% retention rule"](https://www.amplitude.com/blog/7-percent-retention-rule)
- Amplitude: 69% of top day-7 performers were also top performers at three months. It calls this a "strong correlation" but gives no coefficient — [Amplitude](https://www.amplitude.com/blog/7-percent-retention-rule)
- Amplitude: for half of all products, more than 98% of new users are inactive by day 14. The 90th-percentile day-14 activation rate is about 9%. B2B technology's 90th-percentile three-month retention is 15.6%. "Enterprise" top-10% day-7 retention is 12.4%, against a median of 2.1% — [Amplitude](https://www.amplitude.com/blog/7-percent-retention-rule)
- Methodology: the 7% article does not state its data period. A search excerpt of Amplitude's benchmark pages describes anonymized data from 2,600+ companies covering Sept 2023–Sept 2024 — [Amplitude industry benchmarks page](https://www.amplitude.com/blog/financial-services-product-benchmarks) (period not confirmed on the 7% page itself)
- Company-reported Amplitude case studies: SafetyCulture saw an 18% improvement in 30-day retention, Super.com a 90% increase in first-month retention, and WeMoney a 20% retention increase. These are vendor marketing and not controlled — [Amplitude](https://www.amplitude.com/blog/7-percent-retention-rule)

#### Activation-rate benchmarks (survey; canonical 2022)
- Lenny Rachitsky & Yuriy Timen, "What is a good activation rate" (Lenny's Newsletter, Oct 25, 2022; 500+ self-reported survey responses): average activation is 34% and median 25%. For SaaS only (excluding marketplaces, e-commerce and DTC), the average is 36% and the median 30%. "Good" is the 60th percentile and "great" the 80th — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate)
- Same source: activation rate = users who hit the milestone ÷ users who completed sign-up. A good milestone should retain users "at least 2x better" than users who don't reach it. Only ~6% of respondents used a time-bound definition. Among those, the median window was 10 days and the mode 7 days. Example milestones: "3+ sessions in the first week" and "10 items created and 2+ active editors by W4" — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate)
- A 2026 roundup compares Lenny's 30% SaaS median with a 37% median from Userpilot's report. It attributes the gap to different activation definitions (secondary source) — [Artisan Growth Strategies](https://www.artisangrowthstrategies.com/blog/saas-activation-rate-benchmarks-2026)

#### The first day is decisive in subscription apps (vendor, in-app-purchase apps)
- RevenueCat State of Subscription Apps 2026, Business category: **89.9% of Business trial starts happen on Day 0, the highest of any category.** Median download-to-trial (D30) is 9.1% (top quartile >16.2%). Median download-to-paid (D35) is 2.6% (top quartile >5.0%). Revenue per install is $0.31 at D14 and $0.50 at D60. Realized LTV per payer is $18.76 after 1 month and $35.48 after 1 year. New apps take a median of 113 days to reach $1K monthly revenue (the slowest category), and 14.7% reach $1K/month within 2 years. No Business sample count is given — [RevenueCat SOSA 2026 – Business](https://www.revenuecat.com/state-of-subscription-apps-2026-business)
- SOSA 2026 overall covers 115,000+ apps and $16B+ in revenue (RevenueCat SDK customers, App Store + Google Play) — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [SaaStr summary](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth)

#### Typical D1 / D7 / D30 app retention (mostly aggregators; weakly sourced)
- AppsFlyer's 2025 App Retention Benchmarks (vendor; excerpt only) says "News & Magazines, Business, Transportation, and Shopping continue to lead in retention across both platforms." It adds that in 2024 the platform gap persisted, with retention higher on iOS than Android. No category numbers were retrievable — [AppsFlyer 2025 retention benchmarks](https://appsflyer.com/?p=453529)
- Panto (aggregator, updated Oct 2026): iOS D1 25.4% and D30 5.3%, with no source named. Separately, "a 2026 Adjust benchmark" gives iOS D1 27%, D7 14% and D30 8%. "Productivity and utility apps" get a D30 range of 10–18%, labelled "directional 2026 ranges across multiple providers" with no named source — [Panto](https://www.getpanto.ai/blog/mobile-app-retention-statistics)
- Plotline (aggregator, Nov 2025): "Average 30-day retention across all apps is just 6%," attributed to Adjust, with no year given — [Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry)
- Mixpanel 2024 Benchmarks Report (vendor; 2023 data; 7,700 customers), via secondary coverage: week-one retention across industries fell from 50% to 28% compared with 2022. A drop that large may reflect a methodology change; I couldn't check it in the PDF — [Seven Peaks summary](https://sevenpeakssoftware.com/blog/mixpanel-benchmarks-report-2024); [Mixpanel 2024 report PDF](https://mixpanel.com/wp-content/uploads/2024/01/2024_Benchmarks_Report.pdf) (not read)

### Inferences
- Published D1/D7/D30 figures are dominated by consumer, daily-use apps. Bars count roughly weekly, so D1 retention says little here. The useful markers are weekly: "first count saved in the first session", "first order sent", and "second count within 7–14 days". Lenny's median 10-day and mode 7-day windows and Amplitude's day-7 lens fit that cadence.
- Candidate activation milestones for 86'd: (a) **setup moment**: first count saved in the first session, with a minimum number of bottles; (b) **value moment**: first order emailed to a distributor; (c) **habit moment**: second count within ~14 days. Lenny's test is that milestone-reachers should retain at least 2x better than non-reachers. At a handful of sign-ups a week, that comparison is anecdotal for months, so start with a reasoned definition and revisit it at ~50–100 sign-ups.
- RevenueCat's 89.9% day-0 trial-start figure comes from apps where the user starts the trial at an in-app paywall. 86'd starts its trial automatically at sign-up, so the matching risk is a first session that ends before a successful scan. The first session should be designed to end with a saved count.
- A 15-day trial holds only about two weekly counts. If the real "aha" is the second count or the first order, a user who starts mid-week can reach the paywall having seen it only once (see Q3).

### Gaps
- No primary, iOS-only Business or Productivity D1/D7/D30 numbers. AppsFlyer, Adjust and Sensor Tower category charts are gated or interactive, and Business of Apps wasn't retrieved. One search roundup cited productivity apps at ~17% D1 / 8% D7 / 4% D30 (attributed to Statista H1 2024, AppsFlyer, Adjust and others), but I couldn't tie it to a specific page. It also conflicts with Panto's 10–18% D30 range.
- Pendo's 2024/2025 benchmark numbers, OpenView's product benchmark reports and Reforge activation material were not retrieved. A claim attributed to Pendo, that "80% of features see low to no use", could not be verified.
- No published activation data for inventory, restaurant or bar software.

## 2. Sign-up before value — deferred registration, fields/screens before first use, Sign in with Apple, "confirm email" vs alternatives, and Apple Guideline 5.1.1(v)

### Takeaway
Apple's rule targets apps without significant account features. 86'd's per-bar product book, distributors and orders almost certainly count as such features, so requiring sign-up is a conversion question, not a compliance one. The evidence for deferring sign-up is real but old and mostly from consumer apps (Duolingo: ~20% more DAUs). Cutting fields and steps helps (Baymard, e-commerce). No independent controlled study isolates Sign in with Apple's effect on conversion. For email accuracy, the canonical advice is to confirm the email, not the password (Baymard, 2011). Domain-typo suggestions are a lower-friction alternative with a self-reported ~50% cut in bounces (Mailcheck, c. 2012–13).

### Cited Findings
#### Apple App Review Guidelines (primary; quoted verbatim from the live page, which showed no "last updated" date in the fetch)
- **5.1.1(v) Account Sign-In:** "If your app doesn't include significant account-based features, let people use it without a login. If your app supports account creation, you must also offer account deletion within the app. Apps may not require users to enter personal information to function, except when directly relevant to the core functionality of the app or required by law. If your core app functionality is not related to a specific social network (such as Facebook, WeChat, Weibo, X, etc.), you must provide access without a login or via another mechanism. Pulling basic profile information, sharing to the social network, or inviting friends to use the app are not considered core app functionality." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **5.1.1(x):** "Apps may request basic contact information (such as name and email address) so long as the request is optional for the user, features and services are not conditional on providing the information, and it complies with all other provisions of these guidelines…" — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- **4.8 Login Services:** apps that use a third-party or social login (e.g. Google Sign-In) for the primary account "must also offer as an equivalent option another login service" that limits data to name and email, lets users keep their email private, and doesn't collect interactions for advertising without consent. This isn't required if the "app exclusively uses your company's own account setup and sign-in systems" — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- **Before You Submit / 2.1(a):** "If your app includes account-based features, provide either an active demo account or fully-featured demo mode" — [Apple](https://developer.apple.com/app-store/review/guidelines/)

#### Deferred ("lazy") registration
- Duolingo (older, c. mid-2010s; Gina Gotthilf quoted from a First Round interview by Taplytics): moving the sign-up screen back a few steps produced about a 20% increase in DAUs. Taplytics describes the test as delaying sign-up until the user hit a milestone — [Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding)
- A marketing blog says Duolingo moved sign-up after a test lesson and saw a "20% jump in next-day user retention." It is unverified and reports a different metric from the DAU claim above — [StriveCloud](https://www.strivecloud.io/blog/blog-gamification-examples-boost-user-retention-duolingo)
- E-commerce analog: Baymard lists "Save Account Creation for the Confirmation Step" (Sept 2023), noting that 42% of sites don't — [Baymard](https://baymard.com/blog/checkout-form-fields)

#### Fields and steps before first use
- Baymard (US e-commerce checkout research): the average checkout has **11.3 form fields**, and **22%** of users report abandoning because of checkout complexity (listed June 2024). **14%** abandon if a phone field is simply required, and 39% of sites don't explain why it's required (July 2025). The page gives no sample sizes — [Baymard](https://baymard.com/blog/checkout-form-fields)
- Lenny's activation survey (2022): one respondent reported "Changed the flow to have fewer steps and improved it 20%." This is a single self-report — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate)

#### "Confirm email" vs alternatives
- Baymard (2011, canonical): "Always ask people to confirm their e-mail (rather than their password), since that's the single most crucial piece of information to get right." A mistyped password can be recovered with a reset; a mistyped address cannot — [Baymard, "Ask to Confirm E-mail, Not Password"](https://baymard.com/blog/confirm-email-not-password)
- Counterpoint (older; study not named): "60% of the test subjects consistently copy/pasted their e-mail when they retyped it in a confirmation field," so the second field may not catch typos — [UX Movement](https://uxmovement.com/forms/why-the-email-confirmation-field-must-die/)
- Domain-typo suggestion (Mailcheck by Kicksend, c. 2012–13, self-reported): offering "did you mean hotmail.com?" "reduced their sign up confirmation email bounces by 50%." Most bounces came from misspelled domains — [Mailcheck README](https://cdn.jsdelivr.net/npm/mailcheck@1.1.1/README.md); [Gigazine (2013)](https://gigazine.net/gsc_news/en/20130919-decreased-email-bounces). A Mailgun commenter reported a smaller ~5% gain from correcting domains only — [Hacker News](https://news.ycombinator.com/item?id=6109905)
- A marketer quoted in an email-deliverability roundup warns against silently auto-correcting addresses without the user's consent, which favours suggesting over correcting — [Suped](https://suped.com/email-deliverability/answers/should-i-correct-typos-in-existing-email-addresses-in-my-crm-and-what-are-the-best-practices-for)

#### Sign in with Apple
- **I found no independent, controlled study isolating Sign in with Apple's effect on sign-up conversion.**
- Flo Health (Auth0 case study; vendor): sign-ups rose from 6% to 75% ("12.5x") after Auth0 added social logins, including Sign in with Apple. Apple's effect is not separated from the others — [Auth0 / Flo Health case study](https://www.casestudies.com/company/auth0/case-study/flo-health-boosts-new-user-sign-ups-125x-with-auth0)
- Prevalence, not conversion: in a sample of 289 apps' sign-up/login screens, 72.7% show email, 48.8% Google and 43.6% Sign in with Apple — [Lazyweb Research](https://www.lazyweb.com/research/sign-in-with-apple-vs-google-vs-email-prevalence). A separate Lazyweb analysis observed 347 auth-screen experiments across 85 companies but measured no conversion lift — [Lazyweb](https://www.lazyweb.com/research/auth-screen-ab-tests-what-do-apps-change.md)
- One agency blog claims social login lifts sign-up conversion by 20–60%. It cites no study, so it is weak evidence — [Dogtown Media](https://www.dogtownmedia.com/social-login-for-mobile-apps-google-apple-linkedin-boosting-sign-up-conversion-by-removing-friction/)

### Inferences
- **Compliance:** 86'd's account holds the per-bar product book, distributor list, server-side scan entitlement and order emails. That is "significant account-based features" by any reasonable reading, so mandatory sign-up should pass 5.1.1(v). The app also follows 4.8, since it offers no Google login and Sign in with Apple is optional. Account deletion in-app is required, and App Review needs a demo account.
- **Deferred sign-up trade-off for 86'd:** every scan costs two paid AI calls and is gated server-side, so an anonymous mode needs abuse limits. A narrow "scan up to N bottles as a guest, then create your account to keep this count" path is the Duolingo pattern adapted. It matters most for App Store browsers; cold-call arrivals were already motivated by a person, so the payoff for them is smaller. A cheaper step is to make the one-tap Sign in with Apple path the visual default. It involves no typing and makes an email typo impossible.
- **Confirm Email:** the evidence (Baymard 2011) supports *making sure the email is right*, not necessarily a second field. Lower-friction options that still protect the only recovery path:
  - an inline domain-typo suggestion (Mailcheck-style), shown as a suggestion, never a silent correction;
  - reading the address back on the next screen ("We'll send receipts to dana@…; edit");
  - a later, non-blocking verification email with bounce detection. 86'd's backend already processes Resend bounce webhooks for distributors.

  The project's current rule (keep Confirm Email until verification exists) is consistent with this evidence.
- **Steps before first value today** (per the project's CLAUDE.md): auth screen (4 fields, or Sign in with Apple) → bar name (+ optional phone) → start screen (3 steps + camera pre-prompt) → iOS camera dialog → first scan → number pad. Each arrow is a drop-off point that should have its own event (see Q5).

### Gaps
- No rigorous, isolated Sign in with Apple conversion data, and no Apple-published conversion figures were found.
- No 2023–2026 controlled study of deferred registration for B2B or SMB mobile apps. The Duolingo evidence is old, consumer, and second-hand.
- Baymard's detailed confirm-email and typo research is paywalled. Older canonical field-removal examples, such as Expedia's removal of an optional field (~2010), were not verified this session.

## 3. Free-trial design — length, card-up-front vs no-card, when the clock starts, reverse trials, in-trial activity, trial-status display

### Takeaway
RevenueCat's 2026 data correlates longer trials with higher conversion: a 42.5% median for 17+ days against 25.5% for ≤4 days. The 10–16-day bucket did best on monthly plans (46.6%). These are App Store trials, which auto-renew with a card on file, so they are not comparable to a no-card trial. For no-card ("opt-in") SaaS trials, about 17–18% of trials convert, against ~49% with a card (First Page Sage, agency data). Card-required trials attract roughly a third as many sign-ups, so the number of paying customers per visitor comes out about equal. Vendor data says trial decisions cluster in the first day or week. I found no published evidence on starting the trial clock at first use rather than sign-up, and only anecdotal evidence on reverse trials.

### Cited Findings
#### Trial length (vendor; App Store + Google Play in-app trials)
- RevenueCat, "How long should your free trial be? Data from 17,000+ apps" (blog dated Sept 28, 2026, citing SOSA 2026): "42.5% median conversion rate for trials of 17+ days, versus 25.5% for trials of four days or less." Methodology: data from Aug 2025–Jul 2026; median app-level rates; segments need >100 eligible trials; groups of <20 apps are directional; trials longer than 32 days are excluded; the article calls the pattern "correlational" — [RevenueCat](https://www.revenuecat.com/blog/growth/free-trial-length)
- Same source, trial-to-paid by length:
  - Monthly plans: ≤4 days 39.6%, 5–9 days 45.9%, **10–16 days 46.6%**, 17–32 days 43.7%.
  - Annual plans: ≤4 days 24%, 5–9 days 33%, 10–16 days 43%, 17–32 days 44.6%.
  - Weekly plans: ≤4 days 22.3%, 5–9 days 24.3%.

  [RevenueCat](https://www.revenuecat.com/blog/growth/free-trial-length)
- Same source, first renewal on monthly plans: no trial 49.5%, ≤4 days 54.2%, 5–9 days 62.8%, 10–16 days 72%, 17–32 days 77.5%. The top 100 Productivity apps favour trials of ≤4 days, and Business was not covered — [RevenueCat](https://www.revenuecat.com/blog/growth/free-trial-length)
- Conflict: a companion RevenueCat post (as summarised in search results) says conversion for trials under 4 days rose from 42.1% (2025) to 46.5% (2026). That is hard to square with the 25.5% figure above, so the two probably measure different things — [RevenueCat 2026 trends](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- The same trends post reports that D35 trial-to-paid conversion is "5x better" with a hard paywall. That is a search-excerpt wording and was not confirmed in the full text — [RevenueCat 2026 trends](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)

#### When the trial decision is made
- Business apps: 89.9% of trial starts happen on Day 0 — [RevenueCat SOSA 2026 – Business](https://www.revenuecat.com/state-of-subscription-apps-2026-business)
- 3-day trials: 55.4% of cancellations happen on Day 0 and 84% by Day 1 (SOSA 2026, via SaaStr). RevenueCat says the previous year's Day-0 share was ~51% — [SaaStr](https://saastr.com/the-top-10-learnings-from-revenuecats-state-of-subscription-apps-how-115000-mobile-apps-deliver-16b-in-revenue-whats-working-whats-quietly-killing-growth); [RevenueCat](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026). Secondary write-ups give Day-0 shares of 39.8% (7-day), 35.7% (14-day) and ~31% (30-day); these are unverified and some secondary sources conflict — [Admiral Media](https://admiral.media/app-free-trial-optimization/)
- SaaS: ChartMogul's documentation says trial-to-paid conversions often peak around the first week — [ChartMogul help](https://help.chartmogul.com/hc/en-us/articles/115000865205-Chart-Trial-to-Paid-Conversion-Rate)

#### Card up front ("opt-out") vs no card ("opt-in") — SaaS web trials
- First Page Sage 2026 report (agency's own client data): opt-out trials convert 2.7% of visitors to sign-up and 49.1% of those to paid. Opt-in trials convert 7.6% of visitors to sign-up and 17.3% to paid. That works out to ~13.3 vs ~13.1 paying customers per 1,000 visitors, about equal. Freemium draws 12.8–14.1% of visitors and converts 3.4–3.7% to paid — [First Page Sage](https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/)
- An earlier First Page Sage version (86 SaaS companies, Q1 2022–Q3 2025, updated Sept 2025) gives visitor-to-trial of 8.5% opt-in vs 2.5% opt-out, and trial-to-paid of 18.2% vs 48.8%. It counts a single paid month as a conversion. This version is relayed by secondary articles and a search excerpt of First Page Sage's site; I didn't read it on the live page, which now shows the 2026 figures above — [First Page Sage](https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/); [Visionary Marketing (secondary)](https://visionary-marketing.co.uk/blog/saas-free-trial-conversion-statistics-2026)
- ChartMogul SaaS Conversion Report 2026, via a secondary blog (unverified): 31.4% sign-up-to-paid with a card vs 8.9% without; ~11 vs ~4 paying customers per 1,000 visitors. This contradicts First Page Sage's "about equal" per-visitor result — [Mean CEO](https://blog.mean.ceo/?p=11198)
- A small self-published dataset (38 SaaS accounts): 60.4% opt-out vs 25.2% opt-in, and 4.7% freemium — [Visionary Marketing](https://visionary-marketing.co.uk/blog/saas-free-trial-conversion-statistics-2026)

#### Reverse trials
- Definition (Kyle Poyar, Growth Unhinged, June 2022): new users start with a time-limited trial of paid features, then buy or downgrade to a free tier. Airtable is named as an early pioneer — [Growth Unhinged](https://www.growthunhinged.com/p/your-guide-to-reverse-trials)
- Poyar's framing (TechCrunch, Nov 2022): freemium drives more sign-ups, while free trials convert free-to-paid at a higher rate. A reverse trial tries to get both — [TechCrunch](https://techcrunch.com/2022/11/12/freemium-or-free-trials-why-not-both/)
- Commenters on Elena Verna's reverse-trials post report higher conversion anecdotally (Supademo) and raise a fraud risk: users creating new accounts to regain premium access — [Elena Verna](https://www.elenaverna.com/p/reverse-trials-examples/comments)
- Reverse-trial conversion figures (e.g. "7% to 21%") appear only in vendor blogs with no dataset — [Command AI](https://command.ai/blog/maximize-your-conversion-with-reverse-trials)

#### Activity during the trial as a predictor
- Lenny (2022): a good activation milestone should retain at least 2x better than non-activation — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate)
- Vendor claim: trials that hit activation within 24 hours convert at 2.3x the rate of those activating after day 3. It is attributed to a ChartMogul 2026 report I couldn't verify — [Arcade](https://www.arcade.software/post/free-trial-conversion-playbook-2026)
- Method guidance: define the activation milestone as the action that statistically predicts conversion, and check it against at least 60 days of baseline data (vendor guide) — [Monetizely](https://www.getmonetizely.com/articles/the-complete-guide-to-measuring-free-trial-signup-and-activation-rates-for-saas-success)

### Inferences
- **Use the right benchmark.** An App Store trial auto-converts unless cancelled, with payment already on the Apple ID, so RevenueCat's 25–47% medians are opt-out-like. 86'd's trial is web, no card, and requires a deliberate checkout, which is First Page Sage's opt-in case: about **17–18% trial-to-paid** as an external reference point. At ~5 sign-ups a week, that means roughly one paying bar a week, and the week-to-week noise is huge (see Q5).
- **Length:** 15 days sits in RevenueCat's best monthly bucket (10–16 days). The data is correlational and from a different trial type, so it supports keeping 15 days rather than changing it. The tighter constraint is cadence: 15 days covers about two weekly counts.
- **When the clock starts (no published evidence; options for 86'd):**
  - (a) keep sign-up start, but guarantee two counts, e.g. extend once if the bar hasn't finished its second count by day 15;
  - (b) start the 15 days at the first saved count, so a sign-up on a call that doesn't scan until next week doesn't lose days;
  - (c) keep it as is and make the founder's follow-up land the first count early.

  The backend already preserves remaining free days when someone subscribes early (Stripe `trial_end`), so (a) and (b) are server-side changes.
- **Card up front is a poor fit.** Checkout is web-only and leaves the app, so requiring a card before first use would add a browser detour ahead of the core action. The per-visitor parity in the First Page Sage data also means the higher rate buys nothing for an app whose bottleneck is the number of sign-ups.
- **Reverse trial:** there is no free tier to downgrade to, so one would mean a product decision (e.g. free counting forever, with ordering and the distributor email paid). The evidence for it is anecdotal; a low priority at this scale.
- **Trial status display:**
  - Show "X days left" quietly *after* the first count, not before value.
  - Send a reminder ~2–3 days before the end, with a recap of value (bottles counted, orders sent, minutes saved if measurable).
  - At the paywall, restate the facts the cold call promised: no card was needed, cancel any time, the price.

  This is reasoning from the decision-timing data, not tested evidence.

### Gaps
- No published test of starting the trial clock at sign-up vs at first use or first value.
- No benchmarks for no-card, web-checkout trials in SMB iOS apps specifically. ChartMogul's 2026 figures were not verified at the source and conflict with First Page Sage.
- No rigorous evidence on how to display trial status (banners, countdowns, reminder timing).
- Reverse-trial outcome data is anecdotal or vendor-only.

## 4. Human-assisted onboarding for SMB software — founder calls, concierge setup, email/SMS nudges, and users arriving from cold outreach

### Takeaway
Human help in onboarding has strong canonical endorsement but almost no controlled measurement. Examples: Stripe's "Collison installation" (Paul Graham, 2013); Superhuman's mandatory 30–60-minute onboarding call; "we called everyone who did not complete onboarding" among Lenny's top tactics. The only quantified B2B figure I found is an old, ambiguous OpenView slide: 35% higher trial conversion when sales reached out. Welcome emails get very high reported opens (~84%, GetResponse), but opens are inflated, so measure clicks and actions.

### Cited Findings
- Paul Graham, "Do Things That Don't Scale" (July 2013, canonical): "At YC we use the term 'Collison installation'… When anyone agreed to try Stripe they'd say 'Right then, give me your laptop' and set them up on the spot." Also: "The most common unscalable thing founders have to do at the start is to recruit users manually"; "pick a single user and act as if they were consultants building something just for that one user"; and "Your first users should feel that signing up with you was one of the best choices they ever made." — [Paul Graham](https://paulgraham.com/ds.html)
- Superhuman: CEO Rahul Vohra's podcast episode is billed as covering how the company "manually onboards every new user." Lenny's notes that ~20 staff did manual onboarding at peak, building superfans and word of mouth — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/superhumans-secret-to-success-rahul-vohra). A 2019 write-up calls it a mandatory 30–60-minute human onboarding call — [Creator Lab podcast notes](https://creatorlabfm.libsyn.com/deep-dive-into-finding-product-market-fit-rahul-vohra-founder-amp-ceo-superhuman). A firsthand account describes a session of at least 30 minutes — [Gainsight](https://www.gainsight.com/blog/5-lessons-i-learned-from-superhumans-onboarding/). First Round Review (Gaurav Vohra) describes later moving those 1:1 learnings into a self-serve in-product flow — [First Round Review](https://review.firstround.com/superhuman-onboarding-playbook.md). A claim that one onboarding specialist added "$650k ARR" is unverified — [Flowjam](https://www.flowjam.com/blog/superhuman-onboarding-teardown-30-minute-wow-session)
- Lenny's activation survey (2022): "sales outreach" is the sixth of eight most-referenced activation tactics, with respondent quotes such as "We called everyone who did not complete the onboarding process to complete it." No effect size is given — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate)
- OpenView benchmark slides (2020, older): 35% higher conversion when sales reached out during the trial. The same slide says outcomes were the same with no outreach as with customer-success outreach, and notes that sales can't reasonably reach low-ACV leads. The labels are hard to parse, so treat it as ambiguous — [SlideShare (OpenView)](https://www.slideshare.net/slideshow/how-organizations-can-focus-sales-for-maximum-impact/235344093)
- A first-hand account of hand-reviewing sign-ups and calling trialists says it was "tedious but illuminating," with no conversion numbers — [Outfunnel](https://outfunnel.com/product-led-sales-getting-started/)
- Welcome-email benchmarks (vendor):
  - GetResponse reports an average welcome-email open rate of 83.63% — [GetResponse](https://www.getresponse.com/resources/reports/email-marketing-benchmarks?frame=0).
  - A GetResponse global study reported 84.22% opens and 25.91% click-through — [MediaPost](https://www.mediapost.com/publications/article/332106/welcome-emails-produce-high-open-rates-worldwide.html).
  - Stripo (Aug 2026), citing GetResponse, gives a 16.6% welcome-email CTR and recommends measuring clicks and revenue because open rates are inflated — [Stripo Research](https://research.stripo.email/welcome-email-open-rates).
  - For contrast, Folderly's 2025 platform data puts *all* emails at 21.5% opens and 2.62% CTR — [Folderly](https://generate.folderly.com/blog/email-benchmarks-report-2025).
- SMB restaurant software: 7shifts publishes customer outcome stories (e.g. Fork & Fire: "+70% faster payroll processing") but no onboarding or activation metrics were found — [7shifts customers](https://www.7shifts.com/customers/)

### Inferences
- **Cold-call and email arrivals differ from App Store browsers.** A person has already created the motivation, so what's usually missing is *ability*: installing, signing in, getting the camera working, scanning the right shelf. The highest-leverage move is the Collison installation adapted to a phone call: stay on the line while they install, use Sign in with Apple, and scan one bottle. If it's the middle of service, book the **first count together** at the bar's usual count time.
- **A minimal human-assist protocol** at a handful of sign-ups a week, inferred from the sources above:
  - (1) Same day: a personal text or email from the founder with the App Store link and one sentence on what the first count looks like.
  - (2) If no saved count within 24–48h: a call ("want me on the phone for your first count?").
  - (3) If a count but no order by ~day 7: offer to set up distributors together. The distributor email is the value moment.
  - (4) Around day 11–12: a check-in before the trial ends, with a value recap.

  Do this for *everyone*: at this volume a holdout group can't be read anyway (see Q5), and Graham's essay argues for doing it regardless.
- **Linking the call to the account:** the CRM already matches leads to users by email, then by business name. A per-lead link or code on the App Store link (or asked at sign-up) would make the attribution exact. Then "came from a call" vs "organic" can be split in every funnel view.
- **Email measurement:** judge onboarding emails on downstream actions (a count saved after the email), not opens, given the inflation the sources note.

### Gaps
- No controlled or published evidence isolating the lift from a founder call, concierge setup or a "first count together" session in SMB software.
- No SMS-nudge benchmarks were gathered; the commonly repeated "98% SMS open rate" was not verified and should not be used.
- No activation case studies from Square, Toast, Shopify, Gusto or 7shifts were found this session.
- No data comparing activation of outbound-sourced users with App Store-sourced users.

## 5. Measuring and testing a first-run funnel at a handful of sign-ups a week

### Takeaway
At ~5 sign-ups a week, A/B tests and funnel percentages can't detect realistic differences. My calculation: detecting a 30%→45% change needs ~160 users per arm. Read each user's timeline individually, put confidence intervals on any rate you quote (MeasuringU's adjusted-Wald), and find problems with small qualitative studies. NN/g still recommends 5 users per qualitative round, though Faulkner (2003) showed any single 5-user set can find as little as 55% of problems. Apple's guidelines require consent and disclosure for usage-data collection, and Apple made apps disclose or remove hidden session recording in 2019. So mobile session replay is costly and risky here; server and scan logs plus observation do most of the job.

### Cited Findings
#### Small-n usability testing
- NN/g (Jakob Nielsen, "How Many Test Users in a Usability Study?", 2012): "test 5 users in a qualitative usability study. This answer has been the same since I started promoting 'discount usability engineering' in 1989." Exceptions: quantitative studies need at least 20 users, card sorting at least 15 per user group, and eyetracking heatmaps about 39. Some low-overhead projects need only 2 users, others 8+ — [NN/g](https://www.nngroup.com/articles/how-many-test-users/)
- The basis is the Nielsen–Landauer model, under which ~5 users find ~85% of problems. A secondary source notes it applies to one focused flow and misleads for multi-segment comparisons — [Monolytics (secondary)](https://monolytics.app/blog/how-to-test-usability-usability-testing-with-5-users/)
- Faulkner (2003), 60 users with random subsets resampled: sets of 5 found between 55% and 99% of problems. With 10 users the lowest set found 80%; with 20 users, 95% — [PubMed abstract](https://pubmed.ncbi.nlm.nih.gov/14587545/)

#### Statistics for small samples
- MeasuringU / Lewis & Sauro: for completion-type rates with small samples, use the **adjusted-Wald** interval. For 95%, add ~2 successes and ~4 trials. It gives the best coverage for samples under ~150, and the plain Wald should be avoided under ~100. Worked example: 18/20 gives a 95% CI of 68.7%–98.4% — [MeasuringU calculator](https://measuringu.com/wald/); [MeasuringU small-n guidance](https://measuringu.com/small-n/); [Lewis & Sauro, JUS 2006](https://uxpajournal.org/wp-content/uploads/sites/7/pdf/JUS_Lewis_May2006.pdf)
- Same research: for a point estimate when there's no prior, use the Laplace method. A 95% adjusted-Wald interval's midpoint is not the best point estimate — [Lewis & Sauro, JUS 2006](https://uxpajournal.org/wp-content/uploads/sites/7/pdf/JUS_Lewis_May2006.pdf)
- Activation is measured against users who *completed sign-up* (Lenny's definition), so pre-sign-up drop-off has to be tracked separately — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-activation-rate)

#### Privacy rules that constrain instrumentation (primary)
- Apple 5.1.1(ii): "Apps that collect user or usage data must secure user consent for the collection, even if such data is considered to be anonymous at the time of or immediately following collection… Apps must also provide the customer with an easily accessible and understandable way to withdraw consent." — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- Apple 5.1.1(i): the privacy policy must "Confirm that any third party with whom an app shares user data… such as analytics tools, advertising networks and third-party SDKs… will provide the same or equal protection" — [Apple](https://developer.apple.com/app-store/review/guidelines/)
- Session replay precedent (Feb 2019): TechCrunch found popular iOS apps (Expedia, Hotels.com, Air Canada, Abercrombie & Fitch and others) using Glassbox session replay. It recorded screens and taps, masking was inconsistent, and none of the apps disclosed it in their privacy policies. Apple told developers to remove or disclose screen-recording analytics code — [TechRadar](https://www.techradar.com/news/apple-cracks-down-on-apps-that-record-your-screen); [9to5Mac](https://9to5mac.com/?p=578297); [Fast Company](https://www.fastcompany.com/90303599/some-iphone-apps-are-secretly-recording-your-screen)

### Inferences
- **Calculations below are mine**, using MeasuringU's adjusted-Wald method, Fisher's exact test, and the standard two-proportion sample-size formula. Python was used to check them, and the 18/20 case reproduces MeasuringU's 68.7%–98.4%.
  - 3 of 5 sign-ups activating → 95% CI **23%–88%**; 1/5 → 2%–64%; 0/5 → 0%–49%; 5/5 → 51%–100%; 6/10 → 31%–83%; 12/20 → 39%–78%. A month of data (~20 sign-ups) still leaves a ±20-point band.
  - Two versions at 10 users each: 3/10 vs 6/10 (a doubling) gives Fisher p ≈ 0.37, so the two can't be told apart. Only 2/10 vs 8/10 reaches p ≈ 0.02.
  - Sample size for 80% power at α = 0.05: 30%→45% needs ~160 per arm (~320 sign-ups, about 64 weeks at 5 a week); 30%→60% needs ~40 per arm (~16 weeks). **A/B testing the first run is not viable at this scale.** Change one thing at a time, note the date, and judge by per-user observation plus large effects only.
  - Zero failures in n users still allows a true failure rate of up to ~3/n ("rule of three"; exact: 45% for n = 5, 26% for n = 10). "Nobody had trouble with the camera prompt" after 5 users is weak evidence.
  - Problem discovery, 1 − (1 − p)^n: a problem hitting 31% of users is seen with 84% probability by 5 users. One hitting 10% of users is seen only 41% of the time with 5 users, and 65% with 10. Rare first-run failures (a denied camera, a bad-wifi scan) need logs, not tests.
- **Events to instrument.** The five existing pre-sign-up events are app_opened, login_viewed, register_viewed, register_submitted and register_succeeded. Each new event should carry the user/anon id, a timestamp relative to sign-up, the lead source (call / email / organic) and the build. Suggested additions:
  - `auth_method` (apple / email), `register_error` (type)
  - `bar_name_saved`, `phone_given` (y/n)
  - `start_screen_viewed`, `start_screen_dismissed`, `camera_preprompt_viewed`
  - `camera_permission_result` (granted / denied / restricted, plus `canAskAgain`), `settings_opened_from_blocked`, `permission_recovered_on_foreground`
  - `first_scan_attempted`, `scan_result` (identified / needs-confirmation / unreadable / no-bottle / network-fail, with latency)
  - `count_entered` (pad), `first_count_saved` (n bottles), `review_opened`
  - `distributor_added`, `first_order_sent` (n distributors)
  - `paywall_viewed`, `checkout_opened`, `subscribed`

  The server's `scan_events` and `scan_outcomes` rows already give the ground truth on scan success and latency per user, and can be joined in without new client code.
- **How to read it:** a weekly 30-minute ritual. List every new account with a one-line timeline (signed up → first scan at +4 min → 23 bottles → no order yet → trial day 6). Tag each with its source and with what the founder knows from the call. With fewer than ~50 users, read individual journeys rather than percentages, and put a confidence interval on any rate you share.
- **Cheap qualitative protocols** (my design, grounded in the NN/g and Faulkner findings):
  - (1) **5-user moderated think-aloud on a preview build** with bartenders or managers who aren't customers. Tasks: install → sign up → scan 10 bottles on a real shelf → send a test order. Run 3–5 users, fix, and run again; Faulkner's variance argues for more than one round.
  - (2) **Watch a real first count:** with permission, join a new customer's first count in person or over FaceTime, and note every hesitation, wrong tap and lighting or shelf problem. This is the observation the scan logs can't replace.
  - (3) **Day 3–7 interview, 15 minutes:** ask about what they actually did, not opinions. "Walk me through your last count." "What did you do on paper this week?" "What almost stopped you?" "Who else touched the app?"
  - (4) **Trial-end call** for anyone who doesn't convert: one question about the deciding moment.
- **Session replay:** given 5.1.1(ii)'s consent requirement and the 2019 Glassbox episode, any replay SDK would need consent, disclosure in the privacy policy and App Privacy label, and strict masking. It must never record the camera view, a bar's stock levels or the password field. At this volume, scan logs plus one observed count per new bar answer more for less risk.
- **A compliance question to check:** the app already posts pre-sign-up funnel events with a random per-install id. Apple's literal 5.1.1(ii) text asks for consent "even if such data is considered to be anonymous." How the app satisfies this (privacy policy, App Privacy "Analytics" label, any consent surface) is worth confirming. This is not legal advice.

### Gaps
- No source was retrieved on the validity or limits of unmoderated remote usability testing (e.g. UserTesting, Maze), or on remote mobile testing tools.
- Mobile session-replay SDKs' current masking defaults (PostHog, Sentry, UXCam, etc.) and US state wiretap-law litigation over session replay (e.g. California's CIPA) were not researched.
- No published example of a startup with fewer than 10 sign-ups a week formally evaluating its onboarding was found. The protocols above are reasoned from general small-sample research, not from a case study.
