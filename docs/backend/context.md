# ShiftFix — Project Context

> Source: hackathon challenge brief (originally in Russian), translated and condensed.
> Time box: **2 hours** for the whole build.

## The problem

SD Worx builds HR and payroll software for thousands of European companies, including restaurants, supermarkets, hospitals and logistics centres. Staff at these companies work in shifts.

When an employee calls in sick in the morning, the manager has to find a replacement fast, usually by phoning people one by one and sending WhatsApp messages. While doing that, the manager has to keep in mind who is actually allowed to take the shift:

- **Qualifications.** Is the person certified or trained for this role?
- **Weekly hour limits.** Would this shift push them over their contract or legal maximum?
- **Mandatory rest between shifts.** Is there enough rest since their last shift and before their next one?
- **Student contracts.** Students have capped hours.

Today:

- Finding a replacement takes **an hour or more**.
- Mistakes lead to **labour-law violations**.
- Shifts left empty mean **lost revenue**.

## The task

Build a product that helps fill an unstaffed shift **quickly and legally**.

## Constraints and conditions

| Area | Condition |
|---|---|
| Organisation size | 20–50 employees |
| Contract types | Full-time, part-time, student |
| Languages | Managers and employees use **Dutch, French or English** (Belgian context, which fits SD Worx being Belgium-based) |
| Labour law | The solution must comply with labour rules. A **simplified rule set defined by the team** is acceptable. |
| Employee agency | Employees have **preferences** and **can decline** a shift offer |
| Data sensitivity | The product handles **personal HR data**, so privacy and GDPR-minded design matter |
| Test data | The team prepares its own employees, schedule and rules |

## Deliverables

1. **Working prototype.**
2. **3-minute demo** following this scenario:
   > **07:00**: an employee reports sick. Their shift starts at **09:00**.
3. **Short explanation** of how we guarantee that the proposed solution does not break the rules.

## Judging criteria

| Criterion | Weight |
|---|---|
| Value for the manager and the employees | **30%** |
| Correctness: rules are never violated | **25%** |
| Speed and ease of use in a real situation | **20%** |
| Technical execution | **15%** |
| Presentation | **10%** |

---

## Working notes (our interpretation, not part of the brief)

### Implications of the brief

- **Correctness is a hard gate.** An ineligible candidate must never be suggested. The rule check has to be deterministic and explainable, and ideally it shows *why* each person is eligible or excluded.
- **Two users, two experiences.** The manager needs a fast "find and fill" flow. The employee needs a low-friction way to accept or decline, probably on mobile and in their own language.
- **Speed is the core value.** The 07:00 → 09:00 scenario means the manager must reach a confirmed replacement in minutes, with as few clicks as possible.
- **Declines are expected.** The flow has to handle "no" answers and move on to the next candidate. It could also offer the shift to several people at once, first to accept wins.
- **Preferences ≠ rules.** Legal and contract rules are hard filters. Preferences such as availability, preferred hours and fairness are soft and only affect ranking.
- **Multilingual (NL / FR / EN)** across the UI and the messages sent to employees.
- **Privacy.** Show only the minimum personal data needed. Never show sick-leave reasons or medical details. Candidates should not see each other's data.

### Simplified rule set

These rules are loosely based on the EU Working Time Directive and common Belgian practice. They are not legal advice. The final values live in `rules.json`; see `domain.md` → "Labour rules config".

- The worker must hold the qualification the shift requires, and it must not be expired.
- At least **11 hours of rest** between the end of one shift and the start of the next.
- Weekly hours:
  - full-time: at most 40h
  - part-time: at most their contract hours + 4h
  - students: at most 20h
  - everyone: an absolute cap of 48h
- At most 9h of work per day.
- Student yearly quota: 650h, counted across all employers (value to confirm).
- No overlap with an existing shift, absence (sick, vacation) or recorded unavailability.

### Demo checklist

- [ ] Seed data: about 20–50 employees with a mix of contracts, qualifications and languages, plus a weekly schedule.
- [ ] Mark an employee sick at 07:00 → the 09:00 shift becomes open.
- [ ] System lists eligible candidates, ranked, with the reasons others were excluded.
- [ ] Offer goes out to candidates in their own language → one declines → another accepts.
- [ ] Shift is filled and the schedule updates. Show a rule-compliance summary.
- [ ] Have a one-slide or one-paragraph answer ready for "how do you guarantee no rule is broken".
