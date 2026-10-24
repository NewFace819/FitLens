"""Run every profile in profiles/ through the plan generator and write a test report.

Usage: python run_tests.py
Writes outputs/test_report.md (paste into the tracker) and outputs/test_report.html (open in a browser).
Exit code 0 only if every profile passes.
"""

import json
import sys
from datetime import datetime
from html import escape

from google.genai import errors

from generate_plan import (HERE, OUTPUT_DIR, WEEKDAYS, WorkoutPlan, generate_plan, make_client,
                           save_plan)


def run_all() -> tuple[list[dict], str]:
    client, model = make_client()
    stamp = f"{datetime.now():%Y%m%d_%H%M%S}"
    results = []
    for path in sorted((HERE / "profiles").glob("*.json")):
        profile = json.loads(path.read_text(encoding="utf-8"))
        print(f"- {path.stem} ...", end=" ", flush=True)
        result = {"name": path.stem, "profile": profile, "plan": None, "problems": [], "error": ""}
        try:
            result["plan"], result["problems"] = generate_plan(client, model, profile)
            save_plan(result["plan"], f"{path.stem}_{stamp}")
        except (errors.APIError, ValueError) as e:
            result["error"] = str(e)
        result["passed"] = result["plan"] is not None and not result["problems"]
        print("PASS" if result["passed"] else "FAIL")
        results.append(result)
    return results, model


def summary_row(r: dict) -> dict:
    p, plan = r["profile"], r["plan"]
    days = [d.day for d in plan.weekly_schedule] if plan else []
    busy = p.get("busy_days", [])
    clashes = [d for d in days if d in busy]
    longest = max((d.estimated_minutes for d in plan.weekly_schedule), default=0) if plan else 0
    return {
        "profile": r["name"],
        "requested": f"{p['days_per_week']} x {p['minutes_per_session']} min",
        "busy": ", ".join(d[:3] for d in busy) or "none",
        "training": ", ".join(d[:3] for d in days) or "-",
        "clash": ", ".join(clashes) or "none",
        "minutes": f"{longest} / {p['minutes_per_session']}" if plan else "-",
        "result": "PASS" if r["passed"] else "FAIL",
        "why": r["error"] or "; ".join(r["problems"]),
    }


def write_markdown(results: list[dict], model: str) -> None:
    rows = [summary_row(r) for r in results]
    passed = sum(r["passed"] for r in results)
    lines = [f"# Plan generator test report ({datetime.now():%Y-%m-%d %H:%M}, {model})", "",
             f"**{passed}/{len(results)} profiles passed.**", "",
             "| Profile | Requested | Busy | Training days | Clash with busy day | Longest session / limit | Result |",
             "|---|---|---|---|---|---|---|"]
    for row in rows:
        result = row["result"] + (f" ({row['why']})" if row["why"] else "")
        lines.append(f"| {row['profile']} | {row['requested']} | {row['busy']} | {row['training']} "
                     f"| {row['clash']} | {row['minutes']} | {result} |")
    (OUTPUT_DIR / "test_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


CSS = """
:root { --bg:#f7f7fb; --card:#fff; --text:#1d1d27; --muted:#6b6b7b; --line:#e3e3ec;
  --train:#2e9e5b; --train-bg:#e3f5ea; --busy:#c0392b; --busy-bg:#fbe5e2; --rest-bg:#efeff4;
  --accent:#5046e5; }
@media (prefers-color-scheme: dark) { :root { --bg:#14141b; --card:#1e1e28; --text:#ececf3;
  --muted:#9a9aab; --line:#2f2f3d; --train:#5fd38f; --train-bg:#173826; --busy:#ff7b6b;
  --busy-bg:#41201c; --rest-bg:#262632; --accent:#8f88ff; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text);
  font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width:1000px; margin:0 auto; padding:24px 16px 48px; }
h1 { font-size:24px; margin:0 0 4px; } h2 { font-size:19px; margin:0 0 6px; }
.muted { color:var(--muted); }
.banner { margin:16px 0 24px; padding:14px 18px; border-radius:12px; font-weight:600; font-size:17px; }
.banner.ok { background:var(--train-bg); color:var(--train); }
.banner.bad { background:var(--busy-bg); color:var(--busy); }
.card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px;
  margin-bottom:20px; }
.scroll { overflow-x:auto; }
table { border-collapse:collapse; width:100%; font-size:14px; }
th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
th { color:var(--muted); font-weight:600; }
.pill { display:inline-block; padding:2px 10px; border-radius:99px; font-weight:700; font-size:13px; }
.pass { background:var(--train-bg); color:var(--train); }
.fail { background:var(--busy-bg); color:var(--busy); }
.week { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; margin:14px 0; }
.day { border-radius:10px; padding:8px 4px; text-align:center; font-size:13px; }
.day b { display:block; font-size:14px; }
.day.train { background:var(--train-bg); color:var(--train); }
.day.busy { background:var(--busy-bg); color:var(--busy); }
.day.rest { background:var(--rest-bg); color:var(--muted); }
.legend span { margin-right:14px; font-size:13px; }
details { border-top:1px solid var(--line); padding:10px 0; }
summary { cursor:pointer; font-weight:600; }
ul { margin:6px 0; padding-left:20px; }
.note { border-left:3px solid var(--accent); padding:6px 12px; margin:10px 0; color:var(--muted); }
@media (max-width:600px) { .day { font-size:11px; padding:6px 2px; } .day b { font-size:12px; } }
"""


def week_strip(profile: dict, plan: WorkoutPlan | None) -> str:
    training = {d.day: d for d in plan.weekly_schedule} if plan else {}
    busy = set(profile.get("busy_days", []))
    cells = []
    for day in WEEKDAYS:
        if day in training and day in busy:
            kind, label = "busy", "CLASH"
        elif day in training:
            kind, label = "train", f"Train · {training[day].estimated_minutes}m"
        elif day in busy:
            kind, label = "busy", "Busy"
        else:
            kind, label = "rest", "Rest"
        cells.append(f'<div class="day {kind}"><b>{day[:3]}</b>{label}</div>')
    return f'<div class="week">{"".join(cells)}</div>'


def session_html(day) -> str:
    rows = "".join(
        f"<tr><td><b>{escape(ex.name)}</b><br><span class='muted'>{escape(ex.form_tip)}</span></td>"
        f"<td>{ex.sets} x {escape(ex.reps_or_duration)}</td><td>{ex.rest_seconds}s</td></tr>"
        for ex in day.exercises)
    li = lambda items: "".join(f"<li>{escape(i)}</li>" for i in items)
    return (f"<details><summary>{day.day}: {escape(day.focus)} "
            f"<span class='muted'>(~{day.estimated_minutes} min)</span></summary>"
            f"<p><b>Warm-up</b></p><ul>{li(day.warmup)}</ul>"
            f"<div class='scroll'><table><tr><th>Exercise</th><th>Sets x reps</th><th>Rest</th></tr>"
            f"{rows}</table></div>"
            f"<p><b>Cool-down</b></p><ul>{li(day.cooldown)}</ul></details>")


def write_html(results: list[dict], model: str) -> None:
    passed = sum(r["passed"] for r in results)
    all_ok = passed == len(results)
    head = ("<tr><th>Profile</th><th>Requested</th><th>Busy</th><th>Training days</th>"
            "<th>Clash</th><th>Longest / limit</th><th>Result</th></tr>")
    body = ""
    for row in map(summary_row, results):
        pill = f"<span class='pill {row['result'].lower()}'>{row['result']}</span>"
        why = f"<br><span class='muted'>{escape(row['why'])}</span>" if row["why"] else ""
        body += (f"<tr><td>{escape(row['profile'])}</td><td>{row['requested']}</td><td>{row['busy']}</td>"
                 f"<td>{row['training']}</td><td>{escape(row['clash'])}</td><td>{row['minutes']}</td>"
                 f"<td>{pill}{why}</td></tr>")

    cards = ""
    for r in results:
        p, plan = r["profile"], r["plan"]
        facts = (f"{p['age']}, {p['experience_level']}, goal: {p['goal']} · "
                 f"equipment: {', '.join(p['equipment'])} · "
                 f"limitations: {', '.join(p['limitations']) or 'none'}")
        cards += f"<section class='card'><h2>{escape(r['name'])}</h2><div class='muted'>{escape(facts)}</div>"
        cards += week_strip(p, plan)
        if plan:
            cards += f"<p><b>{escape(plan.plan_name)}</b>: {escape(plan.summary)}</p>"
            if plan.schedule_note:
                cards += f"<div class='note'>{escape(plan.schedule_note)}</div>"
            cards += "".join(session_html(d) for d in plan.weekly_schedule)
            cards += f"<div class='note'>{escape(plan.safety_note)}</div>"
        else:
            cards += f"<p class='fail pill'>Error: {escape(r['error'])}</p>"
        cards += "</section>"

    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plan Generator Report</title><style>{CSS}</style></head><body><main>
<h1>Plan generator test report</h1>
<div class="muted">{datetime.now():%Y-%m-%d %H:%M} · model {escape(model)} ·
done when: 3 profiles give 3 readable weekly plans, no session on a busy day</div>
<div class="banner {'ok' if all_ok else 'bad'}">{passed}/{len(results)} profiles passed</div>
<section class="card"><div class="scroll"><table>{head}{body}</table></div>
<div class="legend" style="margin-top:12px"><span class="pill pass">Train</span>
<span class="pill fail">Busy</span><span class="muted">Rest</span></div></section>
{cards}</main></body></html>"""
    (OUTPUT_DIR / "test_report.html").write_text(html, encoding="utf-8")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    results, model = run_all()
    OUTPUT_DIR.mkdir(exist_ok=True)
    write_markdown(results, model)
    write_html(results, model)
    passed = sum(r["passed"] for r in results)
    print(f"\n{passed}/{len(results)} passed. Report: outputs/test_report.html (and .md)")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
