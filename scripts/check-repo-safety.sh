#!/usr/bin/env bash
# Fails if anything sensitive is tracked or staged. Run before every push: npm run check:safety
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0
files=$( (git ls-files; git diff --cached --name-only) | sort -u)
bad=$(echo "$files" | grep -E -i '(^|/)\.env($|\.)|\.zip$|\.pdf$|\.pem$|\.key$|(^|/)\.private-assets/|(^|/)\.data/|(^|/)\.next/' | grep -v '^\.env\.example$' || true)
if [ -n "$bad" ]; then echo "✗ Sensitive files tracked/staged:"; echo "$bad"; fail=1; fi
# Content patterns (live keys, real connection strings with credentials, private keys, PATs)
pat='rzp_live_[A-Za-z0-9]{8,}|rzp_test_[A-Za-z0-9]{10,}|mongodb(\+srv)?://[^:/\s"'"'"'<]+:[^@\s"'"'"'<]+@|-----BEGIN [A-Z ]*PRIVATE KEY-----|nfp_[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{20,}|gh[pous]_[A-Za-z0-9]{30,}'
hits=$(git grep -n -I -E "$pat" -- . ':!scripts/check-repo-safety.sh' || true)
if [ -n "$hits" ]; then echo "✗ Possible secrets in tracked files:"; echo "$hits"; fail=1; fi
large=$(git ls-files -z | xargs -0 -I{} sh -c 'test -f "{}" && s=$(wc -c < "{}") && [ "$s" -gt 2000000 ] && echo "{} ($s bytes)"' || true)
if [ -n "$large" ]; then echo "✗ Unexpectedly large tracked files:"; echo "$large"; fail=1; fi
[ $fail -eq 0 ] && echo "✓ Repo safety check passed (no env files, product files, local data or secrets tracked)"
exit $fail
