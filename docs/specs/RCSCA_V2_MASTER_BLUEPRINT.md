# RCSCA V2 Master Blueprint — baseline

This file is the implementation baseline. Confirmed decisions must not disappear between versions unless explicitly changed.

## Brand
- RCSCA × 1% × Cycle of Goodness.
- 1% has no fixed unit, form, price, or moral label. Each person/enterprise defines their own 1%.
- Visual emphasis is the numeral **1**; the % sign is subordinate.
- Documentary project is legacy/cancelled and is not part of V2 navigation or homepage.

## Identity and permissions
- Visitor: public browsing; no Level.
- Shared Partner: registered individual; MY 1%, footprint, days together, XP/Level, shared points, team, digital sharing card, unlocks.
- RCSCA MEMBER: all Shared Partner functions + HR network, jobs/talent, MEMBER-only functions.
- Annual and lifetime members are equal in front-end presentation.
- Enterprise has its own YOUR 1% identity and dashboard.
- Level, membership, and permission are separate concepts.

## Participation, points, level
- Financial amount never determines XP/shared points/level.
- Activity participation can be verified and entered manually/batch by RCSCA after an activity, regardless of cash/transfer/payment channel.
- Hidden milestones and 1% exclusive unlocks are allowed.
- Confirmed current prototype labels include Lv.4 共享連結者 and highest stage 共享守護者. Intermediate stage labels remain presentation descriptors until formally named.
- Digital card material/color evolves with participation stage; identity badge separately indicates permission.

## Teams and referrals
- Registration records referral/source and reason for joining a team.
- Referral history and future team membership are separate records.
- Teams create cohesion and honor, not downline commissions or recruitment profit.

## Enterprise
- YOUR 1% can be funds, products, services, staff time, expertise, jobs, venues, or connections.
- Public/charitable resources, rewards/redemptions, and member benefits are separate flows.
- Annual 1% badge is earned through verified real sharing, not purchased; it is not an ESG certification or official recommendation.
- Enterprise can publish jobs and connect with the MEMBER HR network without receiving member lists/private contacts.
- Enterprise participation/Impact stage must not be based simply on money.

## 百工百業 / HR network
- Interactive growing industry network centered on RCSCA/1%.
- Show industries/professions already present and gaps still needed.
- Public users can see the network at a safe level; deeper contact/search is MEMBER-gated.
- No member-list cold outreach.
- HR network has two major tracks: life/professional services and jobs/talent.

## PASS IT ON
- No permanent giver/recipient identity.
- Real needs outside statutory subsidy categories can be assessed.
- Support cases are sensitive and separate from public/member lists.
- Recipients/families/institutions may later return any form of their own 1%; reciprocity is not debt and need not be equivalent.

## Homepage / UI rules
- First-session Brand Entrance: black + mist gold, RCSCA × 1% × Cycle of Goodness; no ENTER text.
- Entrance holds before interaction, then on click pauses/brightens and dissolves through smoke over ~4 seconds.
- Header lockup visually echoes entrance; logo always returns home.
- Navigation has designed outlined/pill treatment; personal/enterprise remain switchable.
- Hero uses large 1 with smaller %, plus a living animated Cycle rather than a static target diagram.
- Avoid forced headline line breaks on desktop; use responsive typography.
- Visual language: black, warm ivory, mist gold/bronze; restrained, premium, not generic charity-red or gamified-cartoon styling.

## V6 locked brand architecture — 2026-08-31
- RCSCA and Cycle of Goodness are the existing bound brand lockup; 1% is the newer participation system. Front-facing lockup: `RCSCA / Cycle of Goodness × 1%` rather than three equal parallel labels.
- Emphasize the numeral `1`; `%` is a smaller secondary mark.
- `YOUR 1%` is retired as the front-facing enterprise name. Enterprise identity is `1% PARTNER`; an enterprise may still describe what it shares as its own 1%.
- `PASS IT ON` is retired from the primary brand/navigation architecture. Its underlying principle is part of `CYCLE OF GOODNESS`.
- `百工百業` / `百業` is a working term only. Front-facing name is `1% NETWORK` (共享專業網絡).
- Highest-level model: `RCSCA = PEOPLE × PARTNERS × CARE × CONNECT`.
- PEOPLE and PARTNERS have equal importance (50/50). CARE (public-interest care) and CONNECT (people/resource/network connection) have equal importance (50/50).
- 1% is the participation method. Cycle of Goodness is the result formed when the four dimensions continue to flow and roles can change.
- RCSCA must not be presented as a conventional charity site centered only on giving, sacrifice, pity, or permanent giver/recipient roles.
- Homepage is intentionally concise: brand/hero, Cycle of Goodness explanation, equal personal/enterprise gateways, equal Care/Connect gateways, current action preview, 1% Network preview, verified impact, final gateway. Detailed identity/permissions/levels/cards belong in MY 1%; detailed enterprise stages/tools belong in 1% PARTNER.
- 1% Network preview and full page should show industry nodes with current partner/store counts, scarce categories, empty categories, and later regional gaps. Empty/rare nodes remain visible to invite missing professions to join. No exclusive paid category seats.


## V7 — 十年品牌敘事：99% 根系 × 1% 新生
- 首頁最後收尾加入「根系 × 新生」Key Visual。
- 第一個十年：以地下密集根系象徵長期、低調、真實發生的關懷服務；不把 99% 宣稱為統計數據。
- 低調不是口號：不以受助者處境、悲情影像或被消費的故事換取曝光。
- 下一個十年：地表的 1% 新生象徵共享機制開始發芽，將既有十年累積連結 PEOPLE × PARTNERS × CARE × CONNECT。
- 正式主文案：第一個十年，我們把關懷扎進土地。下一個十年，讓共享從這裡發芽。
- 補充：1% 不是十年的重新開始，而是讓十年的累積開始連結更多人。
- 視覺採抽象根系／嫩芽，不做卡通蘿蔔；99/1 僅為品牌隱喻。

## V8 visual / brand corrections
- Brand entrance must remain present: cosmic night field, restrained shooting stars, RCSCA + Cycle of Goodness × 1% lockup.
- After click, hold the brand moment and use one large meteor sweep / luminous atmospheric expansion to reveal the homepage; do not use a fast generic page transition.
- The 1% sprout in the ten-year roots visual must align directly above the principal root/trunk.
- Root/service vocabulary includes: 陪伴、孩子、家庭、物資、教育、偏鄉、單親、年長、新住民、身障、行動、連結.
- Public-facing footer brand is RCSCA. Do not use the full legal association name as the closing brand signature; legal naming belongs only where legally/operationally necessary.


## Global Navigation — mandatory
- The RCSCA brand lockup is always a Home control. On every subpage, clicking it routes to `/`.
- Every prototype/legacy subpage must retain a visible Home escape route; users must never be trapped in MY 1%, 1% PARTNER, 1% NETWORK, rewards, signup, or admin flows.
- Personal and enterprise worlds may have local back-navigation, but global Home navigation is never removed.


## MY 1% V1 implementation
- Personal identity ladder is Visitor → Sharing Partner → RCSCA MEMBER.
- Level, membership, and permission are separate concepts.
- Frontend never differentiates annual vs lifetime member as a prestige tier.
- Level is driven by real participation and achievements, not donation/purchase amount.
- Digital card material evolves with participation level; identity badge remains separate.
- RCSCA logo always returns to `/`.

## V11 platform split
- Homepage is a brand/gateway page, not a full manual.
- MY 1% = personal world.
- 1% PARTNER = enterprise identity and enterprise tools; replaces YOUR 1% in front-end language.
- 1% NETWORK = shared professional/resource network; replaces the working label 百工百業 on the public site.
- CYCLE OF GOODNESS = core system/worldview; PASS IT ON is no longer a primary brand navigation item.
- 公益行動 = CARE hub. CARE and CONNECT remain equal 50/50 pillars.
- PEOPLE and PARTNERS remain equal 50/50 participant roles.

## V12 visual-system decisions
- Brand entrance uses **Black Space × The 1% Trace**: no literal star field. Space is communicated through darkness, restrained grain, light, silk-like haze and one hero trace/meteor.
- Enterprise landing prioritizes **ESG Services** immediately after the hero. Enterprise visitors must understand RCSCA can plan/execute ESG and social-impact work before seeing partner gamification.
- Desktop H1/H2 and subtitles should remain one visual line whenever viewport width permits; no authored `<br>` for visual drama. Mobile may wrap naturally.
- Navigation uses one restrained outlined/pill language across all primary pages; RCSCA lockup always links home.
- Luxury styling must never reduce readability. Tables and information matrices use high-contrast text; muted color is reserved for secondary metadata only.
