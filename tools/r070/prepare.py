"""Build isolated visual fixtures, never save or modify Odoo pages."""
import base64,gzip,sys
from pathlib import Path
from copy import deepcopy
from lxml import html
root=Path(__file__).parent
source=sys.stdin.read();scenario,mode,theme,layout=sys.argv[1:]
tree=html.document_fromstring(source)
for script in tree.xpath('//script'):
    script.getparent().remove(script)
tree.set('data-lf-theme',theme)
tree.set('data-lf-default-theme',theme)
tree.set('data-lf-layout-light',layout)
tree.set('data-lf-layout-dark',layout)
# Existing theme runtime normally sets these; fixtures explicitly select them.
block=tree.xpath('//section[@data-snippet="s_explore_freight_opportunities"]')[0]
grid=block.xpath('./div/div[@class="s_explore_freight_opportunities__grid"]')[0]
if scenario!='native-mixed':
    for child in list(grid):grid.remove(child)
    if scenario=='empty':
        grid.addnext(html.fromstring('<p class="fo-empty">No matching public freight routes are available here. Tell us about your shipment.</p>'))
    else:
        files=sorted((root/'fixtures').glob('card-*.html'))
        count=12 if scenario=='all-variants-12' else 2
        block.set('data-card-count',str(count))
        for i in range(count):
            card=html.fromstring(files[i%len(files)].read_text())
            card.set('data-route-id',str(1000+i))
            for link in card.xpath('.//a[@class="fo-route-link"]'):
                link.set('href','/freight/fixture-'+str(1000+i))
            for link in card.xpath('.//a[@class="fo-update-link"]'):
                link.set('href','/shipping-request?pricing_id='+str(1000+i))
            if scenario=='long-values-2':
                for node in card.xpath('.//div[@class="fo-lane"]/div/strong'):
                    node.text='Very long reviewed route name ' * 7
                for node in card.xpath('.//p[@class="fo-price"]/strong'):node.text='999999999999.9999'
                for node in card.xpath('.//dd'):node.text='123456789 Days'
            grid.append(card)
if mode=='critical':
    links=tree.xpath('//link[@rel="stylesheet" and contains(@href,"assets_service_frontend.min.css")]')
    assert len(links)==1
    style=html.Element('style',id='lf-critical-r070-test')
    style.text=gzip.decompress(base64.b64decode((root/'critical.css.gz.b64').read_bytes())).decode()
    style.tail=links[0].tail;links[0].getparent().replace(links[0],style)
sys.stdout.write(html.tostring(tree,encoding='unicode',method='html'))
