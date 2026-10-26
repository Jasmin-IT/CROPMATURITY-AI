import csv, sys, time
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.analyzer import TomatoAnalyzer, InvalidImageError

ROOT, LBL = Path("test_cases"), Path("dataset_3class/labels/test")
OUT = Path("report_assets")
OUT.mkdir(exist_ok=True)

expected = {}
ef = ROOT / "expected.csv"
if ef.exists():
    with ef.open() as f:
        for r in csv.DictReader(f):
            expected[r["file"]] = int(r["true_count"])


def truth(cat, p):
    if cat == "nontomato":
        return 0
    if p.name in expected:
        return expected[p.name]
    f = LBL / (p.stem + ".txt")
    return len([l for l in f.read_text().splitlines() if l.strip()]) if f.exists() else None


an = TomatoAnalyzer()
rows = []
for cat in sorted(d for d in ROOT.iterdir() if d.is_dir()):
    files = [x for x in sorted(cat.iterdir()) if x.suffix.lower() in (".jpg", ".jpeg", ".png")]
    for i, p in enumerate(files, 1):
        t = truth(cat.name, p)
        try:
            s, _ = an.analyze(str(p))
            rows.append(dict(category=cat.name, file=p.name, true=t, pred=s["total"],
                             readiness=s["readiness"], rejected=s.get("rejected_non_tomato", 0),
                             ms=s["inference_ms"], warnings=" | ".join(s["warnings"]), error=""))
        except InvalidImageError as e:
            rows.append(dict(category=cat.name, file=p.name, true=t, pred=-1, readiness="", rejected="",
                             ms="", warnings="", error=str(e)))
        print(f"\r{cat.name}: {i}/{len(files)}   ", end="")
print()

with (OUT / "test_results.csv").open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader(); w.writerows(rows)

print(f"\n{'category':11s} {'n':>3s} {'true':>6s} {'pred':>6s} {'pred/true':>9s} {'avg err':>8s} {'within1':>8s} "
      f"{'zero found':>11s} {'warned':>7s} {'avg ms':>7s}")
for cat in sorted({r['category'] for r in rows}):
    rs = [r for r in rows if r["category"] == cat and r["pred"] >= 0]
    kn = [r for r in rs if r["true"] is not None]
    tr = sum(r["true"] for r in kn); pr = sum(r["pred"] for r in kn)
    err = [abs(r["pred"] - r["true"]) for r in kn]
    print(f"{cat:11s} {len(rs):3d} {tr:6d} {pr:6d} {(pr / tr if tr else float('nan')):9.2f} "
          f"{(np.mean(err) if err else float('nan')):8.2f} {(np.mean(np.array(err) <= 1) if err else float('nan')):8.0%} "
          f"{np.mean([r['pred'] == 0 for r in rs]):11.0%} {np.mean([bool(r['warnings']) for r in rs]):7.0%} "
          f"{np.mean([float(r['ms']) for r in rs]):7.0f}")
print("\nfull results saved to report_assets/test_results.csv")