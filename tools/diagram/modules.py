"""Generates docs/img/module-map.svg: block diagram of all modules, numbered by build order (RTL layout)."""
import html, sys

W, H = 2000, 1340
COLW, GAP, X0 = 260, 36, 50
col_x = lambda k: X0 + (6 - k) * (COLW + GAP)          # k=1 is the rightmost column
ROWS = {'r3': (250, 80), 'r4a': (380, 80), 'r4b': (510, 80), 'r5': (640, 80), 'r6': (770, 80), 'r7': (900, 80)}
STY = {
    'mvp': ('#E2F0D9', '#548235'), 'p2': ('#FFF2CC', '#BF9000'), 'p3': ('#FBE5D6', '#C55A11'),
    'fut': ('#FFFFFF', '#7F7F7F'), 'base': ('#DEEBF7', '#2E75B6'),
}
boxes = {}
out = []
labels = []  # edge labels are drawn last so no line crosses them
esc = html.escape

def text(x, y, s, size=17, weight='normal', color='#1F1F1F', anchor='middle'):
    out.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}" '
               f'text-anchor="{anchor}" direction="rtl" font-family="Arial, Liberation Sans, sans-serif">{esc(s)}</text>')

def box(key, num, lines, kind, x, y, w=COLW, h=80):
    fill, stroke = STY[kind]
    dash = ' stroke-dasharray="9 6"' if kind == 'fut' else ''
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2.2"{dash}/>')
    # number badge at the top-right corner (start of an RTL line)
    out.append(f'<circle cx="{x + w - 4}" cy="{y + 4}" r="17" fill="{stroke}"/>')
    text(x + w - 4, y + 10, str(num), 16, 'bold', '#FFFFFF')
    cy = y + h / 2 - (len(lines) - 1) * 11 + 6
    for i, l in enumerate(lines):
        text(x + w / 2, cy + i * 22, l, 17 if i == 0 else 15, 'bold' if i == 0 else 'normal', '#1F1F1F' if i == 0 else '#404040')
    boxes[key] = (x, y, w, h)

def cell(key, num, lines, kind, row, col):
    y, h = ROWS[row]
    box(key, num, lines, kind, col_x(col), y, COLW, h)

def edge(key, side):
    x, y, w, h = boxes[key]
    return {'t': (x + w / 2, y), 'b': (x + w / 2, y + h), 'l': (x, y + h / 2), 'r': (x + w, y + h / 2)}[side]

def path(points, label=None, at=None, dashed=False, color='#404040'):
    d = 'M ' + ' L '.join(f'{px:.0f} {py:.0f}' for px, py in points)
    dash = ' stroke-dasharray="8 6"' if dashed else ''
    out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.2"{dash} marker-end="url(#arrow)"/>')
    if label:
        lx, ly = at
        tw = len(label) * 8.2 + 14
        labels.append((lx, ly, tw, label))

out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
out.append('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
           '<path d="M0 0 L10 5 L0 10 z" fill="#404040"/></marker></defs>')
out.append(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>')
text(W / 2, 46, 'מפת מודולים · פלטפורמת ניהול בניינים', 30, 'bold', '#1F4E79')
text(W / 2, 76, 'המספר בעיגול = סדר הבנייה בתכנית הפיתוח · מסגרת מקווקוות = אופציה עתידית', 17, 'normal', '#595959')

# Users and UI
users = ['ועד בית', 'חברת ניהול', 'דייר / נציג חברה', 'בעל מקצוע', 'מבקר בטיחות', 'גורם חוץ']
uw = 250
for i, u in enumerate(users):
    ux = 1790 - (i + 1) * uw - i * 48 + 48 + 0
    ux = 1790 - uw - i * (uw + 48)
    out.append(f'<rect x="{ux}" y="100" width="{uw}" height="40" rx="20" fill="#F2F2F2" stroke="#A6A6A6"/>')
    text(ux + uw / 2, 126, u, 17, 'bold', '#262626')
out.append('<rect x="50" y="160" width="1740" height="46" rx="10" fill="#1F4E79"/>')
text(920, 190, 'אפליקציית Web / PWA בעברית (RTL)  ·  API  ·  אפליקציות Native (עתידי)', 19, 'bold', '#FFFFFF')

# Domain labels (right side)
def domain(label, y0, y1, color='#1F4E79'):
    out.append(f'<rect x="1816" y="{y0}" width="164" height="{y1 - y0}" rx="10" fill="#F7F9FC" stroke="#C9D6E8"/>')
    text(1898, (y0 + y1) / 2 + 6, label, 18, 'bold', color)
domain('בניין ואנשים', 250, 330)
domain('תפעול ותחזוקה', 380, 590)
domain('כספים', 640, 720)
domain('תקשורת וקהילה', 770, 850)
domain('ניהול ודוחות', 900, 980)
domain('תשתית ופלטפורמה', 1030, 1130, '#2E75B6')
domain('אינטגרציות', 1170, 1230, '#7F7F7F')

# Business modules
cell('m6', 6, ['בניינים ודיירים', 'דירות, דיירים, ייבוא מאקסל'], 'mvp', 'r3', 1)
cell('m7', 7, ['פרופיל בניין', 'עץ, קטלוג ציוד, מצבים מיוחדים'], 'mvp', 'r3', 2)
cell('m25', 25, ['מגדלי משרדים', 'חדרים, חניות, מבקרים'], 'p3', 'r3', 4)
cell('f4', 'ע', ['תמ"א 38 / פינוי-בינוי', 'מעקב חתימות ופרויקט'], 'fut', 'r3', 6)

cell('m8', 8, ['תקלות ו-SLA', 'חומרה, הסלמה, היסטוריה'], 'mvp', 'r4a', 1)
cell('m9', 9, ['ספקים והזמנות עבודה', 'שיבוץ, ביצוע, דירוג'], 'mvp', 'r4a', 2)
cell('m19', 19, ['RFQ והצעות מחיר', 'מעטפות סגורות, השוואה'], 'p2', 'r4a', 3)
cell('f2', 'ע', ['Marketplace ספקים', 'RFQ פתוח, עבודות פרטיות'], 'fut', 'r4a', 4)
cell('m23', 23, ['מבקר בטיחות', 'ביקורות, ממצאים, ציון'], 'p3', 'r4a', 5)
cell('m24', 24, ['בניין חכם: ניטור', 'חיישנים, התראות, מוקד'], 'p3', 'r4a', 6)

cell('m11', 11, ['מסמכים ואישורים', 'תוקף, התראות, תכנית אחזקה'], 'mvp', 'r4b', 1)
cell('m18', 18, ['פורטל ספקים מלא', 'הצעות, חשבוניות, רישיונות'], 'p2', 'r4b', 2)
cell('m17', 17, ['תחזוקה מונעת', 'תבניות, הזמנות אוטומטיות'], 'p2', 'r4b', 3)
cell('m22', 22, ['תפעול נוסף', 'שיפוצים, הובלות, ביטוח'], 'p2', 'r4b', 4)
cell('f1', 'ע', ['בניין חכם: שליטה', 'פקודות, מיזוג, בקרת כניסה'], 'fut', 'r4b', 6)

cell('m10', 10, ['כספים', 'ספר חשבונות, חיובים, סנקציות, קופה'], 'mvp', 'r5', 1)
cell('m16', 16, ['תשלומים מקוונים', 'סליקה, מס"ב, התאמות, ספקים'], 'p2', 'r5', 2)
cell('f6', 'ע', ['בנקאות פתוחה', 'תנועות וייזום תשלומים'], 'fut', 'r5', 3)

cell('m12', 12, ['הודעות יזומות וחירום', 'Broadcast, מקלט'], 'mvp', 'r6', 1)
cell('m20', 20, ['תקשורת מתקדמת', 'WhatsApp, מטריצה, תיבה'], 'p2', 'r6', 2)
cell('m21', 21, ['ממשל', 'סקרים, הצבעות, אסיפות'], 'p2', 'r6', 3)
cell('f3', 'ע', ['עוזר AI', 'סיווג, ניסוח, OCR חכם'], 'fut', 'r6', 6)

cell('m13', 13, ['דשבורדים ודוחות', 'ועד, דייר, דוח שבועי'], 'mvp', 'r7', 1)
cell('m15', 15, ['פורטפוליו חברת ניהול', 'מוקד, צוותים, חוצה בניינים'], 'p2', 'r7', 2)
cell('m14', 14, ['Back-office', 'לקוחות, חבילות, חיוב'], 'mvp', 'r7', 3)
cell('m26', 26, ['סטטיסטיקה ו-API חיצוני', 'אנונימי, מצטבר'], 'p3', 'r7', 4)
cell('f5', 'ע', ['אפליקציות Native', 'iOS ו-Android'], 'fut', 'r7', 6)

# Foundation (built first)
out.append('<rect x="44" y="1022" width="1752" height="116" rx="14" fill="#F3F8FD" stroke="#2E75B6" stroke-dasharray="0"/>')
base = [
    ('b1', 1, ['תשתית', 'CI/CD, ענן, גיבוי, DR']),
    ('b2', 2, ['ליבת פלטפורמה', 'ריבוי לקוחות, הגדרות, מיתוג']),
    ('b3', 3, ['זהות ואבטחה', 'OTP, הרשאות, סייבר']),
    ('b4', 4, ['לוגים וביקורת', 'ניטור, Audit, Debugging']),
    ('b5', 5, ['מנוע הודעות', 'מייל, SMS, באפליקציה']),
]
bw = 330
for i, (k, n, l) in enumerate(base):
    box(k, n, l, 'base', 1784 - bw - i * (bw + 20), 1036, bw, 88)
text(920, 1012, 'כל המודולים נשענים על שכבת התשתית (נבנית ראשונה)', 16, 'bold', '#2E75B6')

# Integrations
integ = ['SMS · מייל · WhatsApp ← 5, 20', 'סליקה · מס"ב · Bit ← 16', 'חשבוניות ← 16', 'SSO ← 3', 'חיישנים · BMS ← 24', 'OCR ← 10, 16']
iw = 274
for i, s in enumerate(integ):
    ix = 1790 - iw - i * (iw + 19)
    out.append(f'<rect x="{ix}" y="1176" width="{iw}" height="48" rx="10" fill="#F2F2F2" stroke="#A6A6A6"/>')
    text(ix + iw / 2, 1206, s, 15, 'normal', '#262626')

# Relations
gA, gB, gC = 355, 485, 615          # horizontal gutters (between rows)
xg12 = col_x(1) - GAP / 2            # vertical gutter between column 1 and 2
x8 = edge('m8', 't')[0]
path([edge('m6', 'l'), edge('m7', 'r')])
path([edge('m7', 'b'), (edge('m7', 'b')[0], gA), (x8 - 40, gA), (x8 - 40, ROWS['r4a'][0])], 'קטגוריות וציוד', (1430, gA))
path([edge('m24', 't'), (edge('m24', 't')[0], gA - 14), (x8 + 40, gA - 14), (x8 + 40, ROWS['r4a'][0])],
     'ממצא / התראה ← תקלה אוטומטית', (700, gA - 14))
path([edge('m23', 't'), (edge('m23', 't')[0], gA - 14)])
path([edge('m8', 'l'), edge('m9', 'r')], 'שיבוץ', (xg12, 476))
path([edge('m9', 'l'), edge('m19', 'r')], 'הצעות', (col_x(2) - 18, 476))
path([edge('m19', 'l'), edge('f2', 'r')], dashed=True)
path([edge('m9', 'b'), edge('m18', 't')], 'הרחבה', (edge('m9', 'b')[0], gB))
path([(edge('m17', 'r')[0], edge('m17', 'r')[1]), edge('m18', 'l')], 'הזמנות', (col_x(2) - 18, 606))
path([edge('m24', 'b'), edge('f1', 't')], dashed=True)
# special state / RFQ winner -> special charge (finance)
x10 = edge('m10', 't')[0]
path([edge('m19', 'b'), (edge('m19', 'b')[0], gB + 12), (xg12, gB + 12), (xg12, gC), (x10 + 60, gC), (x10 + 60, ROWS['r5'][0])],
     'זוכה RFQ / מצב מיוחד ← חיוב מיוחד', (1616, gC))
x7 = col_x(2) + COLW - 40
path([(x7, ROWS['r3'][0] + 80), (x7, 368), (xg12, 368), (xg12, gC), (x10 + 60, gC), (x10 + 60, ROWS['r5'][0])])
path([edge('m16', 'r'), edge('m10', 'l')], 'הרחבה', (xg12, 736))
path([edge('m16', 'l'), edge('f6', 'r')], dashed=True)
path([edge('m12', 'l'), edge('m20', 'r')], 'הרחבה', (xg12, 866))
path([edge('m13', 'l'), edge('m15', 'r')], 'חוצה בניינים', (xg12, 996))

for lx, ly, tw, label in labels:
    out.append(f'<rect x="{lx - tw / 2}" y="{ly - 14}" width="{tw}" height="22" rx="6" fill="#FFFFFF" stroke="#D0D0D0"/>')
    text(lx, ly + 3, label, 14, 'normal', '#262626')

# Legend
ly = 1268
items = [('mvp', 'MVP (עדיפות 1)'), ('p2', 'עדיפות 2'), ('p3', 'עדיפות 3'), ('fut', 'אופציה עתידית'), ('base', 'תשתית')]
for i, (k, l) in enumerate(items):
    fill, stroke = STY[k]
    lx = 1760 - i * 260
    dash = ' stroke-dasharray="7 5"' if k == 'fut' else ''
    out.append(f'<rect x="{lx}" y="{ly}" width="30" height="22" rx="5" fill="{fill}" stroke="{stroke}" stroke-width="2"{dash}/>')
    text(lx - 10, ly + 17, l, 16, 'normal', '#262626', 'start')
text(560, ly + 17, 'חץ = תלות / זרימת מידע   ·   ע = עתידי (ללא מספר)', 16, 'normal', '#262626', 'start')
out.append('</svg>')

open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(out))
