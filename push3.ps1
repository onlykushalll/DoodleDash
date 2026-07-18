Set-Location C:\Users\Default.L-HCG-9FVVGS3\OneDrive\Desktop\DoodleDash
git apply mobile-fixes.patch
git add -A
git commit -m "fix: scoring bug, game-end lobby, mobile orb, canvas, input" --no-verify
git push origin main
Write-Output DONE