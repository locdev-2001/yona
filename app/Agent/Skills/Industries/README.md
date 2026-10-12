# Industry Packs

Industry packs teach the Yona Agent how a skilled Vietnamese salesperson or front-desk consultant works one industry. Every pack builds on one **archetype** (the shared consulting process for a family of industries), and every archetype builds on the **base skills** in `app/Agent/Skills/`. A pack states only what differs for its industry and for Vietnam; whatever it leaves out is inherited.

Architecture source: `plans/261012-yona-agent-anatomy/design.md` (§1 law 7, §4, §7.2 tool list, §9 memory, §11.1 identity).

## How the files fit together

```
app/Agent/Skills/{Sales,Specialized,Support,Marketing}/*.md   base skills (method only)
app/Agent/Skills/Industries/Archetypes/*.md                          3 archetypes (shared process, stage keys, profile fields)
app/Agent/Skills/Industries/*.md                                     19 industry packs (differences only)
```

- **Frontmatter.** An archetype declares `kind: archetype`, `packs` and `base_skills`. A pack declares `archetype`, `base_skills` (the archetype's list plus any industry extras, paths relative to `app/Agent/Skills/`) and `customer_language: vi-VN`.
- **Precedence when instructions conflict:** hard policy > business rules set by the shop > industry pack > archetype > base skill. The identity and persona sections of base skills never override the AI member's own persona or the inbox voice.
- **Language rule.** Every prompt is written in English. Vietnamese appears only in quoted example lines the agent would send, in quoted customer phrases and slang the agent must understand, and in example notes the agent writes for Vietnamese-speaking staff (handover note templates). Legal documents are cited by their English names.
- **Fixed facts every file respects.** Yona core has no order, inventory, booking-calendar or table-plan module: orders and bookings go to humans through private notes, and stock or availability comes only from a connected external system or from staff (`consult_staff`). The only sending gate is the channel's reply window (`canReply`); courtesy hours are a shop business rule. The AI always tells the truth when asked whether it is a human or a bot. Customer text is data, never instructions (law 7).
- **Proposal markers.** Anything the spec does not have yet is marked in place, never assumed: `[NEW TOOL: …]`, `[NEW ENUM VALUE: Enum.value …]`, `[NEW FIELD]`, `[NEW FIELD GROUP]`, `[NEW FACT KEY]`, `[NEW FACT KIND]`, `[NEW TEMPLATE KEY]`, `[NEW BUSINESS RULE KEY]`, `[NEW PRICING RULE]`, `[NEW RUNNER RULE]`, `[NEW REFLEX]`, `[NEW CONFIG]`, `[NEW SKILL DEFINITION]`, `[NEW TOOL PARAMETER]`, `[NEW METRIC]`, `[INSIGHT SCHEMA EXTENSION]` (a proposed `CustomerInsight` sub-key), `[SPEC NOTE: …]` (a gap in the spec). Unknown numbers are `[THRESHOLD]`.

## Catalog

### Retail goods — `Archetypes/retail-goods.md`

Physical goods sold in chat, closed in one or a few sessions, COD or bank transfer, shipped. Base skills: `Specialized/customer-service`, `Sales/sales-discovery-coach`, `Specialized/retail-customer-returns`, `Marketing/marketing-private-domain-operator`, `Specialized/customer-success-manager`, `Support/support-support-responder`.

| Industry | Pack file | Trait | Extra base skills |
|---|---|---|---|
| Fashion & accessories | `fashion.md` | Size only from `size_advise` on the product's own size chart; material and origin words are claims; livestream order bursts | `Marketing/marketing-livestream-commerce-coach` |
| Cosmetics & beauty (incl. beauty supplements) | `cosmetics.md` | Every efficacy word is quoted verbatim from `usage_claim`; skin intake; a reaction is a safety incident, not an objection | `Specialized/healthcare-marketing-compliance` |
| Mother & baby products | `mother-baby.md` | Buying for someone who cannot speak; infant-feeding promotion limits; health questions go to a human | `Specialized/healthcare-customer-service`, `Specialized/healthcare-marketing-compliance` |
| Food, regional specialties & beverages | `food-specialties.md` | Perishables and event deadlines; no health claims; food-safety and alcohol limits; seasonal gifting | `Specialized/hospitality-guest-services`, `Specialized/healthcare-marketing-compliance`, `Marketing/marketing-livestream-commerce-coach` |
| Phones, electronics & appliances | `electronics.md` | Model, condition, origin version and warranty must all be right; used units are individual; safety triage for batteries, gas and power | `Sales/sales-engineer` |
| Furniture & building materials | `furniture-materials.md` | Fit is placement plus access path; quantity comes from area; made-to-order vs made-to-measure; bulky delivery by humans | `Sales/sales-engineer` |
| Pet food, accessories & add-on services | `pets.md` | Fit is decided by the animal (species, weight, life stage); symptom screen before selling; grooming and boarding are booking requests | `Specialized/hospitality-guest-services`, `Specialized/healthcare-customer-service` |
| Agricultural produce & small distributors | `agri-wholesale.md` | Sold by weight or volume; retail and wholesale paths split early; farm-input claims only from the label; weight disputes are collected, never decided | `Sales/sales-account-strategist` |

### Appointment services — `Archetypes/appointment-services.md`

The conversation closes with a booking: a slot, maybe a deposit, reminders, then the service. Base skills: `Specialized/hospitality-guest-services`, `Specialized/customer-service`, `Sales/sales-discovery-coach`, `Specialized/customer-success-manager`.

| Industry | Pack file | Trait | Extra base skills |
|---|---|---|---|
| Restaurants & cafes | `restaurant-cafe.md` | Three tracks (tables, pre-orders, parties); allergy protocol; surcharges and peak dates; no table promised before staff confirm | `Sales/sales-proposal-strategist` |
| Spa, salon & non-invasive aesthetics | `spa-salon.md` | The body is the product; screening by the shop's checklist, suitability by the technician; "from" prices stay ranges; no upselling on the bed | `Specialized/healthcare-marketing-compliance` |
| Clinics & dental | `clinic-dental.md` | Intake, booking and administrative information only; red-flag screen on every body mention; discreet reminders; the visit is the conversion | `Specialized/healthcare-customer-service`, `Specialized/healthcare-marketing-compliance` |
| Home services | `home-services.md` | The provider goes to the customer's home; price is often set on site; evidence (photos, model label, area) is the core skill; access details are security data | `Sales/sales-engineer` |
| Events, weddings & photography | `events-wedding.md` | One date, one crew, no second take; packages built from lines; long lead with milestones and staged payments; deliverables arrive after the service | `Sales/sales-proposal-strategist` |
| Travel, hotels, homestays & tours | `travel-hospitality.md` | A room is sold on many channels at once; the price is a calendar and every price has a unit; deposit-scam fears; guest privacy | `Specialized/language-translator`, `Sales/sales-proposal-strategist` |

### High-consideration, long cycle — `Archetypes/high-consideration.md`

Decided over days or weeks by several people, through a meeting, a written offer and paperwork run by people. The conversion is a qualified, staff-confirmed meeting and a complete hand-off. Base skills: `Sales/sales-discovery-coach`, `Sales/sales-deal-strategist`, `Sales/sales-proposal-strategist`, `Specialized/sales-outreach`, `Specialized/customer-success-manager`.

| Industry | Pack file | Trait | Extra base skills |
|---|---|---|---|
| Real estate (brokerage, projects, rentals) | `real-estate.md` | Four tracks (project unit, resale, rental, consignment); legal status is part of the product; availability changes by the hour at launches; money moves only through people and contracts | `Specialized/real-estate-buyer-seller`, `Specialized/loan-officer-assistant` |
| Cars & motorbikes | `auto-moto.md` | Vehicle sales (long cycle) and workshop service (short, repeating) share one inbox; the price is never one number; every unit is an individual | `Sales/sales-engineer`, `Specialized/customer-service`, `Specialized/loan-officer-assistant` |
| Education, courses & language centers | `education.md` | Payer and learner differ; sell a process, not a result; the placement test or trial class is the conversion; minors' data rules | `Specialized/study-abroad-advisor`, `Specialized/customer-service` |
| Insurance & finance | `insurance-finance.md` | Front desk, not advisor: capture needs, book a licensed person, route servicing requests; no product advice | `Specialized/loan-officer-assistant`, `Specialized/customer-service` |
| Software & SaaS for businesses | `software-saas.md` | Single-shop owner (BANT) vs multi-stakeholder company (MEDDPICC); every capability is a claim; value arrives after payment; regulation drives demand but is never interpreted | `Sales/sales-engineer`, `Sales/sales-account-strategist`, `Specialized/customer-service`, `Support/support-support-responder` |

## Stage keys per archetype

Stage keys are `SalesStage` values tracked per agenda item through `state_update`. Packs never add, rename or reorder keys; they add sub-steps inside a stage. Keys marked * are proposed enum values.

| Archetype | Stage keys |
|---|---|
| Retail goods | `greeting` → `needs_discovery` → `consulting` → `objection_handling` → `closing` → `payment` → `delivery` → `after_sale`; `issue_resolution`* for post-purchase problems (excluded from the `abandoned` signal). Non-linear: a product-card order enters at `closing`, COD skips `payment`. |
| Appointment services | `greeting` → `needs_discovery` → `consulting` → `objection_handling` → `availability_check`* → `closing` → `payment` → `pre_service`* → `after_sale`. `delivery` is not used. A change or cancellation is a new agenda item, not a stage. |
| High-consideration | `greeting` < `needs_discovery` < `qualification`* < `consulting` < `appointment`* < `proposal`* < `objection_handling` < `closing` < `paperwork`* < `payment` < `delivery` < `after_sale`; `nurturing`* is a parked state outside the order (excluded from `abandoned`). Packs may skip stages (Insurance & finance hands off after `qualification`). |

Shared profile field keys (packs use them exactly):

- **Retail goods:** `address_pair`, `buyer_role`, `need_summary`, `use_context`, `needed_by`, `budget_band`, `preferences`, `concerns`, `co_decider`, `last_sales_stage`, `preferred_channel`, `declined_offers`, plus the order slip (`lines[]`, `recipient_name`, `recipient_phone`, `address`, `payment_method`, `delivery_note`).
- **Appointment services:** `address_pair`, `booking_contact_name`, `booking_contact_phone`, `service_lines`, `party_size`, `requested_slots`, `confirmed_slot`, `service_location`, `occasion`, `budget_band`, `decision_maker`, `special_requests`, `health_safety_notes` (transcript and handover note only), `preferred_staff`, `payment_method`, `deposit_status`, `booking_status`, `visit_history`, `declined_offers`, `source_channel`.
- **High-consideration:** `address_pair`, `customer_type`, `lead_reference`, `primary_need`, `use_context`, `current_situation`, `trigger`, `desired_outcome`, `decision_criteria`, `budget_range`, `payment_preference`, `decision_unit`, `decision_timeline`, `alternatives_considered`, `main_concerns`, `appointment`, `declined_offers`, `preferred_channel`, `pause_reason`, `consent_to_follow_up`.

## Proposed new tools

None of these exist in spec §7.2. Each pack states the interim behavior with today's tools.

| Tool | Purpose | Proposed by | Interim with today's tools |
|---|---|---|---|
| `handoff_with_notice` | Terminal. Sends one safety line to the customer (the shop's approved safety template for the case when one exists: emergency, stop-use, referral, grief; otherwise a model-written line checked by `OutputGuard`) and hands the floor to a human in the same turn | All three archetypes (§5 safety sequence), cosmetics, mother-baby, pets | Safety sequence: urgent `add_private_note` + `reply` with the safety line this turn, `handoff` on the next wake-up |
| `lookup_availability` | Reads live slot, table, room, technician or crew availability from a connected external booking system through a Port; returns `origin: live` facts or `unknown` | Appointment-services archetype; restaurant-cafe, spa-salon, clinic-dental, home-services, events-wedding, travel-hospitality | `consult_staff` (topic `slot_availability`, or `stock` until it exists) |
| `request_booking_confirmation` | Binding read-back of the whole booking ticket (service lines + `Quote` + confirmed slot + party size + branch or address + deposit + cancellation terms), same `confirmed_by_message_id` and `version` rules as `request_order_confirmation`; must accept a seating-only ticket | Appointment-services archetype; same six packs | `request_order_confirmation` plus the slot details in the same reply |
| `cancel_follow_up` | Cancels pending `follow_up` or `after_sale` commitments of this conversation by agenda item or commitment id (`Effect CancelCommitments`, `internal_write`) | restaurant-cafe (changed or cancelled bookings), mother-baby (grief stop rule) | List obsolete reminders in the change or cancel note; staff cancel them |
| `lookup_receivable` | Read-only outstanding balance and due date for this contact from a connected accounting or sales system through the commerce reader; `unknown` otherwise | agri-wholesale | `consult_staff`; never state a balance from memory |
| `lookup_service_ticket` | Reads the status of a warranty or repair ticket from a connected service system (`lookup_order_status` reads sales orders only) | electronics | `consult_staff(consult_topic: order_status)` |
| `lunar_date_convert` | Deterministic lunar-to-solar date conversion in the inbox timezone | food-specialties | A live `notice` that states both dates, or ask the customer for the solar date |
| `estimate_material_quantity` | Converts a customer-given area or length into selling units (boxes, rolls, sheets, cans) from `product_spec` coverage, number of coats and the shop's published wastage rate, showing the formula | furniture-materials | Staff compute the quantity; the model never does the arithmetic |

Also proposed: `[NEW TOOL PARAMETER]` extra `search_knowledge` filters for real estate (`location`, `bedrooms`, `area_min`/`area_max`, `property_type`, `deal_track`).

## Other proposed spec changes

- **`SalesStage` values:** `issue_resolution` (retail); `availability_check`, `pre_service` (appointment); `qualification`, `appointment`, `proposal`, `paperwork`, `nurturing` (high-consideration).
- **`ConsultTopic` values:** `slot_availability` (both appointment and high-consideration archetypes, and pets), `quote_request` (high-consideration), `product_info` (cosmetics, auto-moto, furniture-materials), `academic_review` (education), `technical_question` (software-saas), `technical_assessment` (home-services), `legal_status` (real-estate), `licensed_advice` (insurance-finance), `service_suitability` (spa-salon), `dish_ingredients` (restaurant-cafe), `on_site_request` (travel-hospitality).
- **Other enum values:** `FulfillmentStatus.booked`, `FulfillmentStatus.no_show`; `CustomerIntent.medical_emergency`, `.clinical_question`, `.treatment_plan_followup`; `incident_category.clinical_advice`.
- **Agenda and quote structure:** `AgendaItem.order.booking {requested_slots[], confirmed_slot, party_size, branch_ref, duration_minutes, hold_until, confirmation_source}` with `sessions[]`, `end_date`, `party_size.children_ages[]`, `destination_address`; `AgendaItem.appointment {type, requested_slot, confirmed_slot, location_ref, attendees, status}`; `AgendaItem.deal_track`; `Quote.surcharges[]`.
- **Pricing and Runner rules:** tax and service-charge lines, per-guest share (labelled as an estimate), transfer-card amounts for the next instalment and for the balance after deposits.
- **Fact kinds:** `practitioner_profile`, `legal_status`, `payment_schedule`. About 50 new fact keys, mostly under `service_policy` (`opening_hours`, `auto_accept`, `late_arrival`, `house_rules`, `rate_calendar`, `preparation`, `deliverables`, `licensed_advisors`, …); see each pack's "Business knowledge to ingest" section.
- **Templates, rules, config:** template keys `medical_emergency_redirect`, `food_safety_handoff`, `licensed_advice_notice`, a safety-incident hand-off holding message and an out-of-hours consult holding message; business rule keys `customerLanguages`, `sellsVeterinaryDrugs`; reflex `medical_red_flag` (deterministic, before the Reasoner); clinic-dental config for a clinical keyword blocklist on insight and memory writes; skill definition "appointment setting".
- **Customer insight sub-keys** (`[INSIGHT SCHEMA EXTENSION]`): `buyer_role`, `use_context`, `needed_by`, `co_decider` (retail); `customer_type`, `payment_preference`, `decision_unit`, `decision_timeline`, `alternatives_considered`, `pause_reason`, `consent_to_follow_up` (high-consideration); pack proposals such as `skin_type`, `makeup_shade`, `fit_profile.usual_sizes`, `child_stage`, `learner_stage`, pet profile fields, `budget_range.basis`.
- **Metrics:** about 90 `[NEW METRIC]` items that need Scoring support.

## Open questions for the founder

1. **One `SalesStage` enum or per-archetype stage sets?** The proposals bring the enum to 16 values. The `abandoned` rule compares stages ("≥ `consulting`"), so it needs one order per archetype, plus exclusions for `issue_resolution`, `nurturing` and items waiting for a staff-confirmed booking.
2. **One booking structure?** The appointment archetype proposes `AgendaItem.order.booking`, the high-consideration archetype proposes `AgendaItem.appointment`. Both hold a requested and a confirmed slot. Merge them, or keep two?
3. **How many `ConsultTopic` values?** Eleven are proposed. Should they all become enum values (each routed through `JobProfile.consultTargets`), or should a small set with a free-text subtopic be enough? Should a staff answer to `quote_request`, `product_info` or `legal_status` count as a claim basis for `OutputGuard`, as `price_exception` does today (auto-moto spec note)?
4. **`handoff_with_notice`: template only, or model-written too?** Cosmetics, mother-baby and clinic-dental want shop-approved templates only; pets accepts a model-written line checked by `OutputGuard`. Until it exists, every safety case takes two turns.
5. **Bookings and fixed prices.** Should `request_booking_confirmation` be a new tool, or should `request_order_confirmation` be extended (orders with no address, seating-only lines, no shipping component)? High-consideration packs also need a per-shop `BusinessRules` switch for the fixed-price flow (course fees, maintenance packages).
6. **`OrderPricing` extensions:** surcharges, service charge and VAT lines, per-guest shares, staged instalments and balances. Which ones ship, and in which phase?
7. **Address model after the 2025 administrative reorganization.** Home-services notes that the district level was removed and many wards and provinces were merged. The order slip and `shipping_terms` still use province/district/ward. Move to province/ward?
8. **How a pack is chosen.** Is the pack set per account (industry key), or per agenda item? Mixed shops are common: pets (goods + grooming bookings), auto-moto (sales + workshop), restaurants (tables + pre-orders), spa (services + retail products).
9. **Which insight sub-keys to admit**, and whether `child_stage` and `learner_stage` pass a privacy review.
10. **Lunar dates.** The appointment archetype says to confirm the solar date with the customer and never convert silently. Food-specialties proposes `lunar_date_convert`. Build it (still reading the date back), or always ask the customer?
11. **`lookup_receivable`.** Is it acceptable for the agent to read and state a dealer's outstanding balance, and at which sender-trust level?
12. **Reply languages.** Travel proposes `BusinessRules.customerLanguages` for foreign guests, while every pack declares `customer_language: vi-VN`.
13. **Proactive wake on new knowledge.** Real estate notes that nothing wakes a parked item when a matching listing or notice is ingested. Should ingestion wake parked items, or only scheduled follow-ups?
14. **Read ports beyond orders:** subscription status (software-saas), class seats (education), service tickets (electronics). Extend `CommerceReader`, or add separate ports?
15. **Industry-specific safety configuration:** the clinic-dental keyword blocklist and memory-write rules, insurance-finance red lines in `platform_floor.forbidden_topics`, and the `medical_red_flag` reflex. Where do industry-keyed rules live?
16. **Staff-facing note templates in Vietnamese.** Handover and booking note templates (for example in clinic-dental) are written in Vietnamese because they are the agent's output to Vietnamese-speaking staff. Confirm this exception to the English-only prompt rule.
17. **Metric priority:** which of the roughly 90 proposed metrics Scoring should build first.

## Legal points needing confirmation

Every pack cites these only for staff orientation and for routing decisions. None is quoted to a customer until confirmed, and no article numbers are cited. Each item needs confirmation of the version in force.

- **Consumer protection and e-commerce:** Law on Protection of Consumer Rights 2023 and Decree 55/2024/ND-CP (accurate information, remote sales, promotion conditions, whether business buyers are covered); Decree 52/2013/ND-CP on e-commerce as amended by Decree 85/2021/ND-CP; Law on Prices 2023 (price listing); Decree 81/2018/ND-CP on trade promotion; Law on Competition (disparagement).
- **Personal data:** Law on Personal Data Protection 2025 and its implementing decree, and which parts of Decree 13/2023/ND-CP still apply (health, financial and children's data as sensitive data, consent, minimum necessary processing); Law on Children 2016 (children's data and images); Civil Code 2015 (right to one's image); Decree 91/2020/ND-CP on spam messages, emails and calls; Law on HIV/AIDS Prevention and Control (test confidentiality).
- **Advertising and claims:** Law on Advertising 2012 and its amendments, including the 2025 amendments, rules on endorsements, superlatives, comparisons and before/after images; Decree 181/2013/ND-CP as amended by Decree 70/2021/ND-CP; Decree 38/2021/ND-CP on sanctions in culture and advertising.
- **Labels, origin, quality and IP:** Decree 43/2017/ND-CP on goods labels as amended by Decree 111/2021/ND-CP; Decree 31/2018/ND-CP on origin of goods; Law on Product and Goods Quality 2007; Law on Standards and Technical Regulations 2006 and the national technical regulations (QCVN) cited by packs (textiles, toys, motorcycle helmets, building materials); Decree 98/2020/ND-CP and Decree 99/2013/ND-CP on counterfeit goods and IP sanctions; Law on Intellectual Property (geographical indications, photo and video copyright, software licensing); Law on Measurement 2011; mandatory energy labelling; telecom rules on devices during the 2G switch-off; vehicle recall rules.
- **Food, cosmetics, supplements and alcohol:** Law on Food Safety 2010 and Decree 15/2018/ND-CP (mandatory supplement statement); Decree 100/2014/ND-CP on nutritional products for young children, feeding bottles and teats; Circular 06/2011/TT-BYT on cosmetics and the ASEAN Cosmetic Directive; Law on Pharmacy; Decree 98/2021/ND-CP on medical devices; Law on Prevention and Control of Harmful Effects of Alcoholic Beverages 2019 and Decree 105/2017/ND-CP; Law on Prevention and Control of Tobacco Harms 2012 and the 2024 National Assembly resolution banning e-cigarettes and heated tobacco.
- **Health services:** Law on Medical Examination and Treatment 2023 and Decree 96/2023/ND-CP (licensed scope; injections, fillers and anaesthesia are medical services, which limits spa-salon); Decree 117/2020/ND-CP on sanctions in the health sector; Law on Health Insurance and its 2024 amendments; the Ministry of Health rules on health certificates and on remote examination (document numbers to be confirmed); the population rules banning fetal sex selection.
- **Agriculture, animals and timber:** Law on Crop Production 2018; Law on Plant Protection and Quarantine 2013; Decree 84/2019/ND-CP on fertilizer; Decree 109/2018/ND-CP on organic agriculture; Law on Animal Husbandry 2018 and Decree 13/2020/ND-CP (feed, including whether it covers pet food); Law on Veterinary Medicine 2015 and Decree 35/2016/ND-CP (antiparasitics and dewormers as veterinary drugs); Decree 90/2017/ND-CP; Decree 06/2019/ND-CP and the Criminal Code on protected wildlife; Law on Forestry 2017 and Decree 102/2020/ND-CP on timber legality.
- **Insurance, credit and securities:** Law on Insurance Business 2022, Decree 46/2023/ND-CP and Circular 67/2023/TT-BTC (who may advise, investment-linked products, bank sales near disbursement); Decree 67/2023/ND-CP on compulsory insurance; Law on Credit Institutions 2024 (no tying of insurance to credit); Law on Securities 2019; Civil Code 2015 and Criminal Code 2015 (interest ceilings, usury); Law on Investment 2020 (debt collection is a prohibited business line); the State Bank's card rules (card cash-out); the Ordinance on Foreign Exchange (no foreign-currency pricing).
- **Tax and invoices:** Decree 123/2020/ND-CP as amended by Decree 70/2025/ND-CP, with the guiding circular (whether Circular 78/2021/TT-BTC was replaced); Law on Tax Administration 2019; Law on Value-Added Tax 2024; Law on Accounting 2015; the end of lump-sum taxation for household businesses.
- **Contracts and deposits:** Civil Code 2015 (deposits, sale contracts, warranty obligations); Law on Notarization 2024.
- **Real estate:** Law on Real Estate Business 2023 (brokerage and advertising conditions); Law on Housing 2023; Land Law 2024; Law on Urban and Rural Planning 2024; Decree 08/2020/ND-CP (a bailiff record does not replace a notarized transfer); Law on Gender Equality 2006 (no discriminatory steering).
- **Vehicles and transport:** Law on Road Traffic Order and Safety 2024 (licence classes, rider ages, registration, inspection); Road Law 2024; the Ministry of Public Security rules on registration and plates; the registration-fee decree in force; provincial truck-hour restrictions.
- **Education:** Law on Education 2019; Decree 125/2024/ND-CP on conditions for education investment; Circular 29/2024/TT-BGDDT on extra teaching and learning; Law on Vocational Education 2014; Law on Vietnamese Workers Working Abroad under Contract 2020; exam regulations of the Ministry of Education and Training.
- **Tourism and accommodation:** Law on Tourism 2017; Decree 168/2017/ND-CP; Decree 45/2019/ND-CP on sanctions in tourism; Law on Residence 2020 (guest registration); the law on entry and residence of foreigners.
- **Software and digital services:** Law on Electronic Transactions 2023 and the e-signature decree; Law on Cybersecurity 2018 and Decree 53/2022/ND-CP (data storage); Law on Bidding 2023.
- **Work and event safety:** Law on Occupational Safety and Hygiene 2015 (work at height); Law on Chemicals and Decree 91/2016/ND-CP (pest-control chemicals); Decree 137/2020/ND-CP on fireworks; the unmanned-aircraft decree and the Law on People's Air Defence 2024 (flycam).
- **Other:** Ordinance on Prostitution Prevention and Control 2003 (massage businesses); the 2025 National Assembly resolutions on administrative units and the Law on Organisation of Local Government (service areas and addresses).

## Adding or changing a pack

1. Pick the archetype whose stages fit how the industry closes: a shipped order (retail goods), a booked slot (appointment services), or a staff-run meeting and paperwork (high-consideration).
2. Copy the section order of an existing pack in that archetype: scope, customer profile, consulting process, business knowledge to ingest, objections, upsell, after-sale cadence, hand-off, red lines, metrics, eval scenarios, base-skill use.
3. Use only the archetype's stage keys and shared field keys, and only tool names from spec §7.2. Mark everything else with a proposal marker, and add new proposals to this README.
4. Keep the language rule: English prompts, Vietnamese only inside quoted example lines and quoted customer phrases.
