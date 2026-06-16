# hivemux demo — a VHS tape (https://github.com/charmbracelet/vhs).
# Render:  vhs demo/hivemux.tape   (needs vhs + ttyd + ffmpeg, plus a working
#          `claude` login — this records a REAL agent fixing a real bug).
# Output is written to assets/demo.gif, which the README embeds.

Output assets/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 760
Set Padding 24
Set Theme "GitHub Dark"
Set TypingSpeed 45ms

# A throwaway repo with a real bug: add() subtracts; test.sh expects add(2,3)=5.
Hide
Type "hivemux kill fixadd --rm-worktree 2>/dev/null; source demo/setup-repo.sh && cd $(cat /tmp/hm-demo-dir) && clear"
Enter
Show

# Spin up an isolated agent (its own git worktree + tmux session).
Type "hivemux new fixadd --repo $(pwd)"
Enter
Sleep 2s

# Launch a verify->fix loop in the background. --watch mirrors the agent's live
# reasoning to ~/.hivemux/loops/<name>.live.
Type "hivemux loop fixadd --goal 'fix the bug in calc.py so test.sh passes' --check 'bash test.sh' --watch >/tmp/hm-loop.log 2>&1 &"
Enter
Sleep 3s

# Tail the agent's live thinking; quit the instant the turn reports done.
Type "clear; stdbuf -oL tail -F -n +1 ~/.hivemux/loops/fixadd.live | awk '{print} /turn done/{exit}'"
Enter
Sleep 55s

# The loop's own verifier ran the check: show the verdict and the one-line fix.
Type "clear; cat /tmp/hm-loop.log"
Enter
Sleep 2s
Type "git --no-pager -C ~/.hivemux/worktrees/$(basename $(pwd))/fixadd diff"
Enter
Sleep 3s

# Cleanup (hidden).
Hide
Type "hivemux kill fixadd --rm-worktree; rm -rf $(pwd) /tmp/hm-loop.log /tmp/hm-demo-dir"
Enter
Show
Sleep 500ms
