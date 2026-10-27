import base64,gzip,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'vendor'))
from critical_policy import render_candidate
root=Path(__file__).parent/'vendor'
source=sys.stdin.read()
result=render_candidate(source,json.loads((root/'profile.json').read_text()),gzip.decompress(base64.b64decode((root/'critical.css.gz.b64').read_bytes())).decode(),(root/'critical_loader.js').read_text())
assert result!=source, 'Native source fingerprint mismatch; retain full CSS and review'
sys.stdout.write(result)
