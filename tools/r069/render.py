import base64,gzip,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'vendor'))
from critical_policy import render_candidate
from lxml import html
import re
root=Path(__file__).parent/'vendor'
source=sys.stdin.read()
result=render_candidate(source,json.loads((root/'profile.json').read_text()),gzip.decompress(base64.b64decode((root/'critical.css.gz.b64').read_bytes())).decode(),(root/'critical_loader.js').read_text())
if result==source:
 tree=html.document_fromstring(source)
 for node in tree.xpath('//input[@name="csrf_token"]'):node.set('value','LF_CSRF_TOKEN')
 for node in tree.xpath('//script[@id="web.layout.odooscript"]'):node.text=re.sub(r'(csrf_token\s*:\s*)"[^"\r\n]*"',r'\1"LF_CSRF_TOKEN"',node.text or '')
 out=Path(__file__).parent/'reports';out.mkdir(exist_ok=True)
 (out/'rejected-document.html').write_text(html.tostring(tree,encoding='unicode',method='html'))
assert result!=source, 'Native source fingerprint mismatch; retain full CSS and review'
sys.stdout.write(result)
