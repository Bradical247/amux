#!/usr/bin/env bash
# Builds a throwaway repo with a real bug for the hivemux demo tape.
# add() subtracts; test.sh asserts add(2,3)==5. Leaves you cd'd into the repo.
set -e
D=$(mktemp -d)
cd "$D"
git init -q -b main
printf 'def add(a, b):\n    return a - b\n' > calc.py
cat > test.sh <<'SH'
#!/usr/bin/env bash
python3 -c "from calc import add; assert add(2,3)==5; print('PASS')"
SH
chmod +x test.sh
git add -A && git commit -q -m 'buggy add()'
echo "$D" > /tmp/hm-demo-dir
