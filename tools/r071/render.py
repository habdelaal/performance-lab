"""Use the exact R070 candidate comparison, CSS and loader; no live writes."""
import base64,gzip,hashlib,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'vendor'))
from critical_policy import render_candidate
from critical_components import component_document_digest
import performance_contract as owner
root=Path(__file__).parent/'vendor'
profile=json.loads((root/'profile.json').read_text())
contract=json.loads((root/'performance_contract.json').read_text())
assert hashlib.sha256(json.dumps(contract,sort_keys=True).encode()).hexdigest()==profile['rates_contract_sha256']
source=sys.stdin.read()
result=render_candidate(source,profile,
    gzip.decompress(base64.b64decode((root/'critical.css.gz.b64').read_bytes())).decode(),
    (root/'critical_loader.js').read_text(),
    document_digest_fn=lambda body:component_document_digest(body,
        lambda block:owner.fingerprint(owner.normalize_block(block,contract))))
assert result!=source, 'Candidate declined current document; review drift before activation'
sys.stdout.write(result)
