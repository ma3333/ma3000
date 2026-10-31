# 3. ארכיטקטורה טכנית

## 3.1 תמונה כללית

```mermaid
flowchart LR
    subgraph Clients["לקוחות"]
        W[Web App / PWA<br/>React + TS]
        M[Mobile Apps<br/>React Native - P3]
        X[External API Clients<br/>סטטיסטיקה / אינטגרציות]
    end

    subgraph Edge["שכבת קצה"]
        CDN[CDN + WAF]
        LB[Load Balancer / Ingress<br/>TLS, ניתוב לפי דומיין Tenant]
    end

    subgraph App["שרתי אפליקציה (Stateless, ניתנים לשכפול)"]
        API[API Server<br/>NestJS - REST + WebSocket]
        WRK[Workers<br/>BullMQ: התראות, SLA, PDF, ייבוא]
        SCH[Scheduler<br/>טיפולים מונעים, תזכורות, פקיעת אישורים]
        STAT[Stats Service<br/>אגרגציה ואנונימיזציה]
        IOT[IoT Service<br/>קליטה, חוקי התראה, פקודות]
    end

    subgraph Site["בבניין"]
        GW[Edge Gateway<br/>BACnet / Modbus / MQTT / LoRaWAN]
    end

    MQ[MQTT Broker<br/>EMQX, mTLS]

    subgraph Data["שכבת נתונים"]
        PG[(PostgreSQL<br/>Primary)]
        PGR[(PostgreSQL<br/>Replica / Standby)]
        RD[(Redis<br/>Cache, Queue, Sessions)]
        S3[(Object Storage<br/>S3 / MinIO<br/>מסמכים ותמונות)]
        DW[(Analytics DB<br/>ClickHouse / PG schema נפרד)]
        TSDB[(TimescaleDB<br/>נתוני חיישנים)]
    end

    subgraph Ext["שירותים חיצוניים"]
        SMS[SMS / WhatsApp]
        MAIL[Email]
        PAY[סליקה: Cardcom / Tranzila / Grow]
        INV[חשבוניות: Green Invoice / iCount]
    end

    W & M --> CDN --> LB --> API
    X --> LB
    API --> PG & RD & S3
    API --> RD
    WRK --> PG & RD & S3 & SMS & MAIL
    SCH --> RD
    STAT --> PGR --> DW
    API --> PAY & INV
    PG -. replication .-> PGR
    GW -- יוצא בלבד --> MQ --> IOT --> TSDB
    IOT --> RD
    IOT --> PG
```

## 3.2 בחירת טכנולוגיות (המלצה)

| שכבה | טכנולוגיה | נימוק |
|------|-----------|-------|
| Frontend | **React 19 + TypeScript + Vite**, React Router, TanStack Query, Tailwind + רכיבי UI עם תמיכת RTL (shadcn/ui או MUI) | אקו-סיסטם גדול, תמיכה טובה ב-RTL, קל לגייס מפתחים |
| i18n | i18next + ICU | עברית/אנגלית/ערבית, ריבוי צורות |
| PWA | Workbox (Service Worker) | Offline למבקר ולספק בשטח, Web Push |
| גרפים | Recharts / ECharts | דשבורדים |
| Backend | **Node.js 22 + NestJS + TypeScript** | שפה אחת לכל הצוות, מודולריות, DI, Swagger מובנה |
| ORM | Prisma או Drizzle | מיגרציות, Type-safety |
| DB | **PostgreSQL 16** עם Row-Level Security | אמינות, JSONB לשדות גמישים, RLS לבידוד Tenants |
| תורים | Redis + BullMQ | משימות רקע, Retry, תזמון |
| קבצים | S3-compatible (AWS S3 / Cloudflare R2 / MinIO בהתקנה עצמית) | אותו API בענן ובשרת פרטי |
| PDF | Playwright/Chromium (HTML→PDF) | דוחות ממותגים ב-RTL |
| חיפוש | PostgreSQL Full-Text (MVP) → OpenSearch (P3) | |
| Auth | מודול Auth פנימי (OTP + סיסמה + 2FA) עם תמיכה ב-OIDC/SAML ל-SSO של חברות גדולות; אלטרנטיבה: Keycloak | |
| Observability | OpenTelemetry Collector → Loki, Prometheus/Mimir, Tempo, Grafana; Sentry לשגיאות | ראה [מסמך 14](14-debugging.md), [מסמך 15](15-logging-analytics.md) |
| Security | Cloudflare/AWS WAF, Vault/KMS, Wazuh (SIEM), ClamAV | ראה [מסמך 13](13-cyber-security-auth.md) |
| IoT | EMQX (MQTT Broker), TimescaleDB, סוכן Edge ב-Go | ראה [מסמך 11](11-smart-building.md) |
| Infra | Docker, Kubernetes (k3s לשרתים קטנים), Helm, Terraform | אותו פריסה בענן ו-On-Prem |
| CI/CD | GitHub Actions | בדיקות, Build, Deploy |

> חלופה ל-Backend: Python + FastAPI (אם הצוות חזק יותר ב-Python, ובפרט לשירות הסטטיסטיקה).

## 3.3 מבנה מודולרי (Modular Monolith)

מתחילים כ-**Modular Monolith** — שרת אחד עם גבולות מודולים ברורים — ופורקים לשירותים נפרדים רק כשיש צורך (סקייל או צוותים נפרדים). זה מקטין מורכבות תפעולית בשלבים הראשונים.

```
apps/
  web/                 # React PWA
  api/                 # NestJS
    src/modules/
      tenancy/         # Tenants, branding, feature flags, settings
      identity/        # Users, auth (OTP, passkeys, 2FA, SSO), sessions, step-up, roles
      security/        # Rate limiting, risk scoring, fraud rules, security events
      property/        # Buildings, entrances, floors, units, assets, common areas
      people/          # Residents, occupancy, ownership, contacts, privacy prefs
      finance/         # Double-entry ledger, funds, charges, payments, petty cash, checks,
                       # vendor invoices, approvals, bank reconciliation, budgets
      tickets/         # Tickets, categories, SLA engine, escalation
      workorders/      # Work orders, quotes, check-in, vendor execution
      vendors/         # Vendor profiles, licenses, insurance, contracts, ratings
      maintenance/     # Preventive plans, schedules, recurring tasks
      inspections/     # Audit templates, inspections, findings, safety score
      documents/       # Document store, versions, expiry, permissions
      comms/           # Announcements, surveys, votes
      notifications/   # Audiences, policy matrix, templates, channel adapters
                       # (email/WhatsApp/SMS/push), digests, inbox, delivery log
      bookings/        # Facilities, visitors (P2)
      reports/         # Dashboards, exports, PDF generation
      stats/           # Anonymized aggregate datasets, external API
      smartbuilding/   # Gateways, devices, points, telemetry, alarms, commands
      audit/           # Audit log (append-only, hash chain)
      reports/         # Report engine + scheduled reports (daily/weekly/monthly)
      devtools/        # Debug mode, queue/webhook inspectors, impersonation, health
  worker/              # Background jobs (shares modules with api)
packages/
  shared/              # Types, validation schemas (zod), enums
  ui/                  # Design system components
infra/
  docker/  helm/  terraform/  backup/
edge/
  agent/               # Go: protocol drivers, local buffer, local rules
docs/
```

## 3.4 מודל רב-לקוחיות (Multi-Tenancy)

**היררכיה:**
```
Platform (אתה — מפעיל המערכת)
 └── Organization / Tenant  (חברת ניהול  או  ועד בית עצמאי)
      └── Building / Site
           └── Entrance / Floor
                └── Unit (דירה / משרד)
```

- **ברירת מחדל — Shared DB, Shared Schema + `tenant_id` בכל טבלה + PostgreSQL RLS**: זול ופשוט לתפעול, מתאים לאלפי ועדים קטנים.
- **לקוחות גדולים / רגישים — Dedicated DB או Dedicated Deployment**: אותו קוד, מסד נתונים נפרד או אשכול נפרד (ראה [מסמך 5](05-deployment-backup.md)).
- **Tenant Resolution**: לפי דומיין/תת-דומיין (`acme.ma3000.co.il`, `portal.acme-mgmt.co.il`) או לפי Header/Token.
- **גישה חוצת-Tenants**: בעלי מקצוע ומבקרים הם ישויות ברמת הפלטפורמה ומקבלים גישה למבנים ספציפיים דרך **Grants** מוגבלים (היקף + זמן).
- **Tenant Router**: שירות קטן שממפה Tenant → אשכול/DB (לתמיכה בפריסה מבוזרת).

## 3.5 מנוע SLA ותזמון

- כל שינוי סטטוס/חומרה מחשב `response_due_at` ו-`resolve_due_at` לפי מדיניות ה-Tenant, לוח עסקים וחגים.
- Job מחזורי (כל דקה) מאתר תקלות שחצו ספי Escalation ושולח התראות (אידמפוטנטי).
- Scheduler יוצר הזמנות עבודה מתכניות אחזקה מונעת (RRULE — חוקי חזרתיות כמו "כל 3 חודשים").
- Job יומי לבדיקת פקיעת אישורים, רישיונות ספקים ופוליסות.

## 3.6 זרימת אירועים

כל פעולה משמעותית מפרסמת **Domain Event** (למשל `ticket.created`, `payment.received`, `inspection.finding.created`) לתור פנימי. צרכנים: התראות, Audit, עדכון סטטיסטיקות, Webhooks ללקוחות חיצוניים. בהמשך ניתן להחליף ל-NATS/Kafka ללא שינוי בלוגיקה העסקית (Outbox Pattern).
