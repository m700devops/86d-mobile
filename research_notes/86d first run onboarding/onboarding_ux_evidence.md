# First-run onboarding UX evidence: up-front tutorials vs. learning by doing, and how much text people read

Compiled 2026-10-19. How rigorous each source is, marked inline: **[R]** peer-reviewed or methodologically reported study · **[P]** practitioner research with a stated method (mostly NN/g) · **[G]** platform guideline · **[V]** vendor, marketing or case-study figure (indicative only; usually the vendor's own customers, no controls).

## 1. Up-front tutorials (deck-of-cards carousels, "how it works" screens, feature tours): skip rates, effect on comprehension, task success and retention, NN/g's position, and tour-completion benchmarks

### Takeaway
The best controlled mobile evidence (NN/g 2020: 70 users, 4 iPhone apps) found that deck-of-cards tutorials did not improve task success or speed, and that people who saw them rated the tasks harder. A field experiment with more than 45,000 players found tutorials paid off only in a complex, unconventional game. A mobile A/B test with more than 160,000 users found that removing a tutorial raised logins and sign-ups. NN/g's position from 2020 to 2024 is to skip onboarding when possible, and when it can't be skipped, to keep it brief and optional with one concept per card, preferring interactive or contextual help. Vendor tour data agree on one point: completion drops sharply after 3–4 steps.

### Cited Findings
**Controlled and large-sample studies**
- [P] NN/g, "Mobile Tutorials: Wasted Effort or Efficiency Boost?" (Alita Kendrick, 8 Mar 2020). Between-subjects, remote unmoderated quantitative test on Userlytics. 70 participants who had never used the 4 test iPhone apps, all of which had deck-of-cards tutorials (Movesum, Brainsparker, LaunchCenter Pro, Sketch.Book). 35 were assigned to read the tutorial and 35 to skip it; 13 trials (5%) were excluded. — [NN/g](https://www.nngroup.com/articles/mobile-tutorials/)
  - Task success: 91% with the tutorial vs 94% skipped, not significant (p = 0.443).
  - Perceived ease (SEQ, 1–7, higher = easier): 4.92 with the tutorial vs 5.49 skipped, significant (p = 0.047). "Half a point is a fairly substantial difference on a 1–7 rating scale."
  - Time on task (geometric mean, successful trials, tutorial reading time excluded): 93.49 s vs 85.17 s, not significant (p > 0.1). Reading the tutorial is an additional cost on top of this.
  - Conclusion: "Think twice about creating a tutorial for simple applications"; the effort is better spent making the UI easy to use. Stated limitation: only 4 iOS apps.
  - Caveat: reading vs skipping was *assigned*, so this study gives no natural skip rate.
- [R] Andersen, O'Rourke, Liu, Snider, Lowdermilk, Truong, Cooper & Popović, "The Impact of Tutorials on Games of Varying Complexity," CHI 2012. Multivariate field experiment: 8 tutorial designs in 3 games, more than 45,000 new players (including 13,158 in Refraction and 9,743 in Foldit). Tutorials raised play time by up to 29% and progress by up to 75%, but only in Foldit, "the most complex and least conventional game we studied." In the two simpler games the effect was "surprisingly negligible." The authors conclude that "investment in tutorials may not be justified for games that can be learned through experimentation," and that players "seem to learn more from experimentation than from reading text." — [Andersen et al. 2012 (PDF)](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf)
- [V] Vevo (vendor case via Apptimize): an A/B test removed the onboarding tutorial so the first screen after the splash page was login. It ran 28 days with more than 160,000 participants. Completed logins rose almost 10% and completed sign-ups about 6%, reportedly with no notable effect on engagement (videos watched). Vevo's stated rationale was that most users "were just swiping through the tutorial without reading any of the copy." — [Mobile World Live](https://www.mobileworldlive.com/focus-apps/apptimize-onboarding-tutorials-value-ab-testing/); [MarTech Series](https://martechseries.com/video/video-marketing/why-mobile-growth-is-actually-about-retention-how-optimizing-in-app-experience-leads-to-2x-faster-growth/). Caveats: the figures come from search-result excerpts, because Mobile World Live returned 403 to my fetcher and the original Apptimize write-up (apptimize.com/?p=6405) now redirects to Airship's homepage. MarTech Series describes the change as cutting the flow from four screens to two and reports only the ~6% sign-up gain.
- [R] Fröhlich, Kobiella, Schmidt & Alt, "Is It Better With Onboarding? Improving First-Time Cryptocurrency App Experiences," ACM DIS 2021. Semi-structured interviews (n = 16) on how people make sense of new mobile apps, then onboarding task flows built on the minimalist-instruction framework and evaluated with n = 16 on two crypto apps. Well-designed onboarding improved perceived usability for first-time users of *feature-rich* apps, and the framework helps decide both how to build onboarding and when to skip it. — [Fröhlich et al. 2021 (PDF)](https://www.unibw.de/usable-security-and-privacy/publikationen/pdf/froehlich2021dis1.pdf/@@download/file/froehlich2021dis1.pdf); [dissertation record](https://edoc.ub.uni-muenchen.de/31095/)

**NN/g's current recommendations (2020–2024)**
- [P] "Mobile-App Onboarding: An Analysis of Components and Techniques" (Alita Kendrick, 21 Jun 2020) — [NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/)
  - Core position: skip onboarding when possible. It raises interaction cost, strains memory and may not improve performance; even skipping costs a tap. "People are simply unlikely to (even try to) remember a lot of information."
  - Deck-of-cards is not recommended. If one is used: a highly visible Skip, as few cards as possible, one concept per card.
  - Instructional onboarding "should not be used to supplement poor design"; if used, keep it "brief, optional."
  - Onboarding is justified in three cases: the app needs user information to start (e.g., identity confirmation for banking); functionality is tailored to the user's context (e.g., a diet app asking current weight); or features are unique or unfamiliar (e.g., mobile check deposit when it was new).
  - Test without onboarding first, try design fixes before adding onboarding, and keep onboarding only if it measurably improves success.
- [P] "Onboarding Tutorials vs. Contextual Help" (Page Laubheimer; the page is dated 12 Feb 2023) — [NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)
  - Tutorials "interrupt users, don't necessarily improve task performance, and are quickly forgotten."
  - "We find that users frequently skip them," and tutorials are "dramatically overused." Push revelations are "pushy, devoid of context, and intrusive." The root cause is the "paradox of the active user": people want to act now, even though learning first would pay off later.
  - Exceptions: walkthroughs "were useful for onboarding new users to a novel interaction paradigm like AR." ArcGIS's tutorial is praised because it "required users to perform the task, rather than simply showing them how to do it," and lived in a sidebar rather than launching automatically.
  - No percentages or sample sizes are reported.
- [P] "AR-Onboarding Walkthroughs in Mobile Apps" (Sana Behnam & Raluca Budiu, 25 Sep 2022; usability testing with 11 participants) — [NN/g](https://www.nngroup.com/articles/ar-walkthroughs/)
  - Deck-of-cards walkthroughs "often caused cognitive overload." Participants couldn't fully remember their content and had to reopen help or relaunch.
  - Users "tend to dismiss lengthy or complex walkthroughs" at first launch.
  - Interactive walkthroughs were "generally more effective than static walkthroughs."
- [P] "New Users Need Support with Generative-AI Tools" (Feifei Liu, 29 Mar 2024; qualitative, 6 participants, 3 chatbots): "Keep onboarding brief." Users skip information that seems irrelevant, so long tutorials and early tips often go unread. Show contextual help at first use instead. — [NN/g](https://www.nngroup.com/articles/new-AI-users-onboarding/)

**Vendor product-tour benchmarks** (web SaaS in-product tours, not mobile first-run screens; indicative only)
- [V] Chameleon 2019 report. Based on 15 million product-tour interactions; customers are mostly small (33.7% of companies under 1,000 MAU, 38.3% at 1,000–2,000). — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)
  - Average completion: 61%.
  - By length: a 4-step tour completes at 46% vs 23% for 5 steps. "A 3-step tour is twice as likely to be completed as a 6-step tour."
  - Average time spent on a whole tour: 12 seconds. "Attention drops off after a tour is more than two steps long."
  - Progress indicators raised completion 12% and cut dismissal 20%.
  - Self-started tours (hotspot or launcher) completed at a 123% higher rate than automatic ones; tours triggered by an event the user just completed, +38%.
  - Conclusion: "an ideal tour is 2 steps long, 2 lines of text per step, with a progress indicator and triggered by a user action."
- [V] Chameleon, 2020 data (214 million interactions): among multi-step tours, 3-step tours complete most often (66%). Completion falls below 50% after five steps and drops sharply beyond eight. — [Chameleon blog](https://www.chameleon.io/blog/chameleon-benchmark-report)
- [V] Chameleon 2024 report (calendar-2023 data, ~300 million interactions, via Mixpanel). — [Chameleon 2024](https://www.chameleon.io/benchmark-report-24)
  - Average completion: 33.5% (up from ~30% in earlier reports). Tours of more than four steps complete below average; 5-step tours, 21.6%.
  - Tours started from a checklist launcher: 64%, regardless of length.
  - Average step length: 23 words.
  - Internal inconsistencies: tours started are given as 15.96M in the overview and "nearly 40 million" in the tours section. Average time per tour is 154 s, versus 12 s in 2019 — probably measured differently.
- [V] Userpilot 2024 (188 companies): onboarding-checklist completion averages 19.2%, median 10.1%. Best industry is FinTech & Insurance at 24.5%; lowest is MarTech at 12.5%. — [Userpilot](https://userpilot.com/blog/?p=197841)
- [V] The often-repeated "Appcues: 40–60% onboarding completion" and "cut steps 30% → up to +50% completion" figures could not be traced to any primary Appcues report. — [ideaplan.io (secondary)](https://www.ideaplan.io/metrics/onboarding-completion-rate)

### Inferences
- The 86'd scan flow (point the camera, the AI names the bottle, type the count) is simple and conventional. For tasks like that, the controlled evidence predicts that a 3-step "how it works" card won't raise first-scan success, may slightly lower perceived ease, and will mostly be swiped past. Its expected value is small at best, and its costs are small but real: taps, seconds, and a "this looks complicated" first impression.
- Three steps is inside every benchmark's comfortable range (≤3–4), so length alone isn't the risk. What matters more is what the card holds (passive explanation vs doing) and how much copy is on it.
- The strongest case for any up-front screen in this app is the camera pre-permission heads-up (see Q4), not the "how it works" explanation.
- The benchmark curves come from web tours that people can ignore and keep working past. A full-screen first-run card interrupts harder, so absolute completion rates may differ. The direction — shorter tours get finished more — holds in every dataset.

### Gaps
- I found no public study that measures how many people naturally skip mobile first-run carousels. NN/g 2020 assigned skipping, and Vevo's "most users swiped without reading" is an observation without a percentage.
- No study specific to bar, hospitality or small-business utility apps was found.
- No primary Appcues, Pendo or UserGuiding benchmark with completion by step count could be retrieved. Chameleon 2019's per-step chart values beyond the quoted points (4, 5, and the 3-vs-6 ratio) were not in the extractable text.
- No peer-reviewed 2023–2026 study of mobile first-run tutorials turned up (the ACM Digital Library wasn't reachable). The newest rigorous item found is DIS 2021.

## 2. How much text people read on mobile screens, onboarding screens and dialogs, and how much copy an onboarding screen should carry

### Takeaway
People read a minority of the words in front of them: about 20% of a typical web page, and half the text only on pages of 111 words or fewer. They scan in predictable patterns that also occur on mobile. With dialogs and consent screens, most people click through in seconds, and attention to a repeated warning decays within days. No experiment directly sets the right amount of onboarding copy. Vendor data and platform guidance agree on roughly 1–2 sentences per step (about 2 lines, or 20–25 words).

### Cited Findings
**Reading on the web and on phones**
- [P] Nielsen 2008, based on Weinreich et al. (ACM TWeb 2008): 25 users' naturalistic browsing, collected in 2005, 45,237 page views after cleaning. "Users have time to read at most 28% of the words during an average visit; 20% is more likely." People read half the text only on pages of "111 words or less." Time on page ≈ 25 s + 4.4 s per 100 added words, so about 18% of added words get read at 250 wpm. This is inferred from time, not eyetracking. — [NN/g](https://www.nngroup.com/articles/how-little-do-users-read/)
- [P] Kara Pernice, "F-Shaped Pattern of Reading on the Web" (12 Nov 2017, last reviewed 19 Aug 2026; eyetracking) — [NN/g](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)
  - The F-pattern is "alive and well in today's world — both on desktop and on mobile."
  - It appears when text has little formatting, the reader is trying to be efficient, and the reader isn't committed to reading every word.
  - Other patterns: layer-cake (headings only), spotted, marking (eyes stay put while the page scrolls; more common on mobile), and bypassing. "Commitment" — reading nearly everything — happens only when people are highly motivated.
- [P] Kate Moran, "Reading Content on Mobile Devices" (11 Dec 2016; 276 participants, 1,629 article-and-quiz cases). — [NN/g](https://www.nngroup.com/articles/mobile-content/)
  - Comprehension on phones was not worse than on computers: mobile scored about 3 points higher, statistically significant but "not practically significant."
  - Hard articles were read about 30 ms per word slower on mobile.
  - NN/g's advice still stands: "the need for brevity and prioritization is still critical" for most mobile scenarios.
  - Earlier University of Alberta work (2010–2011) found much lower comprehension on a mobile-sized screen: 39.18% on desktop vs 18.93% on mobile. I saw these figures only in a search summary of [NN/g's 2011 article](https://nngroup.com/articles/mobile-content-is-twice-as-difficult-2011), and they conflict with the 2016 result.

**Onboarding and tour copy**
- [V] Chameleon 2019: the average time spent on an entire tour was 12 s. Its advice: "Keep copy short – assume users will scan and not read. We recommend using a single font size with 2 lines max, rather than multiple paragraphs or separate header and body text." Its ideal tour has "2 lines of text per step." — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)
- [V] Chameleon 2024: the average tour step is 23 words, and half of all steps are text only. — [Chameleon 2024](https://www.chameleon.io/benchmark-report-24)
- [V] Vevo: most users swiped through the onboarding tutorial "without reading any of the copy." — [Mobile World Live](https://www.mobileworldlive.com/focus-apps/apptimize-onboarding-tutorials-value-ab-testing/)
- [P] Aurora Harley, "Instructional Overlays and Coach Marks for Mobile Apps" (16 Feb 2014; qualitative) — [NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/)
  - Keep hint text "as short as possible" and scannable, and pair it with visuals.
  - "Bombarding users with frequent hint screens causes them to dismiss hints more quickly."
  - Mobile users are often distracted and read even less.
  - Short-term memory fades "in about 20 seconds."
- [G] Apple HIG, tips: "Keep your tips to one or two sentences." Tooltips (macOS and visionOS): "limit tooltip content to a maximum of 60 to 75 characters." — [Apple HIG: Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help)
- [G] Material (M1): the Top User Benefits carousel shows "up to three benefits," and "a maximum of three illustrations should auto-rotate every two to three seconds." — [Material Design (M1)](https://m1.material.io/growth-communications/onboarding.html)

**Dialogs, consent screens and warnings**
- [G] Apple HIG, Privacy: "People sometimes tap quickly to dismiss alerts without reading them." — [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- [R] Obar & Oeldorf-Hirsch, "The biggest lie on the internet" (Information, Communication & Society; 543 student participants; a fictitious social network). 74% skipped the privacy policy by choosing "quick join." Those who opened it spent an average of 73 s on the privacy policy and 51 s on the terms of service, against roughly 30 and 16 minutes needed at adult reading speed. — [SSRN abstract](https://papers.ssrn.com/abstract=2757465); [Help Net Security](https://www.helpnetsecurity.com/2016/07/14/agree-terms-conditions-lie/). Press coverage reported that 98% missed the "gotcha" clauses (such as surrendering a first-born child); check this against the paper before quoting it. — [Fortune](https://fortune.com/2016/07/13/facebook-apple-terms-of-service)
- [R] Akhawe & Felt, "Alice in Warningland" (USENIX Security 2013; more than 25 million warning impressions from Chrome and Firefox telemetry, May–June 2013). Users clicked through 70.2% of Chrome's SSL warnings vs about a third of Firefox's, and roughly a tenth (Firefox) to a quarter (Chrome) of malware and phishing warnings. The authors tie the gap partly to design: Chrome allowed a one-click bypass, Firefox needed three clicks. — [USENIX](https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/akhawe); [Google Research](https://research.google/pubs/alice-in-warningland-a-large-scale-field-study-of-browser-security-warning-effectiveness/)
- [R] Vance, Jenkins, Anderson, Bjornn & Kirwan, "Tuning Out Security Warnings: A Longitudinal Examination of Habituation Through fMRI, Eye Tracking, and Field Experiments" (MIS Quarterly, 2018). — [BYU ScholarsArchive](https://scholarsarchive.byu.edu/facpub/6495); [Temple Fox summary, 28 Jan 2020](https://www3.fox.temple.edu/discover/?p=312397)
  - In the lab (fMRI and eye tracking over a five-day workweek), attention to warnings declined over time and partly recovered between days. Polymorphic warnings, whose appearance changes, substantially reduced habituation.
  - In a three-week mobile field experiment, people saw permission warnings while installing apps (Temple's summary: more than 100 participants). Adherence fell for everyone but much more slowly with polymorphic warnings: by Temple's account, "nearly 80 percent" of that group vs "only 55 percent" of the static group were still adhering at the end.
- [R] Jenkins, Anderson, Vance, Kirwan & Eargle, "More Harm Than Good? How Messages That Interrupt Can Make Us Vulnerable" (Information Systems Research 27(4):880–896, 2016). Dual-task interference: brain activation drops under high interference, and that drop predicts people disregarding an interrupting message. Timing the message for a low-interference moment reduces the effect. — [IDEAS/RePEc](https://ideas.repec.org/a/inm/orisre/v27y2016i4p880-896.html). Press coverage of the experiments: 74% ignored a message that appeared while they were closing a window, and 79% ignored one shown while they were watching a video. — [Fierce Electronics](https://www.fierceelectronics.com/embedded/people-disregard-security-warnings-due-to-bad-timing)

### Inferences
- Expect a first-run card to be read like a short web page: the headline and a few words per step get through. Each step should carry one idea that survives a single glance, about one short sentence (10–20 words). At Nielsen's assumed 250 wpm, a 4-second glance covers about 17 words (my arithmetic, not a measured figure).
- The camera heads-up is the screen most likely to be tapped through unread; Apple says as much about alerts. The "why" should come in its first words, and the system alert's purpose string should make sense on its own.
- Habituation matters more for things the app shows repeatedly, such as the amber "the second AI read X" chip, than for a start screen shown once. Identical repeated warnings lose attention within days, so they should stay rare and specific, and should vary or be salient when shown.
- Timing: Jenkins et al. argues against interrupting mid-scan or mid-count. Hints belong at natural breaks, such as just after a scan resolves or after a count is saved.

### Gaps
- No controlled experiment was found that varies the amount of copy on mobile onboarding screens and measures comprehension or completion. The per-step guidance (2 lines; 1–2 sentences; 23 words on average) is descriptive or comes from guidelines.
- NN/g's "Banner Blindness Revisited" (2018) and newer NN/g mobile eyetracking work were not retrieved in this pass.
- The 2010–2011 Alberta comprehension figures were seen only in a search summary, not read in the original.

## 3. Alternatives to up-front tutorials and their evidence (contextual hints and coach marks, a learn-by-doing first task, empty states, animation and video, checklists and progress, progressive disclosure)

### Takeaway
The strongest evidence favours three things. First, just-in-time, context-sensitive help: in the one game where tutorials helped at all, it added 16% play time and 40% progress. Second, learning by doing in a low-stakes first task (Apple HIG, NN/g's AR study, GamiCAD). Third, short guidance the user calls up themselves: self-started tours complete at about twice the rate of automatic ones. Short demonstrations (animation or video) beat static pictures for procedural-motor skills (d = 1.06), but people can copy them without learning. Checklists and progress cues use the endowed-progress effect (34% vs 19% completion in the classic study), but real-world checklist completion is low, around 10–20%.

### Cited Findings
**Contextual and just-in-time hints, coach marks**
- [R] Andersen et al. 2012: giving instructions "as closely as possible to when they were needed, rather than out of context in an up-front manual, increased play time by 16% and progress by 40% in Foldit but had no effect in the other two games." The study found no evidence that restricting freedom (forcing the target action, stencil-style) improves learning. An on-demand help button helped only in Foldit (+12% play time); it hurt in Refraction (−12% levels completed, −15% play time) and Hello Worlds (−3% return rate). — [Andersen et al. 2012 (PDF)](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf)
- [P] NN/g, Laubheimer 2023, prefers "pull revelations." Help should be easy to dismiss and to call back, use progressive disclosure, appear alongside each step so nothing has to be memorized, skip the obvious (a gear icon needs no explanation), and be timed from task analysis. Example: Figma shows a tip only when the user is "involved in an activity related to the tip." — [NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)
- [P] NN/g, Harley 2014 (coach marks): show "hints one-by-one, at the right moment" rather than in chains, and keep them short. Style hints so they can't be mistaken for real UI: in testing, "some users did not realize this was a hint overlay, and expected to be able to interact with it." — [NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/)
- [G] Apple HIG, tips (TipKit). Tips suit features people "can complete with a few simple steps. If a feature requires more than three actions, it's probably too complicated for a tip." Use eligibility rules so people who have already used a feature never see its tip. When there are several tips, show them at a set cadence, for example "once every 24 hours." — [Apple HIG: Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help)
- [V] Chameleon 2019: self-serve tours had a 123% higher completion rate than automatic ones, and tours triggered by an event the user had just completed, +38%. — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)

**Interactive "learn by doing" first task**
- [G] Apple HIG: "Teach through interactivity. People tend to grasp and retain information better when they can actually perform the task they're learning about instead of just viewing instructional material." — [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
- [P] NN/g AR study (2022): interactive walkthroughs were "generally more effective than static walkthroughs" because users practised a small-scale task, and participants felt delighted when they finished a first AR task. — [NN/g](https://www.nngroup.com/articles/ar-walkthroughs/)
- [P] NN/g, Kendrick 2020: interactive walkthroughs let users "learn by doing," ideally in a low-stakes setting. One app's walkthrough (Fabulous) was judged unnecessary because the workflow was already familiar. — [NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/)
- [R] GamiCAD (Li, Grossman & Fitzmaurice, UIST 2012): an interactive, in-product tutorial with real-time feedback and game elements, compared against the same tutorial without the game elements. Users performed the test tasks "20%-76% faster" and reported higher engagement; the participant count isn't on the summary page. — [Autodesk Research](https://www.research.autodesk.com/?p=1483)
- [V] Calm (company case via Amplitude): fewer than 1% of users found the Daily Reminder setting buried in Settings. Calm moved the prompt to "after a user completes their first meditation session"; 40% of prompted users set a reminder, and Calm reported about 3× retention. The experiment's sample size isn't given, and the earlier 3× figure was only a correlation. — [Amplitude](https://amplitude.com/blog/calm-increased-retention-amplitude)
- [V] Duolingo: moving sign-up to after the first lessons ("gradual engagement") reportedly lifted DAU about 20% (Gina Gotthilf, former VP of Growth, in interviews). Another secondary source gives the 20% as next-day retention, so the metric is inconsistent, and there is no primary write-up. — [Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding); [StriveCloud](https://www.strivecloud.io/blog/blog-gamification-examples-boost-user-retention-duolingo)

**Empty states that teach**
- [P] Kate Kaplan, "Designing Empty States in Complex Applications: 3 Guidelines" (19 Sep 2021) — [NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)
  - Communicate system status: "Totally empty states cause confusion about how and whether the system is working."
  - Use empty states as in-context help ("pull revelations"). Example: DataDog's "Star your favorites to list them here."
  - Give direct pathways: a Create button, or demo data for safe exploration (Loggly).
- [G] Material (M1): "Rather than leaving users on a blank screen, your UI should encourage interaction"; "Don't leave users with nothing to do." — [Material M1](https://m1.material.io/growth-communications/onboarding.html)

**Animation and video vs static text and pictures**
- [R] Höffler & Leutner 2007 meta-analysis (Learning and Instruction 17(6); 26 studies, 76 comparisons). Instructional animation beat static pictures, d = 0.37 (95% CI 0.25–0.49). The advantage was larger for representational animation (d = 0.40), highly realistic or video material (d = 0.76) and procedural-motor knowledge (d = 1.06, 95% CI 0.72–1.40). — [Leibniz-IPN record](https://www.leibniz-ipn.de/en/research/publications/instructional-animation-versus-static-pictures-a-meta-analysis); [PDF](https://wikicap.ulb.be/images/e/ef/Hoffler_Leutner_2007.pdf)
- [R] Berney & Bétrancourt 2016 meta-analysis (61 studies, N = 7,036, 140 comparisons) found a smaller overall advantage for animation: Hedges' g = 0.226 (95% CI 0.12–0.33). — [UNIGE archive](https://archive-ouverte.unige.ch/unige:92234)
- [R] Palmiter, Elkerton & Baggett 1991 (International Journal of Man-Machine Studies; HyperCard tasks). Animated demonstrations produced faster, more accurate performance during training. In later sessions, though, demonstration users were slower than text users and transferred less well to similar tasks; they seemed to imitate the demonstration without processing it. — [Deep Blue (UMich)](https://deepblue.lib.umich.edu/items/b40cb208-6c5d-477f-be6c-d7c8e7725ae6)
- [R] ToolClips (Grossman & Fitzmaurice, CHI 2010), as summarised by Lafreniere et al. (CHI 2014): short (10–25 s) in-context video demonstrations attached to tooltips "significantly improve task-completion rates compared to traditional static online help." — [Lafreniere et al. 2014 (PDF)](https://cs.uwaterloo.ca/~bjlafren/Extracting_Tool_Demonstrations_-_Lafreniere_CHI2014.pdf)
- [V] Chameleon 2024: about 3% of tour steps used video, and tours with video completed at 29%, below the 33.5% average — the report calls this "not conclusive." — [Chameleon 2024](https://www.chameleon.io/benchmark-report-24). Chameleon 2019's line that people "only... recall 25% of what we learn through reading" has no source given (it resembles the discredited "learning pyramid") and should not be relied on. — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)

**Progress checklists and the endowed-progress effect**
- [R] Nunes & Drèze, "The Endowed Progress Effect" (Journal of Consumer Research 32(4):504–512, 2006). A car-wash field experiment with 300 loyalty cards: an 8-stamp card with no stamps vs a 10-stamp card with 2 already stamped, so the remaining effort was the same. Completion was 19% vs 34%. Persistence tracked *relative* progress, and the effect was stronger when people were given a reason for the head start. — [Silicon Canals (design detail)](https://siliconcanals.com/t-car-wash-loyalty-cards-endowed-progress/); [Wharton](https://knowledge.wharton.upenn.edu/?p=5630); [Coglode](https://coglode.com/nuggets/endowed-progress-effect)
- [V] Chameleon 2019: progress indicators raised completion 12% and cut dismissal 20%. Users who checked off one checklist item and triggered a tour were 21% more likely to complete it, and 60% went on to complete another. — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)
- [V] Chameleon 2024: about 1 in 10 users explores a checklist launcher, and 28% of those complete an item. Tours started from a launcher complete at 64%. — [Chameleon 2024](https://www.chameleon.io/benchmark-report-24). For 2020, 76% of users who opened a launcher started a tour, and those tours completed at 50%. — [Chameleon blog](https://www.chameleon.io/blog/chameleon-benchmark-report)
- [V] Userpilot 2024: average checklist completion 19.2% (median 10.1%, 188 companies). — [Userpilot](https://userpilot.com/blog/?p=197841)
- [V] Lazyweb (July 2026, screenshot corpus of about 751 apps): 58% of apps with onboarding quizzes show a progress bar or "step N of M." This is an observation with no outcome data. — [Lazyweb](https://www.lazyweb.com/research/how-many-apps-use-onboarding-personalization-quiz)

**Progressive disclosure and postponing setup**
- [G] Apple HIG: "Postpone nonessential setup flows or customization steps. Provide reasonable default settings so most people can immediately start interacting with your app." — [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
- [P] Laubheimer 2023 recommends progressive disclosure, with the example of Photoshop's tooltip carrying an animation and a "Learn how" link. — [NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)
- [V] Chameleon 2019: "Leverage progressive disclosure, and make your first tour short," and "break long flows into shorter contextually/optionally-triggered tours." — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)

### Inferences
- In 86'd, the live viewfinder is the best place to teach. The bright, un-dimmed window is exactly what the AI receives, so a one-line hint inside the frame ("fill the bright box with the label"), followed by feedback on the first scan, is the contextual, just-in-time pattern the evidence supports best.
- The evidence favours a short looping demonstration (phone → bottle → name appears → tap in the count) for the procedural-motor part (d ≈ 1 for procedural-motor knowledge). It should stay brief and shouldn't replace doing the task once, because people can imitate a demo without learning it.
- States that need explaining — the first "move closer and retake," the first amber "check the label" chip — are the right moments for a one-time tip in the TipKit style, rather than describing them up front.
- A checklist is probably more machinery than an app with one core task needs. The endowed-progress finding is only weakly relevant here (for example, a visible running count during a session).

### Gaps
- No rigorous mobile study with quantitative outcomes was found comparing coach marks against no help; NN/g's coach-mark evidence is qualitative.
- The animation meta-analyses cover learning materials in general, not app onboarding. No app-onboarding experiment comparing a looping animation with text was found.
- Modern checklist data are web-SaaS vendor figures; no mobile checklist benchmark was found.
- The Calm and Duolingo figures are company-reported, with no published methods.

## 4. Apple Human Interface Guidelines ("Onboarding" and related pages) and the Material/Google equivalent

### Takeaway
Apple's current Onboarding page (last changed 10 June 2024) says that ideally there is no onboarding; when there is, it should be "fast, fun, and optional." It says to teach through interactivity, prefer context-specific tips, avoid making people memorize, make tutorials optional and findable later, and postpone nonessential setup. Directly relevant to 86'd, it says to integrate a permission request into onboarding when the app can't work without it. Apple's Privacy page sets strict rules for a screen shown before the permission alert: one button labelled "Continue" or "Next," never "Allow," and no cancel or close. Material's onboarding guidance (from the Material 1 era) offers three models — Self-Select, Quickstart, Top User Benefits (at most three benefits) — and says "Don't force education upfront."

### Cited Findings
**[G] Apple HIG, Onboarding** (read via the HIG JSON endpoint; change log: 10 Jun 2024 "Clarified different approaches to onboarding and added a guideline on displaying a splash screen"; 21 Jun 2023 visionOS update) — [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
- "Ideally, people can understand your app or game simply by experiencing it, but if onboarding is necessary, design a flow that's fast, fun, and optional. When available, onboarding occurs after launching is complete — it isn't part of the launch experience."
- "Teach through interactivity. People tend to grasp and retain information better when they can actually perform the task they're learning about instead of just viewing instructional material. As much as possible, provide an interactive onboarding experience where people can safely test an action, discover a feature, or try out a game mechanic."
- "Consider providing a collection of context-specific tips instead of a single onboarding flow... When you have instructional content that refers to a specific area of the interface, display these instructions near that area." (The page points to TipKit.)
- "If you need to present a prerequisite onboarding flow, design a brief, enjoyable experience that doesn't require people to memorize a lot of information. When onboarding is quick and entertaining, people are more likely to complete it. In contrast, if you try to teach too much, people can feel overwhelmed and may be less likely to remember what they learned."
- "If it makes sense to offer a separate tutorial, consider making it optional. If you let people skip the tutorial when they first launch your app or game, don't present it again on subsequent launches, but make sure it's easy for people to find if they want to view it later." Suggested locations: a help, account or settings area.
- "Keep onboarding content focused on the experience you provide. People... don't need to learn how to use the system or the device."
- "Postpone nonessential setup flows or customization steps. Provide reasonable default settings..."
- "If your app or game needs access to private data or resources before it can function, consider integrating the permission request into your onboarding flow. In this scenario, making the request during your onboarding flow gives you the opportunity to show people why your app or game needs their permission and the benefits of granting it. Otherwise, present a permission request when people first access the specific function that relies on private data or resources."
- "Prefer letting people experience your app or game before prompting them for ratings or purchases."
- Also on the page: show a splash screen only "just long enough for people to absorb the information at a glance," and "Avoid displaying licensing details within your onboarding flow."

**[G] Apple HIG, Privacy › Requesting permission** (change log 21 Jun 2023) — [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- When to ask: "Request permission only when your app clearly needs access to the data or resource... Ideally, wait to request permission until people actually use an app feature that requires access." And: "Avoid requesting permission at launch unless the data or resource is required for your app to function. People are less likely to be bothered by a launch-time request when it's obvious why you're making it."
- Purpose string: "Aim for a brief, complete sentence that's straightforward, specific, and easy to understand." Apple's good example is "The app records during the night to detect snoring sounds."; its bad example is "Microphone access is needed for a better experience."
- Pre-alert screens:
  - "Ideally, the current context helps people understand why you're requesting their permission. If it's essential to provide additional details, you can display a custom screen or window before the system alert appears."
  - "Include only one button and make it clear that it opens the system alert... Use a term like 'Continue' or 'Next' to title the single button." Using "Allow" on a custom screen is named as manipulation.
  - "Don't include additional actions in your custom screen or window, unless needed to obtain a legal consent. For example, don't provide a way for people to leave the screen or window without viewing the system alert — like offering an option to close or cancel."
- "People sometimes tap quickly to dismiss alerts without reading them." (Said in the tracking-request section, which also bans custom screens that exploit this.)

**[G] Apple HIG, Offering help** (tips guidance added 12 Sep 2023) — [Apple HIG: Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help)
- "...directly relate the help you provide to the precise action or task people are doing right now and make it easy for people to dismiss or avoid the help if they don't need it."
- Tips should be "short, actionable, and engaging," "one or two sentences," with nothing promotional.
- Use eligibility rules so a tip appears only for people who might benefit; set a cadence such as once every 24 hours.
- A feature that needs more than three actions is "probably too complicated for a tip."

**[G] Material / Google**
- Material Design (M1, "Growth & communications › Onboarding") — [Material M1](https://m1.material.io/growth-communications/onboarding.html)
  - Three models: "Self-Select: Allow users to customize their experiences." "Quickstart: Start the user directly in the app." "Top User Benefits: Display a brief autoplay carousel (or animatic) highlighting up to three benefits of using the app."
  - Top User Benefits fits when "your app's UI and benefits use patterns familiar to most users." Self-Select fits when "the UI can be customized" or the app "has setup and consent requirements," and "provides implicit education, giving the user a sense of control and vested interest in the screens to come."
  - Carousels: at most three illustrations auto-rotating "every two to three seconds"; stop auto-advancing when the user touches it.
  - Self-Select: "Each screen should have fewer than ten choices."
  - Don'ts: "Don't force education upfront." "Don't leave users with nothing to do." "Don't show app UI if users haven't experienced it yet." "Don't ask for preferences that can be garnered from normal usage." "Don't combine Self Select with Top User Benefits." "Don't show it to returning users."
- A mirror of the same Material 1 guidance adds: "After onboarding, the users should land on a screen that makes it easy to act on what they just learned." — [mdui.org mirror](https://www.mdui.org/en/design/1/growth-communications/onboarding.html)
- The Material 2 version of the page ([m2.material.io](https://m2.material.io/design/communication/onboarding.html)) is rendered by script and couldn't be read. No Material 3 (m3.material.io) onboarding page was found.

### Inferences
- The current 86'd design fits both platforms' guidance: the start screen appears only while nothing has been counted (Material: "Don't show it to returning users"), and the camera heads-up falls under Apple's explicit allowance for putting a required permission into onboarding — the camera is the core function.
- Apple's pre-alert rules mean the heads-up should have exactly one "Continue"/"Next"-style button that opens the system alert. It should not use "Allow" wording, and there should be no "Not now," close or skip control on that screen. The current screen is worth checking against this. The blocked/Settings screen shown *after* a denial is a separate matter and isn't covered by this rule.
- Apple's "make sure it's easy for people to find if they want to view it later" suggests the "how it works" content should be reopenable from Help or Settings, since the start screen never comes back once something has been counted.
- Both Apple and Material rank interactivity and in-context tips above front-loaded explanation. A static "how it works" card is consistent with the guidelines only if it is brief and nothing in it has to be remembered.

### Gaps
- No current Material 3 or Android developer guidance on onboarding was found. The Material text quoted here dates from the Material 1 era (roughly 2014–2017).
- The App Store Review Guideline 5.1.1 wording on permission requests was not fetched; the HIG design guidance above was.

## 5. Counter-evidence: when a longer or more explanatory onboarding beats a minimal one

### Takeaway
Up-front instruction earns its place when:
- the interaction is novel or unconventional (Foldit; AR and camera-placement tasks);
- the product is feature-rich or high-stakes (crypto, finance);
- the app genuinely needs information or setup before it can work; or
- the questions build a personalized payoff the user values (Noom-style quizzes, Duolingo's goal and level).

Even in those cases, the evidence favours interactive, personally relevant content over passive explanation, and asking for setup after the user has had a first taste of value (Calm, Duolingo).

### Cited Findings
- [R] Complexity: tutorials raised play time by up to 29% and progress by up to 75%, but only in Foldit, the most complex and least conventional game. The authors advise designers to "consider the complexity and discoverability of game mechanics when deciding whether to invest resources in tutorials." — [Andersen et al. 2012 (PDF)](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf)
- [P] Novel interaction paradigms: walkthroughs "were useful for onboarding new users to a novel interaction paradigm like AR." — [NN/g 2023](https://www.nngroup.com/articles/onboarding-tutorials/)
- [P] NN/g's AR study (camera-based apps) — [NN/g 2022](https://www.nngroup.com/articles/ar-walkthroughs/)
  - Participants appreciated detailed instructions; one said, "I don't want to skip the tutorial."
  - Missing instructions caused failures and relaunches (for example, an unstated landscape requirement).
  - Recommendations: tell people how to hold the phone (in hand, height, angle, portrait or landscape); warn them not to cover the camera or aim it at a cluttered area; prepare the environment (lighting, surface, space); explain the purpose first; give contextual feedback in real time.
- [R] Feature-rich, trust-heavy apps: onboarding built on minimalist instruction improved perceived usability for first-time users of feature-rich crypto apps. — [Fröhlich et al. 2021 (PDF)](https://www.unibw.de/usable-security-and-privacy/publikationen/pdf/froehlich2021dis1.pdf/@@download/file/froehlich2021dis1.pdf)
- [P] AI tools with unclear capabilities: new users couldn't tell what a chatbot could do, or even find where to type ("Where is the input field?"). NN/g recommends a clear name and tagline, broad examples and contextual tips — and still says "keep onboarding brief." — [NN/g 2024](https://www.nngroup.com/articles/new-AI-users-onboarding/)
- [P] NN/g's three legitimate cases for onboarding: the app needs information to start, functionality is tailored to the user's context, or features are unique or unfamiliar. Fitplan's brief survey, with a Skip option and a progress indicator, is the positive example. — [NN/g 2020](https://www.nngroup.com/articles/mobile-app-onboarding/)
- [G] Material's Self-Select model "provides implicit education, giving the user a sense of control and vested interest in the screens to come." It suits apps with customizable UI or "setup and consent requirements." — [Material M1](https://m1.material.io/growth-communications/onboarding.html)
- [V] Personalization quizzes in consumer subscription apps (no public controlled data):
  - Noom's funnel runs up to 113 screens, about 10–15 minutes, in RevenueCat's teardown; every question "builds toward a payoff" and the plan is presented as designed for that user. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel). Screensdesign counts a 77-step quiz leading to a soft paywall. — [Screensdesign](https://screensdesign.com/showcase/noom-weight-loss-food-tracker)
  - Across about 751 apps, roughly 16% run a personalization quiz, averaging 3.9 question screens (p90 10; Health & Fitness 6.2, Education 2.2). This is a screenshot corpus with no outcome data. — [Lazyweb](https://www.lazyweb.com/research/how-many-apps-use-onboarding-personalization-quiz). The median full onboarding flow is 11 steps (p90 27). — [Lazyweb flow-length benchmark](https://www.lazyweb.com/research/onboarding-flow-length-benchmark-steps.md)
  - A "Headspace +10% trial conversion from multi-goal selection" claim appears only in secondary summaries and is unverified. — [Lazyweb category page](https://www.lazyweb.com/research/category/onboarding-personalization-quiz-benchmarks)
- [R] Investment psychology: the IKEA effect (Norton, Mochon & Ariely, Journal of Consumer Psychology 22(3):453–460, 2012; four studies). People value things more when they made them themselves, but only when the effort ends in a finished product; the effect dissipated when creations were destroyed or left incomplete. — [Harvard DASH](https://dash.harvard.edu/handle/1/12136084)
- [V] Value first, even in apps that rely on investment: Duolingo moved sign-up to after the lessons (about +20% DAU, secondary sources) — [Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding). Calm asked for the reminder after the first session (40% set one; about 3× retention, company-reported). — [Amplitude](https://amplitude.com/blog/calm-increased-retention-amplitude)
- [V] Who triggers the guidance matters more than its length: user-started tours complete at about twice the rate of automatic ones (+123%). — [Chameleon 2019 (PDF)](https://www.chameleon.io/assets/chameleon-product-tour-benchmarks-report-2019.pdf)

### Inferences
- More up-front content is favoured by a novel interaction model, high complexity, high stakes or trust, setup that must happen before first use, or questions whose answers visibly change what the user gets. Minimal onboarding is favoured by a conventional UI, a single core task people can discover by trying, a repeat-use work tool, and users who arrive with intent — someone who downloads a bar-inventory app already knows why.
- 86'd sits mostly on the minimal side, with one exception. Framing a bottle for the camera is a camera-placement skill much like AR setup, where NN/g found that specific "how to hold and aim" instructions prevent failures. That one skill is worth teaching, ideally in the live view rather than on a card.
- For setup in a business tool: 86'd already defers the bar name (asked right after sign-up), par levels (Review) and distributors (the order screen) to the moment they matter. That matches Apple's "postpone nonessential setup" and argues against moving any of them into the start screen.

### Gaps
- There is no controlled public A/B data on questionnaire length against conversion or retention (Noom, Headspace); only teardowns and secondary claims exist.
- No evidence was found specific to B2B or small-business mobile tools on whether setup-first or value-first onboarding works better. The closest is Userpilot's industry spread (checklist completion 24.5% in FinTech vs 12.5% in MarTech), which is web SaaS.

## 6. Designing for distracted, on-the-job, one-handed use (situational impairments, glanceability, interruptions)

### Takeaway
- Attention to a phone in real use comes in bursts of a few seconds (4–8 s, vs more than 14–16 s in the lab).
- About half of observed touches are one-handed, and carrying objects sharply reduces accuracy.
- Bar-like conditions — dim light, nearby conversation, cold or wet hands — measurably impair interaction.
- Interruptions can multiply task time by up to four, and messages shown mid-task tend to be disregarded.

A first-run screen should therefore be readable in one glance, operable with one thumb, and not compete with the task in hand.

### Cited Findings
- [R] Oulasvirta, Tamminen, Roto & Kuorelahti, "Interaction in 4-second bursts: The fragmented nature of attentional resources in mobile HCI" (CHI 2005; semi-naturalistic field study, mobile web tasks across nine urban situations). Continuous attention to the phone lasted more than 16 s in the lab but broke into bursts of a few seconds in demanding situations, with up to eight-fold differences between lab and field. Users coped by glancing at the screen briefly and deferring less important tasks. — [University of Helsinki portal](https://researchportal.helsinki.fi/en/publications/interaction-in-4-second-bursts-the-fragmented-nature-of-attention/); [PDF](https://www.interruptions.net/literature/Oulasvirta-CHI05-p919-oulasvirta.pdf)
- [R] Roto & Oulasvirta (WWW 2005): while waiting for a page to load, people's visual attention left the phone after 4–8 s (vs more than 14 s in the lab). The authors recommend multimodal feedback for any delay longer than 4 s. — [WWW 2005 (PDF)](https://archives.iw3c2.org/www2005/proceedings/docs/p775.pdf)
- [P] Hoober (UXmatters, Feb 2013; 1,333 observations in public places, 780 people touching their screens; phones only, not a formal study): one-handed 49%, cradled 36%, two-handed 15%. — [UXmatters](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)
- [R] Ng, Williamson & Brewster, "Investigating the Effects of Encumbrance on One- and Two-handed Interactions with Mobile Devices" (CHI 2014). Carrying objects while walking significantly reduced targeting performance: index-finger accuracy fell to 48.1% when encumbered, and thumb targeting error was 4.2 mm, a 40% increase over unencumbered input. — [University of Glasgow eprints](https://eprints.gla.ac.uk/117068)
- [R] Situationally-induced impairments and disabilities (SIIDs): difficulty performing tasks "due to context (e.g., listening to a phone call when in a noisy crowd) rather than a result of a congenital or acquired impairment." — [Tigwell et al., CHI 2019 Extended Abstracts](https://faculty.washington.edu/wobbrock/pubs/chi-19.04.pdf)
  - Cold: in a cold setting, people are slower and less accurate at hitting targets. Meaningful (understandable) speech significantly impaired text entry, and its effect on typing was larger than that of stress. — [Sarsenbayeva, Kostakos & Goncalves 2019 (arXiv 1904.06128)](https://arxiv.org/pdf/1904.06128)
  - The workshop summary describes Sarsenbayeva et al.'s IMWUT 2018 noise study as finding that "music decreased target access time and accuracy, while urban noise and speech decreased typing speed." — [Tigwell et al. 2019](https://faculty.washington.edu/wobbrock/pubs/chi-19.04.pdf)
  - Dimmed ambient light slowed reaction time and reduced target-acquisition accuracy (INTERACT 2019; taken from the abstract as it appeared in search, not the full paper). — [IFIP DL](https://dl.ifip.org/IFIP-LNCS-11748/hal-02553851)
- [R] Xu, Xu, Kang & Yuan 2025 (Behavioral Sciences 15(7):953; eye-tracking, n = 32 students, simulated settings). Task-like disturbances hurt mobile reading attention most: answering a phone gave a mean total fixation duration of 25.3, and a conversation directed at the reader 26.2, vs about 34 under steady radio or keyboard noise. Complex, fluctuating, multisensory environments disrupted reading more than steady sounds. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12292703/)
- [R] Leiva, Böhmer, Gehring & Krüger, "Back to the App: The Costs of Mobile Application Interruptions" (MobileHCI 2012; large-scale observational study). Interruptions are uncommon (at most ~10% of daily app usage), but they "can delay completion of a task by up to 4 times." — [DFKI](https://www.dfki.de/web/forschung/projekte-publikationen/publikation/6576)
- [R] Jenkins et al. 2016 (ISR): dual-task interference makes people disregard messages that interrupt another task, so time messages for low-interference moments. — [IDEAS/RePEc](https://ideas.repec.org/a/inm/orisre/v27y2016i4p880-896.html)
- [P] NN/g, Harley 2014: mobile users are often distracted and read even less, and short-term memory fades "in about 20 seconds." Instructions given before a task have to survive that gap. — [NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/)
- [G] Apple applies the same at-a-glance standard to splash screens: show one "just long enough for people to absorb the information at a glance." — [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)

### Inferences
- A bartender is often holding a bottle in one hand and the phone in the other. Everything on the first-run screens should work with one thumb near the bottom of the screen; nothing should need two hands or a precise tap.
- The reading budget per screen is about one glance — roughly 4 s, or 15–20 words (my arithmetic from the 4–8 s attention bursts and 250 wpm). Three steps of one short line each, plus a single primary button, fits that budget; paragraphs don't.
- Attention will be broken by customers, coworkers and noise. Anything the user needs at scan time should therefore be shown at scan time, in the viewfinder, rather than remembered from a card seen earlier (memory fades in about 20 s; interruptions can cost up to 4× the time).
- Dim bar lighting degrades both reading and the camera image. A just-in-time "too dark — move closer" hint in the viewfinder will do more than an up-front warning.

### Gaps
- No study of inventory or counting apps, or of hospitality staff specifically, was found. The evidence is generalized from lab and field studies of walking, encumbrance, noise, cold and light.
- No direct research was found on glanceability thresholds for phone screens (as opposed to smartwatches). The 4–8 s attention bursts are the closest proxy.
- The full results of Sarsenbayeva's IMWUT 2018 noise study and INTERACT 2019 light study were not read. The secondary summaries disagree slightly: one says urban noise made target acquisition significantly *faster*, the other lists music as speeding it up at a cost in accuracy.
