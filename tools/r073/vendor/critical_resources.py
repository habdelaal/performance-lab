"""Narrow deployment metadata comparison; never rewrite the served document.

CSS/JS relocation is admitted only by the response adapter's attachment checksum
verification. Image query tokens here are limited to non-layout head metadata.
"""
import json
import re
from lxml import html


def resolve(source, resources, verify=None):
    tree = html.document_fromstring(source)
    mapping = {}
    for resource in resources:
        old = resource['url']
        match = re.fullmatch(r'/web/assets/1/[0-9a-f]{7}/([^/?#]+)', old)
        if not match:
            raise ValueError('Invalid reviewed resource URL')
        pattern = re.compile(r'/web/assets/1/[0-9a-f]{7}/' + re.escape(match[1]))
        nodes = tree.xpath(resource['xpath'])
        matches = [n for n in nodes if pattern.fullmatch(n.get(resource['attribute'], ''))]
        if len(matches) != 1:
            raise ValueError('Missing or duplicate reviewed resource: ' + match[1])
        current = matches[0].get(resource['attribute'])
        if verify is not None and not verify(current, resource['sha1']):
            raise ValueError('Resource content changed: ' + match[1])
        mapping[old] = current
        matches[0].set(resource['attribute'], old)

    assignment = re.compile(r'odoo\.__session_info__\s*=\s*(?=\{)')
    count = 0
    for node in tree.xpath('//head/script[not(@src)]'):
        text = node.text or ''
        match = assignment.search(text)
        if not match:
            continue
        count += 1
        data, end = json.JSONDecoder().raw_decode(text[match.end():])
        if not isinstance(data, dict) or not re.fullmatch(r'[0-9a-f]{64}', data.get('registry_hash', '')):
            raise ValueError('Invalid registry hash')
        data['registry_hash'] = '0' * 64
        node.text = text[:match.end()] + json.dumps(data, sort_keys=True) + text[match.end()+end:]
    if count != 1:
        raise ValueError('Unexpected session assignment count')

    specs = [
        ('//head/link[@rel="shortcut icon" or @rel="apple-touch-icon"]', 'href',
         r'/web/image/website/1/favicon'),
        ('//head/meta[@property="og:image"]', 'content',
         r'https://livefreight-staging\.odoo\.com/web/image/website/1/logo'),
        ('//head/meta[@name="twitter:image"]', 'content',
         r'https://livefreight-staging\.odoo\.com/web/image/website/1/logo/300x300'),
    ]
    for xpath, attribute, path in specs:
        for node in tree.xpath(xpath):
            value = node.get(attribute, '')
            if re.fullmatch(path + r'\?unique=[0-9a-f]{7}', value):
                node.set(attribute, value.rsplit('=', 1)[0] + '=0000000')
    return html.tostring(tree, encoding='unicode', method='html'), mapping
