#!/usr/bin/env bash
# Shrimp line, take two: the reference is a horse short where the owner asks,
# amused, "Is this the shrimp one??" — so the read wants to be lighter and more
# sing-song than the current narrator-voiced takes. Four fresh takes across the
# brighter voices; pick the best by pitch/duration, then brighten slightly.
set -u
OUT=/home/z/my-project/scripts/tts_shrimp2
mkdir -p "$OUT"
gen() {
  for try in 1 2 3 4 5 6 7 8; do
    if z-ai tts -i "$3" -o "$OUT/$1.wav" --voice "$2" --format wav >/dev/null 2>&1; then
      echo "ok: $1 ($2)"; return
    fi
    sleep 30
  done
  echo "FAILED: $1"
}
gen shrimp_c chuichui "Ooh — is this… the shrimp one? Is THIS the shrimp one?!"
gen shrimp_d tongtong "Wait, wait. Is this the shrimp one?? Ha! It is the shrimp one!"
gen shrimp_e xiaochen "Hmm? Is this the shrimp one? It IS the shrimp one!"
gen shrimp_f tongtong "Is this… the shrimp one?? Is this the shrimp one?! Ha!"
echo done
