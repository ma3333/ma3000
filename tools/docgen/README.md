# docgen

Generates the Hebrew (RTL) Word deliverables in `deliverables/`.

```bash
cd tools/docgen
node requirements.js ../../deliverables/01-מסמך-דרישות.docx
node devplan.js      ../../deliverables/02-תכנית-פיתוח.docx
node bizplan.js      ../../deliverables/03-תכנית-עסקית.docx
```

Requires the `docx` npm package. Shared RTL layout helpers live in `lib.js`.
The business-plan financial model is computed in `bizplan.js` (edit the assumption arrays at the top).
