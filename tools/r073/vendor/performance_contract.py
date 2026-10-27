"""Read-only DOM contract for freight cards. No activation or page rewriting.

A caller must additionally prove page-specific critical CSS coverage. Validation
is not a security sanitizer or financial/schema validation. Only named value
slots vary; all other elements, attributes and labels remain fingerprinted.
"""
from copy import deepcopy
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import json
import re
from urllib.parse import parse_qsl, urlsplit

PREFIX = 's_explore_freight_opportunities'
STATES = ('current', 'expired', 'confirmation')


def one(node, xpath):
    values = node.xpath(xpath)
    if len(values) != 1:
        raise ValueError('Unexpected slot cardinality: ' + xpath)
    return values[0]


def text_slot(node, maximum=512):
    if len(node) or not (node.text or '').strip() or len(node.text) > maximum:
        raise ValueError('Unsupported text slot')
    node.text = 'LF_VALUE'


def shape(node):
    if not isinstance(node.tag, str):
        raise ValueError('Unsupported comment/node')
    return [node.tag, sorted(node.attrib.items()), (node.text or '').strip(),
            [[shape(child), (child.tail or '').strip()] for child in node]]


def fingerprint(node):
    return hashlib.sha256(json.dumps(shape(node), ensure_ascii=True,
                                    separators=(',', ':')).encode()).hexdigest()


def card_signature(card):
    """Normalize a COPY; original rendered values/URLs never change."""
    card = deepcopy(card)
    if card.tag != 'article' or card.get('class') != PREFIX + '__card':
        raise ValueError('Unknown card root')
    route_id = card.get('data-route-id', '')
    if not re.fullmatch(r'[1-9][0-9]{0,11}', route_id):
        raise ValueError('Invalid route id')
    card.set('data-route-id', 'LF_ID')
    title = card.get('aria-label', '')
    if not title or len(title) > 512:
        raise ValueError('Invalid title')
    card.set('aria-label', 'LF_VALUE')
    title_node = one(card, './strong[@class="fo-route-title visually-hidden"]')
    if title_node.text != title:
        raise ValueError('Title mismatch')
    text_slot(title_node)

    tag = one(card, './div/span[@class="' + PREFIX + '__tag"]')
    if not (tag.text or '').strip() or len(tag.text) > 64:
        raise ValueError('Invalid transport mode')
    tag.text = 'LF_VALUE'
    dot = one(tag, './span[@aria-hidden="true"]')
    if not (dot.tail or '').strip() or len(dot.tail) > 64:
        raise ValueError('Invalid pricing unit')
    dot.tail = 'LF_VALUE'
    for xpath in ('./div[@class="fo-lane"]/div[1]/strong',
                  './div[@class="fo-lane"]/div[2]/strong',
                  './dl/div/dd[@class="' + PREFIX + '__value"]'):
        text_slot(one(card, xpath), 256)

    status = one(card, './div/span[starts-with(@class,"fo-status ")]')
    state = status.get('class', '').removeprefix('fo-status fo-status--')
    if state not in STATES:
        raise ValueError('Unknown rate state')
    price = one(card, './div[@class="fo-rate-row"]/div[@class="fo-rate"]/p[@class="fo-price"]')
    has_amount = bool(len(price))
    if has_amount:
        currency = one(price, './span')
        if not re.fullmatch(r'[A-Z]{3}', currency.text or ''):
            raise ValueError('Invalid currency')
        amount = one(price, './strong')
        if not re.fullmatch(r'[0-9]{1,12}(?:\.[0-9]{1,4})?', amount.text or ''):
            raise ValueError('Invalid amount')
        try:
            if Decimal(amount.text) <= 0:
                raise ValueError('Nonpositive amount')
        except InvalidOperation as exc:
            raise ValueError('Invalid amount') from exc
        for child in (currency, amount, one(price, './small')):
            text_slot(child, 64)
    validity = one(card, './div[@class="fo-rate-row"]/div[@class="fo-rate"]/p[@class="fo-validity"]')
    has_date = bool(len(validity))
    if has_date:
        time = one(validity, './time')
        value = time.get('datetime', '')
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value) or time.text != value:
            raise ValueError('Invalid validity')
        date.fromisoformat(value)
        text_slot(time, 10)
        time.set('datetime', 'LF_DATE')
    if state == 'current' and not (has_amount and has_date):
        raise ValueError('Incomplete current rate')
    if state == 'expired' and not has_date:
        raise ValueError('Expired rate without date')

    link = one(card, './div[@class="fo-rate-row"]/div[@class="fo-card-actions"]/a[@class="fo-route-link"]')
    url = link.get('href', '')
    if not re.fullmatch(r'/freight/[A-Za-z0-9_-]+-' + route_id, url):
        raise ValueError('Unreviewed route URL')
    if link.get('aria-label') != 'View route: ' + title:
        raise ValueError('Link title mismatch')
    link.set('href', 'LF_ROUTE_URL')
    link.set('aria-label', 'LF_VALUE')
    updates = card.xpath('.//a[@class="fo-update-link"]')
    if len(updates) != (0 if state == 'current' else 1):
        raise ValueError('Wrong update action count')
    for update in updates:
        parsed = urlsplit(update.get('href', ''))
        pairs = parse_qsl(parsed.query, keep_blank_values=True)
        allowed = {'pricing_id', 'from_port_cities', 'to_port_cities',
                   'transport_type', 'container_type', 'equipment_type_for_sea'}
        if (parsed.scheme or parsed.netloc or parsed.fragment or parsed.path != '/shipping-request'
                or len(dict(pairs)) != len(pairs) or not set(dict(pairs)) <= allowed
                or dict(pairs).get('pricing_id') != route_id
                or any(not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', value) for _, value in pairs)):
            raise ValueError('Unreviewed update URL')
        update.set('href', 'LF_REQUEST_URL')
    return (state + ':' + str(int(has_amount)) + ':' + str(int(has_date)), fingerprint(card))


def normalize_block(block, contract):
    """Return a comparison-only copy with validated cards replaced by a marker.

    Caller fingerprints the remaining page independently; this does NOT admit a
    page by its snippet name. Unknown structure remains visible or raises.
    """
    if contract.get('version') != 1:
        raise ValueError('Unknown contract version')
    block = deepcopy(block)
    if block.tag != 'section' or block.get('data-snippet') != PREFIX:
        raise ValueError('Unknown block')
    count = block.get('data-card-count', '')
    if not re.fullmatch(r'(?:[2-9]|1[0-2])', count):
        raise ValueError('Unreviewed configured count')
    grid = one(block, './div/div[@class="' + PREFIX + '__grid"]')
    cards = list(grid)
    if len(cards) > int(count):
        raise ValueError('Too many cards')
    ids = [card.get('data-route-id') for card in cards]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate route')
    for card in cards:
        variant, digest = card_signature(card)
        if contract.get('cards', {}).get(variant) != digest:
            raise ValueError('Unreviewed card structure: ' + variant)
    empty = block.xpath('./div/p[@class="fo-empty"]')
    if len(empty) != (0 if cards else 1):
        raise ValueError('Empty state mismatch')
    if empty:
        if fingerprint(empty[0]) != contract.get('empty'):
            raise ValueError('Unreviewed empty state')
        empty[0].getparent().remove(empty[0])
    if (grid.text or '').strip() or any((c.tail or '').strip() for c in cards):
        raise ValueError('Unexpected grid text')
    for card in cards:
        grid.remove(card)
    grid.text = 'LF_REVIEWED_CARDS'
    block.set('data-card-count', 'LF_COUNT')
    classes = block.get('class', '').split()
    count_class = PREFIX + '_' + count
    if count_class in classes:
        classes.remove(count_class)
    block.set('class', ' '.join(classes))
    return block
