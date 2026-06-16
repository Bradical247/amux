# hivemux demo — a VHS tape (https://github.com/charmbracelet/vhs).
# Render:  vhs demo/hivemux.tape   (needs vhs + ttyd + ffmpeg installed)
# Output is written to assets/demo.gif, which the README embeds.

Output assets/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 720
Set Padding 24
Set Theme "GitHub Dark"
Set TypingSpeed 60ms

# A throwaway repo so the demo is self-contained.
Hide
Type "cd $(mktemp -d) && git init -q -b main && git commit -q --allow-empty -m init && clear"
Enter
Show

Type "hivemux new fix-auth --agent shell"
Enter
Sleep 1200ms

Type "hivemux new add-tests --agent shell"
Enter
Sleep 1200ms

Type "hivemux ls"
Enter
Sleep 2s

Type "hivemux broadcast --message 'echo running tests'"
Enter
Sleep 1500ms

Type "hivemux conflicts"
Enter
Sleep 2500ms

# Cleanup (hidden).
Hide
Type "hivemux kill fix-auth --rm-worktree && hivemux kill add-tests --rm-worktree"
Enter
Show
Sleep 500ms
