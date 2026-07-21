#!/usr/bin/env python3
"""
backend/test_backend.py — Quick smoke test for all API endpoints
Run with:  .venv/bin/python test_backend.py
Requires the server to be running on localhost:8000
"""

import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0


def _req(method: str, path: str, body: dict | None = None):
    url  = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"__http_error": e.code, "__msg": e.read().decode()}
    except Exception as e:
        return {"__error": str(e)}


def check(name: str, result: dict, key: str, expected=None):
    global PASS, FAIL
    if "__error" in result or "__http_error" in result:
        print(f"  ❌ FAIL  {name}: {result}")
        FAIL += 1
        return
    val = result.get(key)
    if expected is not None and val != expected:
        print(f"  ❌ FAIL  {name}: expected {key}={expected!r}, got {val!r}")
        FAIL += 1
    else:
        print(f"  ✅ PASS  {name}: {key}={val!r}")
        PASS += 1


print("\n" + "="*55)
print("  MindfulMomentum Backend — Smoke Test")
print("="*55)

# ── 1. Health check ───────────────────────────────────────
print("\n[1] GET /api/health")
r = _req("GET", "/api/health")
check("status", r, "status", "ok")
check("version", r, "version", "2.0.0")
check("gpu present", r.get("gpu", {}), "available")

# ── 2. Journal analysis ───────────────────────────────────
print("\n[2] POST /api/analyze-journal (normal text)")
r = _req("POST", "/api/analyze-journal",
         {"text": "Today was a great day! I went for a run and felt amazing.\n"
                  "Work was stressful but I managed to finish the deadline."})
check("status",      r, "status", "success")
check("mood_score",  r, "calculated_mood_score")   # any non-None
check("emotions",    r, "emotions")
check("sem_themes",  r, "semantic_themes")
check("confidence",  r, "confidence")
check("breakdown",   r, "paragraph_breakdown")

# ── 3. Empty text → validation error ─────────────────────
print("\n[3] POST /api/analyze-journal (empty → 422)")
r = _req("POST", "/api/analyze-journal", {"text": "   "})
code = r.get("__http_error")
print(f"  {'✅ PASS' if code == 422 else '❌ FAIL'}  validation: got HTTP {code}")
if code == 422: PASS += 1
else:            FAIL += 1

# ── 4. ML insight ─────────────────────────────────────────
print("\n[4] GET /api/get-insight/p01")
r = _req("GET", "/api/get-insight/p01")
check("status",    r, "status", "success")
data = r.get("data", {})
check("algo",      data, "algorithm")
check("f1",        data, "macro_f1")
check("features",  data, "feature_importances")
check("insight",   data, "insight_message")

# ── 5. Model info ─────────────────────────────────────────
print("\n[5] GET /api/model-info/p01")
r = _req("GET", "/api/model-info/p01")
check("status",      r, "status", "success")
info = r.get("data", {})
check("algo",        info, "algorithm")
check("trained_at",  info, "trained_at")
check("last_human",  info, "last_trained_human")

# ── 6. Invalid user_id → 400 ──────────────────────────────
print("\n[6] GET /api/get-insight/p99 (invalid → 400)")
r = _req("GET", "/api/get-insight/p99")
code = r.get("__http_error")
print(f"  {'✅ PASS' if code == 400 else '❌ FAIL'}  invalid user_id: got HTTP {code}")
if code == 400: PASS += 1
else:            FAIL += 1

# ── Summary ───────────────────────────────────────────────
print(f"\n{'='*55}")
print(f"  Results: {PASS} passed, {FAIL} failed")
print(f"{'='*55}\n")
sys.exit(0 if FAIL == 0 else 1)
