import urllib.request
import re

html = urllib.request.urlopen('https://super-moxie-bf2daf.netlify.app/').read().decode()
assets = re.findall(r'/assets/[^"]+\.js', html)
print('Found JS assets on Netlify:', assets)
for a in assets:
    url = 'https://super-moxie-bf2daf.netlify.app' + a
    js = urllib.request.urlopen(url).read().decode()
    print('Asset:', a)
    print('  Length:', len(js))
    print('  Contains onrender.com:', 'polutry-guard-ai-web-application.onrender.com' in js)
    print('  Contains localhost:5000:', 'localhost:5000' in js)
    print('  Contains Render is spinning up:', 'Render is spinning up' in js)
