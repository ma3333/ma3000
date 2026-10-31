# 4. מודל נתונים (ישויות עיקריות)

> כל טבלה ברמת Tenant כוללת: `id (uuid)`, `tenant_id`, `created_at`, `updated_at`, `created_by`, `deleted_at` (מחיקה רכה).

## 4.1 דיאגרמה

```mermaid
erDiagram
    TENANT ||--o{ BUILDING : manages
    TENANT ||--|| TENANT_SETTINGS : has
    BUILDING ||--o{ UNIT : contains
    BUILDING ||--o{ ASSET : has
    BUILDING ||--o{ DOCUMENT : has
    UNIT ||--o{ OCCUPANCY : has
    PERSON ||--o{ OCCUPANCY : is
    USER ||--|| PERSON : identity
    USER ||--o{ ROLE_ASSIGNMENT : has
    UNIT ||--o{ CHARGE : billed
    CHARGE ||--o{ PAYMENT_ALLOCATION : paid_by
    PAYMENT ||--o{ PAYMENT_ALLOCATION : allocates
    BUILDING ||--o{ TICKET : has
    TICKET }o--|| TICKET_CATEGORY : classified
    TICKET_CATEGORY }o--|| SLA_POLICY : uses
    TICKET ||--o{ WORK_ORDER : fulfilled_by
    WORK_ORDER }o--|| VENDOR : assigned
    WORK_ORDER ||--o| VENDOR_RATING : rated
    VENDOR ||--o{ VENDOR_LICENSE : holds
    ASSET ||--o{ MAINTENANCE_PLAN : scheduled
    MAINTENANCE_PLAN ||--o{ WORK_ORDER : generates
    BUILDING ||--o{ INSPECTION : audited
    INSPECTION }o--|| INSPECTION_TEMPLATE : uses
    INSPECTION ||--o{ FINDING : produces
    FINDING ||--o| TICKET : creates
    BUILDING ||--o{ CERTIFICATE : has
    BUILDING ||--o{ RFQ : publishes
    TICKET ||--o| RFQ : may_open
    RFQ ||--o{ RFQ_ITEM : contains
    RFQ ||--o{ RFQ_INVITATION : invites
    RFQ_INVITATION }o--|| VENDOR : to
    RFQ ||--o{ BID : receives
    VENDOR ||--o{ BID : submits
    BID ||--o{ BID_LINE_ITEM : prices
    RFQ ||--o| RFQ_AWARD : awarded
    RFQ_AWARD ||--o| WORK_ORDER : creates
```

## 4.2 ישויות לפי מודול

### Tenancy
| ישות | שדות עיקריים |
|------|---------------|
| **Tenant** | name, type (`management_company` / `house_committee` / `owner`), plan, status, deployment_target (shared/dedicated cluster id), data_sharing_opt_in |
| **TenantSettings** | logo_url, colors (JSON), custom_domain, default_locale, timezone, business_hours, holidays_calendar, feature_flags (JSON), email/sms sender names |

### Property
| ישות | שדות עיקריים |
|------|---------------|
| **Building** | tenant_id, name, type (`residential` / `office` / `mixed`), address, geo, city, year_built, floors, units_count, gross_area, qr_code |
| **Entrance/Floor** | building_id, name/number |
| **Unit** | building_id, number, floor, area_sqm, share_in_common_property, type (apartment/office/store/parking/storage) |
| **CommonArea** | building_id, name (לובי, גג, חניון, חדר אשפה) |
| **Asset** | building_id, type (elevator, pump, generator, fire_panel, sprinkler, boiler, hvac, gate), manufacturer, model, serial, install_date, warranty_until, location |

### People & Identity
| ישות | שדות עיקריים |
|------|---------------|
| **User** | phone, email, password_hash?, mfa, locale, status |
| **Person** | user_id?, first/last name, id_number (מוצפן), phone, email, privacy_prefs |
| **Occupancy** | unit_id, person_id, relation (`owner` / `tenant` / `company_rep` / `employee`), is_primary_payer, from, to |
| **Company** (משרדים) | name, registration_no, unit_ids, billing_contact |
| **RoleAssignment** | user_id, role, scope_type (platform/tenant/building/unit), scope_id, valid_from, valid_to |

### Finance
| ישות | שדות עיקריים |
|------|---------------|
| **ChargeRule** | building_id, name, amount / per_sqm, frequency, split_method |
| **Charge** | unit_id, period, amount, due_date, type (monthly/special/fine), status |
| **Payment** | payer_person_id, amount, method (cash/check/transfer/credit/standing_order/bit), reference, received_at, receipt_no |
| **PaymentAllocation** | payment_id, charge_id, amount |
| **Expense** | building_id, vendor_id?, category, amount, invoice_doc_id, work_order_id? |
| **Budget** | building_id, year, lines (category, planned) |

### Tickets & Work
| ישות | שדות עיקריים |
|------|---------------|
| **TicketCategory** | tenant_id (null = מערכת), parent_id, name (i18n), default_severity, required_vendor_trade |
| **SlaPolicy** | tenant_id, severity, response_minutes, resolve_minutes, calendar (24x7/business), escalation_rules (JSON) |
| **Ticket** | building_id, unit_id?, common_area_id?, asset_id?, category_id, severity, source (resident/committee/manager/auditor/system/vendor), opened_by, title, description, status, response_due_at, resolve_due_at, first_response_at, resolved_at, closed_at, sla_breached, is_recurring, parent_ticket_id |
| **TicketEvent** | ticket_id, type (status_change, comment, attachment, assignment, severity_change), payload, actor |
| **WorkOrder** | ticket_id? / maintenance_plan_id?, vendor_id / technician_user_id, scheduled_at, status, checkin_at, checkout_at, checkin_geo, labor_hours, parts (JSON), cost, quote_amount, quote_status, signature |
| **Attachment** | owner_type, owner_id, storage_key, mime, size, kind (before/after/document) |

### Vendors
| ישות | שדות עיקריים |
|------|---------------|
| **Vendor** | (ברמת פלטפורמה) name, company, business_id, trades[], service_areas[], phone, email, status |
| **VendorLicense** | vendor_id, type (חשמלאי מוסמך, קבלן רשום, בודק מעליות...), number, issuer, valid_until, doc_id |
| **VendorInsurance** | vendor_id, type, insurer, policy_no, valid_until, doc_id |
| **VendorEngagement** | tenant_id, vendor_id, contract_doc_id, price_list (JSON), sla_override, status (approved/blocked) |
| **VendorRating** | work_order_id, rater_user_id, timeliness, quality, price, courtesy, comment |

### RFQ (בקשות להצעות מחיר)
| ישות | שדות עיקריים |
|------|---------------|
| **Rfq** | tenant_id, level (unit/building/portfolio/platform), scope_ids[], source (manual/ticket/finding/maintenance_renewal), source_id, type (one_off/project/service_contract/framework/quick), trade, title, description, distribution (invited/approved_pool/open), sealed, submission_deadline, site_visit_at, desired_start/end, payment_terms, required_warranty_months, required_insurance, budget_estimate (פנימי), evaluation_weights (JSON), min_bids, status |
| **RfqItem** | rfq_id, line_no, description, unit, quantity (כתב כמויות) |
| **RfqInvitation** | rfq_id, vendor_id, invited_at, viewed_at, status (invited/interested/declined/submitted) |
| **RfqQuestion** | rfq_id, vendor_id (מוסתר כאשר מפורסם), question, answer, published_at |
| **RfqAmendment** | rfq_id, description, changes (JSON), published_at |
| **Bid** | rfq_id, vendor_id, total_amount, vat_included, duration_days, start_date, warranty_months, payment_terms, valid_until, notes, status (draft/submitted/withdrawn/won/lost), submitted_at, round (1 / BAFO) |
| **BidLineItem** | bid_id, rfq_item_id, unit_price, total |
| **BidEvaluation** | bid_id, evaluator_user_id, scores (JSON), weighted_score, comment, conflict_declared |
| **RfqAward** | rfq_id, bid_id, justification, approval_flow (JSON: חתימות / הצבעה), awarded_at, resulting_work_order_id / contract_id |

### Maintenance
| ישות | שדות עיקריים |
|------|---------------|
| **MaintenanceTemplate** | name, asset_type, tasks[], recurrence (RRULE) |
| **MaintenancePlan** | building_id, asset_id?, template_id?, vendor_id?, recurrence, next_due_at, last_done_at |

### Inspections & Compliance
| ישות | שדות עיקריים |
|------|---------------|
| **InspectionTemplate** | name, version, building_types[], sections → items (question, weight, default_severity, regulation_ref) |
| **Inspection** | building_id, template_id+version, auditor_user_id, date, status, score, report_doc_id, signature |
| **Finding** | inspection_id, item_id, result (ok/fail/na), severity, location, notes, photos, ticket_id, verified_at |
| **Certificate** | building_id, asset_id?, type (תסקיר מעלית, אישור כיבוי אש, בדיקת חשמל, גז...), inspector_name, inspector_company, license_no, issued_at, valid_until, result, doc_id |

### Documents & Communication
| ישות | שדות עיקריים |
|------|---------------|
| **Document** | building_id / tenant_id, category (תקנון, ביטוח, פרוטוקול, דוח ליקויים, חוזה, היתר, תכנית), title, current_version_id, valid_until, visibility (committee/residents/vendors/auditors/public) |
| **DocumentVersion** | document_id, storage_key, uploaded_by, checksum |
| **Announcement** | building_id, title, body, channels[], audience, published_at |
| **Survey / Vote** | building_id, question, options, voting_method (per_unit / per_share), closes_at |
| **Notification** | user_id, type, payload, channel, sent_at, read_at |

### Platform
| ישות | שדות עיקריים |
|------|---------------|
| **AuditLog** | tenant_id, actor_user_id, action, entity, entity_id, diff, ip, user_agent, at (Append-only) |
| **AccessGrant** | grantee_user_id (מבקר / ספק / גורם חוץ), scope, permissions[], valid_from, valid_to, granted_by |
| **ApiClient** | owner (tenant / external org), key_hash, scopes[], rate_limit, data_tier |
| **StatsSnapshot** | dimension keys (region, building_age_bucket, category...), period, metrics (JSON), contributing_buildings (≥k) |
