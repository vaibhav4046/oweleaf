#!/usr/bin/env python3
"""Generate the synthetic chase-decision training set for the Farthing SLM.

v3: boundary contrast reinforced.
v2: prompts now match src/brain/prompts.js buildDecisionPrompt byte-for-byte
(including the Payer line and History section), and the day distribution
oversamples the tone-ladder boundaries (7/8 and 21/22) and the 22+ final
region, after eval v1 showed the model under-chasing severe/history cases.

Labels come straight from the documented policy (src/brain/heuristic.js):
chaseable = status SENT and days_overdue > 0; tone = gentle (1-7),
firm (8-21), final (22+). History is context the model must learn to read
without letting it override the days-based ladder.

Output: dataset_train.jsonl / dataset_val.jsonl with
{"prompt": ..., "completion": ...} rows (train_qlora.py joins them and
appends the EOS token).
"""

import json
import random

random.seed(42)

GENTLE = [
    "Hi {f},\n\nA gentle reminder that invoice {n} ({c} {a}) fell due on {d}. If payment is already arranged, please ignore this.\n\nBest",
    "Hi {f},\n\nJust a quick nudge - invoice {n} for {c} {a} was due on {d} and may have slipped through. No worries if it is already on its way.\n\nMany thanks",
]
FIRM = [
    "Hi {f},\n\nInvoice {n} for {c} {a} was due on {d} and is now {x} days overdue. Please arrange payment this week, or reply if something is holding it up.\n\nThank you",
    "Hi {f},\n\nFollowing up on invoice {n} ({c} {a}), due {d} and now {x} days past due. I would appreciate payment or an update by Friday.\n\nRegards",
]
FINAL = [
    "Hi {f},\n\nDespite earlier reminders, invoice {n} for {c} {a} remains unpaid {x} days after its due date ({d}). Please pay within 7 days or contact me to agree a plan.\n\nRegards",
    "Hi {f},\n\nThis is a final reminder for invoice {n} ({c} {a}), due {d}, now {x} days overdue. Please settle within 7 days or get in touch today.\n\nRegards",
]

NAMES = ["Amelia Bryant", "Marcus Osei", "Priya Shah", "Tom Weller", "Nina Petrova",
         "James Larkin", "Sofia Marchetti", "Daniel Okafor", "Hannah Boyd", "Leo Fischer",
         "Grace Naylor", "Owen Pritchard", "Maya Kulkarni", "Felix Anders", "Rosa Delgado"]

PROMPT_TEMPLATE = """You are Farthing, an accounts-receivable assistant for a freelancer.
Decide the next action for one invoice and draft the reminder if needed.

Rules:
- action is one of: remind, wait, escalate
- tone is one of: gentle (1-7 days overdue), firm (8-21), final (22+)
- never threaten, never invent discounts, never invent payment promises
- keep the note under 80 words, plain and professional
- reply with ONLY a JSON object: {{"action":..,"tone":..,"subject":..,"note":..,"reasoning":..}}

Invoice: #{inv_no}, GBP {amount}, due {due}, {days} days overdue, status {status}.
Payer: {payer}.
History:
{history}"""

# Day distribution with deliberate mass on the ladder boundaries and the
# final-notice region: eval v1 missed exactly those.
DAY_BUCKETS = (
    list(range(-10, 1)) * 3 +      # not yet due / due today -> wait
    list(range(1, 7)) * 3 +        # gentle core
    [7, 8] * 8 +                   # gentle/firm boundary (eval v2 missed both sides)
    list(range(8, 21)) * 3 +       # firm core
    [21, 22] * 8 +                 # firm/final boundary (eval v2 pushed 21d to final)
    list(range(22, 46)) * 2        # final region, incl. severe 30d+
)

HISTORY_NONE = "- no prior chases"


def tone_for(days, gentle_max=7, firm_max=21):
    return "gentle" if days <= gentle_max else ("firm" if days <= firm_max else "final")


def history_for(days, payer_first):
    """Prior chase entries consistent with the ladder so the model learns to
    read history without letting it override the days-based policy."""
    # boundary days always carry a prior chase: eval v2 let a logged gentle
    # chase pull 8-21d invoices back to gentle (E04) and 21d up to final (E10)
    if days in (7, 8):
        return f"- 2 days ago: gentle reminder sent to {payer_first}"
    if days in (21, 22):
        return ("- 12 days ago: gentle reminder sent to {p}\n"
                "- 2 days ago: firm reminder sent to {p}").format(p=payer_first)
    if days <= 3 or random.random() < 0.45:
        return HISTORY_NONE
    entries = []
    if days > 7:
        entries.append(f"- 7 days ago: gentle reminder sent to {payer_first}")
    if days > 21 and random.random() < 0.7:
        entries.append(f"- 3 days ago: firm reminder sent to {payer_first}")
    if not entries:
        return HISTORY_NONE
    return "\n".join(entries)


def make_example(i):
    name = random.choice(NAMES)
    inv_no = f"F-{1000 + i}"
    amount = f"{random.choice([120, 240, 320, 450, 600, 780, 890, 1050, 1280, 1500, 2100])}.00"
    days = random.choice(DAY_BUCKETS)
    status = random.choices(["SENT", "PAID", "DRAFT"], weights=[0.72, 0.16, 0.12])[0]
    due = f"2026-{random.randint(9, 11):02d}-{random.randint(1, 28):02d}"
    chaseable = status == "SENT" and days > 0
    history = history_for(days, name.split()[0]) if chaseable else HISTORY_NONE

    prompt = PROMPT_TEMPLATE.format(
        inv_no=inv_no, amount=amount, due=due, days=days, status=status,
        payer=name, history=history,
    )

    if not chaseable:
        out = {"action": "wait", "tone": None, "subject": None, "note": None,
               "reasoning": f"invoice {inv_no} is not chaseable (status {status}, {days} days past due)"}
    else:
        tone = tone_for(days)
        t = random.choice({"gentle": GENTLE, "firm": FIRM, "final": FINAL}[tone])
        note = t.format(f=name.split()[0], n=inv_no, c="GBP", a=amount, d=due, x=days)
        subject = {
            "gentle": f"Friendly nudge: invoice {inv_no} (GBP {amount})",
            "firm": f"Overdue: invoice {inv_no} (GBP {amount}) - {days} days",
            "final": f"Final notice: invoice {inv_no} (GBP {amount})",
        }[tone]
        hist_note = "" if history == HISTORY_NONE else " (prior chases logged)"
        out = {"action": "remind", "tone": tone, "subject": subject, "note": note,
               "reasoning": f"{days} days overdue -> {tone} tone (gentle <= 7d < firm <= 21d < final){hist_note}"}

    completion = json.dumps(out, ensure_ascii=False)
    return {"prompt": prompt, "completion": completion}


def main():
    rows = [make_example(i) for i in range(1500)]
    random.shuffle(rows)
    split = int(len(rows) * 0.9)
    with open("dataset_train.jsonl", "w") as f:
        for r in rows[:split]:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    with open("dataset_val.jsonl", "w") as f:
        for r in rows[split:]:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"wrote {split} train / {len(rows) - split} val examples")


if __name__ == "__main__":
    main()
