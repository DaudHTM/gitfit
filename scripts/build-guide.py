from pathlib import Path
import html,re
source=Path('README.md').read_text().replace('(dist/wiring.svg)','(wiring.svg)')
def inline(s):
 s=html.escape(s)
 s=re.sub(r'!\[([^]]+)\]\(([^)]+)\)',r'<img alt="\1" src="\2">',s)
 s=re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'<a href="\2">\1</a>',s)
 s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
 return re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
parts=[];table=False
for line in source.splitlines():
 if line.startswith('|'):
  if not table: parts.append('<table>');table=True
  if re.match(r'^\|[- :|]+$',line):continue
  parts.append('<tr>'+''.join('<td>'+inline(x.strip())+'</td>' for x in line.strip('|').split('|'))+'</tr>');continue
 if table:parts.append('</table>');table=False
 if not line:continue
 m=re.match(r'^(#{1,3}) (.*)',line)
 parts.append(f'<h{len(m[1])}>{inline(m[2])}</h{len(m[1])}>' if m else '<p>'+inline(line)+'</p>')
Path('dist/guide.html').write_text('<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GitFit — Build guide</title><link rel="stylesheet" href="style.css"></head><body><header><a class="brand" href="./">← GITFIT / MOTION LAB</a></header><main class="docs"><p><a href="ArmTracker.ino" download>Download ESP32 sketch</a> · <a href="README.md" download>Download setup guide</a></p>'+''.join(parts)+'</main></body></html>')
