# 8. ממשקי API ואינטגרציות

## 8.1 עקרונות API

- REST + JSON, מתועד ב-OpenAPI (Swagger), גרסאות בנתיב: `/api/v1/...`.
- WebSocket / SSE לעדכונים בזמן אמת (סטטוס תקלה, התראות).
- Pagination מבוסס Cursor, סינון ומיון אחידים.
- Idempotency-Key לפעולות תשלום ויצירה.
- Webhooks יוצאים ללקוחות (חתומים ב-HMAC) על אירועים: `ticket.*`, `payment.*`, `inspection.*`, `rfq.*`, `bid.*`, `certificate.expiring`.

## 8.2 נקודות קצה עיקריות (דוגמה)

```
# Auth
POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/refresh
GET    /api/v1/me                       # כולל רשימת הקשרים (Tenants/מבנים/תפקידים)

# Property
GET    /api/v1/buildings
GET    /api/v1/buildings/:id
GET    /api/v1/buildings/:id/units
GET    /api/v1/buildings/:id/residents
GET    /api/v1/buildings/:id/assets

# Finance
GET    /api/v1/buildings/:id/collection-status?period=2026-10
GET    /api/v1/units/:id/ledger
POST   /api/v1/payments
POST   /api/v1/payments/checkout          # יצירת עסקת סליקה
POST   /api/v1/webhooks/payments/:provider

# Tickets
GET    /api/v1/tickets?building=&status=&severity=&source=&vendor=
POST   /api/v1/tickets
PATCH  /api/v1/tickets/:id               # סטטוס, חומרה, שיבוץ
POST   /api/v1/tickets/:id/comments
POST   /api/v1/tickets/:id/attachments

# Work orders (Vendor)
GET    /api/v1/vendor/work-orders
POST   /api/v1/work-orders/:id/accept
POST   /api/v1/work-orders/:id/check-in
POST   /api/v1/work-orders/:id/complete
POST   /api/v1/work-orders/:id/quote
POST   /api/v1/work-orders/:id/rating

# RFQ
POST   /api/v1/rfqs                       # יצירה (level, scope, source)
GET    /api/v1/rfqs?level=&status=&building=
PATCH  /api/v1/rfqs/:id
POST   /api/v1/rfqs/:id/publish
POST   /api/v1/rfqs/:id/invitations
POST   /api/v1/rfqs/:id/questions         # ספק שואל
POST   /api/v1/rfqs/:id/questions/:qid/answer
POST   /api/v1/rfqs/:id/amendments
GET    /api/v1/rfqs/:id/comparison        # רק אחרי מועד ההגשה במעטפות סגורות
POST   /api/v1/rfqs/:id/evaluations
POST   /api/v1/rfqs/:id/award
GET    /api/v1/vendor/rfqs                # לוח RFQ לספק
POST   /api/v1/vendor/rfqs/:id/bids
PATCH  /api/v1/vendor/bids/:bidId
POST   /api/v1/vendor/bids/:bidId/withdraw

# Maintenance & Compliance
GET    /api/v1/buildings/:id/maintenance-plan
GET    /api/v1/buildings/:id/certificates
POST   /api/v1/inspections
POST   /api/v1/inspections/:id/findings
POST   /api/v1/inspections/:id/submit     # מפיק PDF ותקלות

# Documents
GET    /api/v1/buildings/:id/documents
POST   /api/v1/documents/upload-url

# Reports
GET    /api/v1/reports/tickets-summary
GET    /api/v1/reports/sla
GET    /api/v1/reports/vendors

# External stats (API Key)
GET    /api/stats/v1/tickets?groupBy=category,region&period=2026-Q3
GET    /api/stats/v1/safety-scores?groupBy=building_age
```

## 8.3 אינטגרציות

| תחום | ספקים אפשריים | שלב |
|------|---------------|-----|
| SMS | 019 SMS, InforU, Twilio | MVP |
| WhatsApp | WhatsApp Business Cloud API | P2 |
| Email | Amazon SES / SendGrid / Postmark | MVP |
| סליקה ישראלית | Cardcom, Tranzila, Grow (Meshulam), PayPlus; Bit דרך הסולק | P2 |
| הוראות קבע | מס"ב דרך הסולק / קובץ מס"ב | P2 |
| חשבוניות / קבלות | חשבונית ירוקה (Morning), iCount, EZcount, Rivhit | P2 |
| הנהלת חשבונות | ייצוא לחשבשבת / פריוריטי | P3 |
| מפות וכתובות | Google Maps / Mapbox, נתוני כתובות ממשלתיים (data.gov.il) | MVP |
| לוח חגים | Hebcal API / טבלה פנימית | MVP |
| חתימה דיגיטלית | פנימי (Canvas + חותמת זמן) / DocuSign / ComSign | P2 |
| SSO | Azure AD / Google / Okta | P2 |
| בניין חכם | BACnet, Modbus, KNX, M-Bus, MQTT, OPC-UA, LoRaWAN (TTN / ChirpStack), ממשקי ענן של יצרני מעליות ובקרת כניסה ([מסמך 11](11-smart-building.md)) | P3 |
| בקרת כניסה (משרדים) | ממשק למערכות קיימות | P3 |
| BI חיצוני | Power BI / Looker דרך ה-Stats API | P3 |
