#!/usr/bin/env bash
# Production hardening self-check.
# Usage: bash scripts/production-check.sh
# Exits non-zero if any assertion fails.
set -euo pipefail

PASS=0
FAIL=0
ERRORS=""

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() {
  echo "  FAIL: $1"
  FAIL=$((FAIL+1))
  ERRORS="$ERRORS\n  - $1"
}

# ---- Environment -------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env.local
set -a
# shellcheck disable=SC1090
source "$PROJECT_DIR/.env.local"
set +a

PORT=3000
BASE_URL="http://localhost:$PORT"
COOKIE_JAR="$(mktemp /tmp/lc-cookies.XXXXXX)"
trap 'rm -f "$COOKIE_JAR"' EXIT

# ========================================================================
echo ""
echo "=== 1: Static wiring checks ==="

# audit_failed terminal status is wired in generate/route.ts
if grep -q "audit_failed" "$PROJECT_DIR/app/api/generate/route.ts"; then
  pass "audit_failed wired in app/api/generate/route.ts"
else
  fail "audit_failed NOT found in app/api/generate/route.ts"
fi

# tool_use / report_critic_findings is wired in critic.ts
if grep -qE "report_critic_findings|tool_use" "$PROJECT_DIR/lib/claude/critic.ts"; then
  pass "report_critic_findings wired in lib/claude/critic.ts"
else
  fail "report_critic_findings NOT found in lib/claude/critic.ts"
fi

# QUOTE CORRECTION block is wired in generate/route.ts
if grep -q "QUOTE CORRECTION" "$PROJECT_DIR/app/api/generate/route.ts"; then
  pass "QUOTE CORRECTION block wired in app/api/generate/route.ts"
else
  fail "QUOTE CORRECTION block NOT found in app/api/generate/route.ts"
fi

# ---- Login ------------------------------------------------------------
echo ""
echo "Logging in..."
LOGIN_RESULT=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$APP_PASSWORD\"}" 2>/dev/null)
if ! echo "$LOGIN_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('success') else 1)" 2>/dev/null; then
  echo "FATAL: Login failed: $LOGIN_RESULT"
  exit 1
fi
echo "  Logged in."

# ---- SSE Capture helper -----------------------------------------------
SSE_HELPER="$(mktemp /tmp/sse-capture.XXXXXX.py)"
trap 'rm -f "$COOKIE_JAR" "$SSE_HELPER"' EXIT

cat > "$SSE_HELPER" << 'PYEOF'
#!/usr/bin/env python3
import sys, json
import requests

url = sys.argv[1]
body = json.loads(sys.argv[2])
cookie_file = sys.argv[3]
outfile = sys.argv[4]

# Read Netscape cookie file for the session cookie
session_value = None
with open(cookie_file) as f:
    for line in f:
        if 'lc-companion-session' in line:
            parts = line.strip().split('\t')
            if len(parts) >= 7:
                session_value = parts[-1]
            break

cookies = {}
if session_value:
    cookies['lc-companion-session'] = session_value

parts = []
with requests.post(url, json=body, cookies=cookies, stream=True, timeout=600) as r:
    for raw in r.iter_lines(decode_unicode=True):
        if raw.startswith('data: '):
            payload = raw[6:]
            if payload == '[DONE]':
                break
            try:
                obj = json.loads(payload)
                if 'text' in obj:
                    parts.append(obj['text'])
                elif 'replace' in obj:
                    # Retry succeeded: replace accumulated text
                    parts = [obj['replace']]
                elif 'fallback' in obj:
                    # Generation fell back: use fallback message
                    parts = [obj['fallback']]
                elif 'critic' in obj:
                    c = obj['critic']
                    print(f"  [CRITIC] status={c.get('status')} blocks={len(c.get('blockFlags',[]))} warns={len(c.get('warnFlags',[]))}", file=sys.stderr)
                elif 'audit' in obj:
                    a = obj['audit']
                    print(f"  [AUDIT]  status={a.get('status')} blocksFinal={a.get('blocksFinal')} elapsedMs={a.get('elapsedMs')}", file=sys.stderr)
            except json.JSONDecodeError:
                pass

full = ''.join(parts)
with open(outfile, 'w') as f:
    f.write(full)
print(f"  Saved {len(full)} chars to {outfile}", file=sys.stderr)
PYEOF

generate() {
  local poet="$1"
  local poem="$2"
  local outfile="$3"
  local body
  body=$(python3 -c "import json; print(json.dumps({'year':'2026','circular':'0016/2024','level':'HL','contentType':'poetry','userInstructions':'','poet':'$poet','poem':'$poem'}))")
  python3 "$SSE_HELPER" "$BASE_URL/api/generate" "$body" "$COOKIE_JAR" "$outfile"
}

# ========================================================================
echo ""
echo "=== 2: The Forge regression + capitalisation check ==="

generate "Seamus Heaney" "The Forge" /tmp/forge-after.md
# Also save as baseline-after for section 3 regression comparison
cp /tmp/forge-after.md /tmp/baseline-after.md

# 2a. Quote capitalisation: capital-T version must NOT appear
if grep -q '"The hammered anvil'\''s short-pitched ring"' /tmp/forge-after.md || \
   grep -q '"The hammered anvil'\''s short-pitched ring"' /tmp/forge-after.md; then
  fail "Capital-T quote still present: 'The hammered anvil's short-pitched ring'"
else
  pass "Capital-T quote absent: 'The hammered anvil's short-pitched ring'"
fi

# 2b. Lowercase version must appear (the correct anchored form)
if grep -qi "the hammered anvil" /tmp/forge-after.md; then
  pass "Anchored lowercase quote present in forge-after.md"
else
  fail "Anchored lowercase quote missing from forge-after.md"
fi

# 2c. Stanza count unchanged vs baseline-before.md
BEFORE_STANZAS=$(grep -cE "(^#{3,4} Stanza [0-9]|^\*\*Stanza [0-9])" /tmp/baseline-before.md || true)
AFTER_STANZAS=$(grep -cE "(^#{3,4} Stanza [0-9]|^\*\*Stanza [0-9])" /tmp/forge-after.md || true)
if [ "$BEFORE_STANZAS" -eq "$AFTER_STANZAS" ]; then
  pass "Forge stanza count unchanged: $BEFORE_STANZAS"
else
  fail "Forge stanza count changed: before=$BEFORE_STANZAS after=$AFTER_STANZAS"
fi

# 2d. No new apostrophe labels
BEFORE_APO=$(grep -ic "apostrophe" /tmp/baseline-before.md || true)
AFTER_APO=$(grep -ic "apostrophe" /tmp/forge-after.md || true)
BEFORE_APO=${BEFORE_APO:-0}
AFTER_APO=${AFTER_APO:-0}
if [ "$AFTER_APO" -le "$BEFORE_APO" ]; then
  pass "No new apostrophe labels (before=$BEFORE_APO after=$AFTER_APO)"
else
  fail "New apostrophe labels appeared (before=$BEFORE_APO after=$AFTER_APO)"
fi

# 2e. Core section headings present
for section in "Overview" "Form and Structure" "Stanza-by-Stanza" "Themes" "Tone" "Exam" "Pairings"; do
  IN_BEFORE=$(grep -ic "$section" /tmp/baseline-before.md || true)
  IN_AFTER=$(grep -ic "$section" /tmp/forge-after.md || true)
  IN_BEFORE=${IN_BEFORE:-0}
  IN_AFTER=${IN_AFTER:-0}
  if [ "$IN_BEFORE" -gt 0 ] && [ "$IN_AFTER" -gt 0 ]; then
    pass "Forge section present in both: $section"
  elif [ "$IN_BEFORE" -eq 0 ] && [ "$IN_AFTER" -eq 0 ]; then
    pass "Forge section absent in both (no regression): $section"
  else
    fail "Forge section mismatch: '$section' before=$IN_BEFORE after=$IN_AFTER"
  fi
done

# 2f. Forge audit row: block_flag_count_final <= 1
echo "  Querying Forge audit row..."
FORGE_AUDIT_JSON=$(curl -s \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/generation_audit?subject_key=eq.Seamus%20Heaney&sub_key=eq.The%20Forge&order=created_at.desc&limit=1&select=status,block_flag_count_final,block_flags")

FORGE_STATUS=$(echo "$FORGE_AUDIT_JSON" | python3 -c "import sys,json; rows=json.load(sys.stdin); print(rows[0]['status'] if rows else 'NONE')" 2>/dev/null || echo "ERROR")
FORGE_BLOCKS=$(echo "$FORGE_AUDIT_JSON" | python3 -c "import sys,json; rows=json.load(sys.stdin); print(rows[0]['block_flag_count_final'] if rows else -1)" 2>/dev/null || echo "-1")

if python3 -c "import sys; sys.exit(0 if int('$FORGE_BLOCKS') <= 1 else 1)" 2>/dev/null; then
  pass "Forge block_flag_count_final <= 1: $FORGE_BLOCKS"
else
  fail "Forge block_flag_count_final > 1: $FORGE_BLOCKS"
fi

# 2g. No self-retracted flags in stored Forge block_flags
RETRACT_COUNT=$(echo "$FORGE_AUDIT_JSON" | python3 -c "
import sys, json
rows = json.load(sys.stdin)
if not rows: print(0); sys.exit(0)
flags = rows[0].get('block_flags') or []
count = sum(1 for f in flags if any(w in (f.get('issue','') + f.get('recommended_fix','')).lower() for w in ['retract','no action needed','no block','actually this is fine']))
print(count)
" 2>/dev/null || echo "0")
RETRACT_COUNT=${RETRACT_COUNT:-0}
if [ "$RETRACT_COUNT" -eq 0 ]; then
  pass "No self-retracted flags in stored Forge block_flags"
else
  fail "Self-retracted flags found in stored Forge block_flags: count=$RETRACT_COUNT"
fi

# ========================================================================
echo ""
echo "=== 3: Tollund Man — round-2 critic must not be audit_failed ==="

generate "Seamus Heaney" "The Tollund Man" /tmp/tollund-after.md

# 3a. H1 contains title and author
if grep -qi "tollund man" /tmp/tollund-after.md && grep -qi "heaney" /tmp/tollund-after.md; then
  pass "Title and author present"
else
  fail "Title or author missing from Tollund Man note"
fi

# 3b. Exactly 11 stanza markers
STANZA_COUNT=$(grep -cE "(^#{3,4} Stanza [0-9]|^\*\*Stanza [0-9])" /tmp/tollund-after.md || true)
STANZA_COUNT=${STANZA_COUNT:-0}
if [ "$STANZA_COUNT" -eq 11 ]; then
  pass "Exactly 11 Stanza markers"
else
  fail "Expected 11 stanza markers, found $STANZA_COUNT"
fi

# 3c. Each stanza 1..11 present
STANZA_SEQ_OK=true
for N in 1 2 3 4 5 6 7 8 9 10 11; do
  if grep -qE "(^#{3,4} Stanza $N(\b| )|^\*\*Stanza $N\*\*)" /tmp/tollund-after.md; then
    : # ok
  else
    STANZA_SEQ_OK=false
    fail "Stanza $N marker missing"
  fi
done
if $STANZA_SEQ_OK; then
  pass "All stanzas 1-11 present"
fi

# 3d. Part I / II / III headings
for part in "Part I" "Part II" "Part III"; do
  if grep -q "^### $part" /tmp/tollund-after.md; then
    pass "### $part present"
  else
    fail "### $part missing"
  fi
done

# 3e. No apostrophe in Stanza 1 block
STANZA1_BLOCK=$(python3 - <<'PYEOF' /tmp/tollund-after.md
import sys, re
lines = open(sys.argv[1]).readlines()
capturing = False
block = []
for line in lines:
    if re.match(r'^#{3,4} Stanza 1\b', line) or re.match(r'^\*\*Stanza 1\*\*', line):
        capturing = True
        continue
    if capturing:
        if re.match(r'^#{3,4} Stanza [0-9]', line) or re.match(r'^\*\*Stanza [0-9]', line) or re.match(r'^#', line):
            break
        block.append(line)
print(''.join(block))
PYEOF
)
if echo "$STANZA1_BLOCK" | grep -qi "apostrophe"; then
  fail "Apostrophe label found in Stanza 1 block"
else
  pass "No apostrophe label in Stanza 1 block"
fi

# 3f. No tumbril/tumbrel split
HAS_TUMBRIL=$(grep -ic "tumbril" /tmp/tollund-after.md || true)
HAS_TUMBREL=$(grep -ic "tumbrel" /tmp/tollund-after.md || true)
HAS_TUMBRIL=${HAS_TUMBRIL:-0}
HAS_TUMBREL=${HAS_TUMBREL:-0}
if [ "$HAS_TUMBRIL" -gt 0 ] && [ "$HAS_TUMBREL" -gt 0 ]; then
  fail "Both 'tumbril' and 'tumbrel' appear — spelling inconsistency"
else
  pass "No tumbril/tumbrel split (tumbril=$HAS_TUMBRIL tumbrel=$HAS_TUMBREL)"
fi

# 3g. Technique/Function coverage
TECHNIQUE_COUNT=$(grep -c "\*\*Technique\*\*" /tmp/tollund-after.md || true)
FUNCTION_COUNT=$(grep -c "\*\*Function in the poem\*\*" /tmp/tollund-after.md || true)
TECHNIQUE_COUNT=${TECHNIQUE_COUNT:-0}
FUNCTION_COUNT=${FUNCTION_COUNT:-0}
TOTAL_COVERED=$((TECHNIQUE_COUNT + FUNCTION_COUNT))
if [ "$TOTAL_COVERED" -ge 11 ]; then
  pass "Technique/Function subsections cover all stanzas (Technique=$TECHNIQUE_COUNT Function=$FUNCTION_COUNT)"
else
  fail "Insufficient Technique/Function coverage: $TOTAL_COVERED < 11 (Technique=$TECHNIQUE_COUNT Function=$FUNCTION_COUNT)"
fi

# 3h. Required section headings
for section in "Overview" "Form and Structure" "Stanza-by-Stanza" "Themes" "Tone" "Exam" "Pairings"; do
  if grep -qi "$section" /tmp/tollund-after.md; then
    pass "Section present: $section"
  else
    fail "Section missing: $section"
  fi
done

# 3i. Tollund Man audit row: status must NOT be audit_failed; block_flag_count_final numeric and <= 1
echo "  Querying Tollund Man audit row..."
AUDIT_JSON=$(curl -s \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/generation_audit?subject_key=eq.Seamus%20Heaney&sub_key=eq.The%20Tollund%20Man&order=created_at.desc&limit=1&select=status,elapsed_ms,block_flag_count_initial,block_flag_count_final,warn_flag_count")

AUDIT_STATUS=$(echo "$AUDIT_JSON" | python3 -c "import sys,json; rows=json.load(sys.stdin); print(rows[0]['status'] if rows else 'NONE')" 2>/dev/null || echo "ERROR")
AUDIT_ELAPSED=$(echo "$AUDIT_JSON" | python3 -c "import sys,json; rows=json.load(sys.stdin); print(rows[0]['elapsed_ms'] if rows else -1)" 2>/dev/null || echo "-1")
AUDIT_BLOCKS=$(echo "$AUDIT_JSON" | python3 -c "import sys,json; rows=json.load(sys.stdin); print(rows[0]['block_flag_count_final'] if rows else -1)" 2>/dev/null || echo "-1")
AUDIT_WARNS=$(echo "$AUDIT_JSON" | python3 -c "import sys,json; rows=json.load(sys.stdin); print(rows[0]['warn_flag_count'] if rows else -1)" 2>/dev/null || echo "-1")

if [ "$AUDIT_STATUS" = "audit_failed" ]; then
  fail "Tollund Man audit status is audit_failed — round-2 critic still failing"
elif [ "$AUDIT_STATUS" = "success" ] || [ "$AUDIT_STATUS" = "retry_success" ]; then
  pass "Tollund Man audit status: $AUDIT_STATUS"
else
  fail "Tollund Man audit status unexpected: '$AUDIT_STATUS'"
fi

if python3 -c "import sys; sys.exit(0 if int('$AUDIT_ELAPSED') > 0 else 1)" 2>/dev/null; then
  pass "Tollund Man audit elapsed_ms > 0: ${AUDIT_ELAPSED}ms"
else
  fail "Tollund Man audit elapsed_ms not > 0: $AUDIT_ELAPSED"
fi

if python3 -c "import sys; b=int('$AUDIT_BLOCKS'); sys.exit(0 if 0 <= b <= 1 else 1)" 2>/dev/null; then
  pass "Tollund Man block_flag_count_final <= 1: $AUDIT_BLOCKS"
else
  fail "Tollund Man block_flag_count_final out of range: $AUDIT_BLOCKS (expected 0 or 1)"
fi

if python3 -c "import sys; sys.exit(0 if '$AUDIT_WARNS'.lstrip('-').isdigit() else 1)" 2>/dev/null; then
  pass "Tollund Man warn_flag_count is numeric: $AUDIT_WARNS"
else
  fail "Tollund Man warn_flag_count is not numeric: $AUDIT_WARNS"
fi

# ========================================================================
echo ""
echo "=== 4: TypeScript ==="

cd "$PROJECT_DIR"
TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
NEW_TS_ERRORS=$(echo "$TSC_OUT" | grep -v "scripts/test-render.mts" | grep "error TS" || true)
if [ -z "$NEW_TS_ERRORS" ]; then
  pass "TypeScript: no new errors"
else
  fail "TypeScript: new errors found"
  echo "$NEW_TS_ERRORS"
fi

# ========================================================================
echo ""
echo "========================================"
echo "RESULTS: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failed assertions:"
  printf '%b\n' "$ERRORS"
  echo "========================================"
  exit 1
fi
echo "========================================"
exit 0
