"""Validate actual R072 HTML and invert only its exact critical injection."""
import sys,json,re,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'vendor'))
from critical_resources import resolve
from critical_components import component_document_digest
import performance_contract as owner
root=Path(__file__).parent/'vendor'
p=json.loads((root/'profile.json').read_text());contract=json.loads((root/'performance_contract.json').read_text())
source=sys.stdin.read()
pattern=re.compile(r'<style id="lf-critical-css">([\s\S]*?)</style><script data-lf-critical-loader="r069" data-css-url="([^"]+)">([\s\S]*?)</script><noscript>([\s\S]*?)</noscript>')
matched=list(pattern.finditer(source));assert len(matched)==1,'Expected exactly one R072 injection'
m=matched[0];assert hashlib.sha256(m[1].encode()).hexdigest()==p['critical_sha256'];assert hashlib.sha256(m[3].encode()).hexdigest()==p['loader_sha256']
baseline=source[:m.start()]+m[4]+source[m.end():]
canonical,urls=resolve(baseline,p['resources']);digest=component_document_digest(canonical,lambda b:owner.fingerprint(owner.normalize_block(b,contract)))
assert digest==p['document_sha256'],('Page drift',digest)
assert m[2]==urls[p['css_url']]
print(json.dumps(dict(html=baseline,candidateHTML=source,cssURL=m[2],resources=[dict(url=urls[x['url']],sha1=x['sha1']) for x in p['resources']],digest=digest)))
