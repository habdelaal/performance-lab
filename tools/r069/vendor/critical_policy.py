"""Exact-document admission for the R069 Staging critical CSS trial.

The only normalized value is the native CSRF token, which has no style effect.
No rendered page content is modified while computing the fingerprint.
"""
import hashlib
import re
from html.parser import HTMLParser
from lxml import html

DATABASE = 'livefreight-staging-40312490'
HOST = 'livefreight-staging.odoo.com'
PATH = '/cargo-insurance-egypt'


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def document_digest(source):
    tree = html.document_fromstring(source)
    if tree.get('data-lf-shell') != 'true' or tree.get('lang') != 'en-US':
        raise ValueError('Unreviewed document shell/language')
    for node in tree.xpath('//input[@name="csrf_token"]'):
        node.set('value', 'LF_CSRF_TOKEN')
    for node in tree.xpath('//script[@id="web.layout.odooscript"]'):
        node.text = re.sub(r'(csrf_token\s*:\s*)"[^"\r\n]*"', r'\1"LF_CSRF_TOKEN"', node.text or '')
    return digest(html.tostring(tree, encoding='unicode', method='html'))


class LinkPosition(HTMLParser):
    def __init__(self, source, href):
        super().__init__(convert_charrefs=False)
        self.source, self.href, self.positions = source, href, []
        self.lines = source.splitlines(keepends=True)
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'stylesheet' and attrs.get('href') == self.href:
            line, col = self.getpos()
            start = sum(map(len, self.lines[:line - 1])) + col
            self.positions.append((start, start + len(self.get_starttag_text())))

    handle_startendtag = handle_starttag


def render_candidate(source, profile, critical_css, loader):
    """Return exact original bytes/text on any admission mismatch."""
    try:
        if document_digest(source) != profile['document_sha256']:
            return source
        if digest(critical_css) != profile['critical_sha256'] or '</style' in critical_css.lower():
            return source
        if digest(loader) != profile['loader_sha256'] or '</script' in loader.lower():
            return source
        tree = html.document_fromstring(source)
        if tree.xpath('//meta[translate(@http-equiv,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="content-security-policy"]'):
            return source
        found = LinkPosition(source, profile['css_url']).positions
        if len(found) != 1:
            return source
        start, end = found[0]
        original = source[start:end]
        markup = ('<style id="lf-critical-css">' + critical_css + '</style>'
                  '<script data-lf-critical-loader="r069" data-css-url="' + profile['css_url'] + '">' + loader + '</script>'
                  '<noscript>' + original + '</noscript>')
        return source[:start] + markup + source[end:]
    except (ValueError, TypeError, KeyError):
        return source


def eligible(*, enabled, database, host, website_id, path, method, public,
             debug, query, status, mimetype, encoded, csp):
    return bool(enabled and database == DATABASE and host == HOST and website_id == 1
                and path == PATH and method == 'GET' and public and not debug
                and not query and status == 200 and mimetype == 'text/html'
                and not encoded and not csp)
