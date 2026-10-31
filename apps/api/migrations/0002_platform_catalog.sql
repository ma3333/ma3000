-- Platform catalog (tenant_id NULL): building elements and equipment types with attribute schemas (docs/18 §18.2–18.3).
-- Field types: text | number | boolean | date | select (with options).

INSERT INTO element_types (key, name, default_level, attribute_schema) VALUES
  ('lobby', 'לובי', 0, '{"fields":[]}'),
  ('underground_parking', 'חניון תת-קרקעי', -1, '{"fields":[{"key":"spaces","label":"מספר חניות","type":"number","min":0},{"key":"levels","label":"מפלסים","type":"number","min":1},{"key":"ventilation","label":"מערכת אוורור","type":"boolean"},{"key":"co_detection","label":"גלאי CO","type":"boolean"}]}'),
  ('surface_parking', 'חניה עילית', 0, '{"fields":[{"key":"spaces","label":"מספר חניות","type":"number","min":0}]}'),
  ('shelter', 'מקלט', -1, '{"fields":[{"key":"capacity","label":"קיבולת (אנשים)","type":"number","min":0},{"key":"responsible","label":"אחראי מקלט","type":"text"}]}'),
  ('floor_shelter', 'ממ"ק (מרחב מוגן קומתי)', NULL, '{"fields":[{"key":"capacity","label":"קיבולת (אנשים)","type":"number","min":0}]}'),
  ('roof', 'גג', NULL, '{"fields":[{"key":"access","label":"גישה לגג","type":"select","options":["פתוחה","נעולה","דרך מפתח ועד"]},{"key":"waterproofing_year","label":"שנת איטום אחרונה","type":"number"}]}'),
  ('pump_room', 'חדר משאבות', -1, '{"fields":[]}'),
  ('electrical_room', 'חדר חשמל', -1, '{"fields":[]}'),
  ('garbage_room', 'חדר אשפה', 0, '{"fields":[{"key":"recycling","label":"מחזור","type":"boolean"}]}'),
  ('storage_area', 'מחסנים', -1, '{"fields":[{"key":"count","label":"מספר מחסנים","type":"number","min":0}]}'),
  ('pool', 'בריכה', NULL, '{"fields":[{"key":"season","label":"עונת פעילות","type":"text"},{"key":"health_license","label":"רישיון משרד הבריאות","type":"boolean"}]}'),
  ('gym', 'חדר כושר', NULL, '{"fields":[]}'),
  ('residents_room', 'חדר דיירים', NULL, '{"fields":[{"key":"bookable","label":"ניתן להזמנה","type":"boolean"}]}'),
  ('meeting_room', 'חדר ישיבות', NULL, '{"fields":[{"key":"seats","label":"מקומות ישיבה","type":"number","min":0},{"key":"bookable","label":"ניתן להזמנה","type":"boolean"}]}'),
  ('garden', 'גינה / חצר', 0, '{"fields":[{"key":"irrigation","label":"מערכת השקיה","type":"boolean"}]}'),
  ('playground', 'מתקני משחק', 0, '{"fields":[{"key":"last_inspection","label":"בדיקה אחרונה","type":"date"}]}');

INSERT INTO asset_types (key, name, category, life_safety, attribute_schema) VALUES
  ('elevator', 'מעלית', 'vertical', false, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"},{"key":"model","label":"דגם","type":"text"},{"key":"stops","label":"מספר תחנות","type":"number","min":2},{"key":"capacity_kg","label":"עומס (ק\"ג)","type":"number","min":0},{"key":"shabbat","label":"מעלית שבת","type":"boolean"},{"key":"firefighter","label":"מעלית כבאים","type":"boolean"},{"key":"install_year","label":"שנת התקנה","type":"number"}]}'),
  ('water_pump', 'משאבת מים', 'water', false, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"},{"key":"power_kw","label":"הספק (kW)","type":"number","min":0}]}'),
  ('sewage_pump', 'משאבת ביוב', 'water', false, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"}]}'),
  ('drainage_pump', 'משאבת ניקוז', 'water', false, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"}]}'),
  ('water_tank', 'מאגר מים', 'water', false, '{"fields":[{"key":"volume_m3","label":"נפח (מ\"ק)","type":"number","min":0},{"key":"last_cleaning","label":"ניקוי אחרון","type":"date"}]}'),
  ('generator', 'גנרטור', 'electric', false, '{"fields":[{"key":"power_kva","label":"הספק (kVA)","type":"number","min":0},{"key":"fuel","label":"דלק","type":"select","options":["סולר","גז","אחר"]}]}'),
  ('solar', 'מערכת סולארית', 'electric', false, '{"fields":[{"key":"power_kwp","label":"הספק (kWp)","type":"number","min":0}]}'),
  ('ev_charger', 'עמדת טעינה לרכב חשמלי', 'electric', false, '{"fields":[{"key":"points","label":"נקודות טעינה","type":"number","min":1}]}'),
  ('sprinklers', 'מערכת ספרינקלרים', 'safety', true, '{"fields":[{"key":"coverage","label":"כיסוי","type":"select","options":["כל הבניין","חניון בלבד","חלקי"]}]}'),
  ('smoke_detectors', 'גלאי עשן', 'safety', true, '{"fields":[{"key":"count","label":"כמות","type":"number","min":0}]}'),
  ('fire_panel', 'לוח גילוי אש', 'safety', true, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"}]}'),
  ('fire_extinguishers', 'ארגזי כיבוי ומטפים', 'safety', true, '{"fields":[{"key":"count","label":"כמות","type":"number","min":0}]}'),
  ('smoke_exhaust', 'מערכת שחרור עשן', 'safety', true, '{"fields":[]}'),
  ('emergency_lighting', 'תאורת חירום', 'safety', true, '{"fields":[]}'),
  ('central_gas', 'מערכת גז מרכזית', 'safety', false, '{"fields":[{"key":"supplier","label":"ספק גז","type":"text"}]}'),
  ('hvac_central', 'מיזוג מרכזי', 'hvac', false, '{"fields":[{"key":"system","label":"סוג מערכת","type":"select","options":["VRF","צ''ילרים","אחר"]},{"key":"capacity_tr","label":"תפוקה (TR)","type":"number","min":0}]}'),
  ('ac_unit', 'יחידת מיזוג', 'hvac', false, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"},{"key":"btu","label":"BTU","type":"number","min":0}]}'),
  ('central_boiler', 'דוד מרכזי', 'water', false, '{"fields":[{"key":"volume_l","label":"נפח (ליטר)","type":"number","min":0}]}'),
  ('intercom', 'אינטרקום', 'access', false, '{"fields":[{"key":"manufacturer","label":"יצרן","type":"text"}]}'),
  ('access_control', 'בקרת כניסה', 'access', false, '{"fields":[{"key":"system","label":"מערכת","type":"text"}]}'),
  ('gate', 'שער / מחסום', 'access', false, '{"fields":[{"key":"remote","label":"שלט רחוק","type":"boolean"}]}'),
  ('cctv', 'מצלמות אבטחה', 'access', false, '{"fields":[{"key":"cameras","label":"מספר מצלמות","type":"number","min":0}]}');
