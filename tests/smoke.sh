#!/usr/bin/env bash
# Workanetics smoke test — infrastructure & content checks via curl.
# Usage:
#   ./tests/smoke.sh                                  # tests https://workanetics.pages.dev
#   ./tests/smoke.sh https://workanetics.com          # tests production
#   ./tests/smoke.sh https://staging.workanetics.pages.dev
set -u
BASE="${1:-https://workanetics.pages.dev}"
BASE="${BASE%/}"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); printf "  \033[32mPASS\033[0m %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  \033[31mFAIL\033[0m %s\n" "$1"; }

check_status() { # url expected label
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$1")
  [ "$code" = "$2" ] && ok "$3 → $code" || bad "$3 → got $code, expected $2"
}

check_contains() { # haystack-file needle label
  grep -qF "$2" "$1" && ok "$3" || bad "$3"
}

echo "Smoke testing: $BASE"
echo

echo "— Availability —"
HTML=$(mktemp)
CODE=$(curl -s -o "$HTML" -w "%{http_code}" "$BASE/")
[ "$CODE" = "200" ] && ok "homepage → 200" || bad "homepage → $CODE"

CT=$(curl -s -o /dev/null -w "%{content_type}" "$BASE/")
case "$CT" in text/html*) ok "content-type is text/html";; *) bad "content-type: $CT";; esac

echo
echo "— Page content —"
check_contains "$HTML" "<title>Workanetics" "title tag present"
check_contains "$HTML" "Reconciliation report" "reconciliation ledger present"
check_contains "$HTML" 'id="intake-form"' "intake form present"
for f in name email company current target timeline pain; do
  check_contains "$HTML" "id=\"$f\"" "form field: $f"
done
check_contains "$HTML" "No patient data in this form" "PHI disclaimer present"
if grep -qF 'hello@workanetics.com' "$HTML"; then
  ok "contact email set to hello@workanetics.com (confirm Email Routing is live)"
fi

echo
echo "— Social / meta —"
check_contains "$HTML" 'property="og:image"' "og:image tag"
check_contains "$HTML" 'name="twitter:card"' "twitter card tag"
check_contains "$HTML" 'rel="icon"' "favicon link"

echo
echo "— Assets —"
for a in assets/favicon.ico assets/favicon.svg assets/apple-touch-icon.png assets/og-image.png; do
  check_status "$BASE/$a" 200 "$a"
done

# OG image must be reachable at the absolute URL scrapers will use
OGURL=$(grep -o 'property="og:image" content="[^"]*"' "$HTML" | sed 's/.*content="//;s/"$//')
if [ -n "${OGURL:-}" ]; then
  OGCODE=$(curl -s -o /dev/null -w "%{http_code}" "$OGURL")
  if [ "$OGCODE" = "200" ]; then ok "og:image absolute URL reachable ($OGURL)"
  else bad "og:image absolute URL → $OGCODE ($OGURL) — fine on staging, must pass on production"
  fi
fi

echo
echo "— Production extras (skipped unless testing workanetics.com) —"
if [ "$BASE" = "https://workanetics.com" ]; then
  check_status "https://www.workanetics.com/" 200 "www resolves"
  HDRS=$(curl -s -D - -o /dev/null "$BASE/")
  echo "$HDRS" | grep -qi "x-robots-tag: noindex" && bad "production is noindexed!" || ok "production is indexable"
else
  echo "  (pass https://workanetics.com as the argument to run these)"
fi

rm -f "$HTML"
echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
