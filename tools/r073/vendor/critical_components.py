"""Component comparison policy for explicitly enrolled page profiles.

Component validity and page CSS coverage are separate gates. Callers provide an
owner's read-only normalizer rather than imposing a mandatory addon dependency.
Returned fingerprints are comparison data; original HTML is never rewritten.
"""
import hashlib
import json
import re
from lxml import html


def component_document_digest(source, normalize_rates):
    tree = html.document_fromstring(source)
    if tree.get('data-lf-shell') != 'true' or tree.get('lang') != 'en-US':
        raise ValueError('Unreviewed document shell/language')
    for node in tree.xpath('//input[@name="csrf_token"]'):
        node.set('value', 'LF_CSRF_TOKEN')
    for node in tree.xpath('//script[@id="web.layout.odooscript"]'):
        node.text = re.sub(r'(csrf_token\s*:\s*)"[^"\r\n]*"', r'\1"LF_CSRF_TOKEN"', node.text or '')

    # Normalize only the two GeoIP values in the actual assignment JSON; retain
    # all other session keys, script text, attributes and number of scripts.
    assignment = re.compile(r'odoo\.__session_info__\s*=\s*(?=\{)')
    assignments = 0
    for node in tree.xpath('//head/script[not(@src)]'):
        text = node.text or ''
        match = assignment.search(text)
        if not match:
            continue
        assignments += 1
        data, end = json.JSONDecoder().raw_decode(text[match.end():])
        if not isinstance(data, dict):
            raise ValueError('Invalid session JSON')
        for key in ('geoip_country_code', 'geoip_phone_code'):
            if key not in data:
                raise ValueError('Missing GeoIP key')
            data[key] = 'LF_GEOIP_VALUE'
        node.text = text[:match.end()] + json.dumps(data, sort_keys=True) + text[match.end()+end:]
    if assignments != 1:
        raise ValueError('Unexpected session assignment count')

    # JSON-LD is nonvisual data, not executable JS. Syntax is checked here;
    # semantic correctness belongs to the separate owner schema tests. Preserve
    # script count/location/attributes, and reject children or invalid JSON.
    for node in tree.xpath('//script[@type="application/ld+json"]'):
        if len(node):
            raise ValueError('Unexpected JSON-LD children')
        data = json.loads(node.text or '', parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
        if not isinstance(data, (dict, list)):
            raise ValueError('Unexpected JSON-LD root')
        node.text = 'LF_VALID_JSONLD'

    # Equivalent encoded spaces only; all digits and other URL bytes still
    # participate in the page fingerprint. No general URL decoding/stripping.
    for node in tree.xpath('//footer//a[starts-with(@href,"tel:")]'):
        node.set('href', node.get('href').replace('%20', ' '))

    blocks = tree.xpath('//section[@data-snippet="s_explore_freight_opportunities"]')
    if not blocks:
        raise ValueError('Missing reviewed rates component')
    for block in blocks:
        normalized_signature = normalize_rates(block)
        if not re.fullmatch(r'[a-f0-9]{64}', normalized_signature):
            raise ValueError('Invalid owner signature')
        marker = html.Element('section', attrib={'data-lf-reviewed-rates': normalized_signature})
        marker.tail = block.tail
        block.getparent().replace(block, marker)
    return hashlib.sha256(html.tostring(tree, encoding='unicode', method='html').encode()).hexdigest()
