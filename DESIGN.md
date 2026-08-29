Problem: Widget owners need a secure, scalable way to capture leads from any website without 
         trusting the client.

Data Model:

    Widget: id, tenantId, type, title, description, fields (JSON), buttonText, displayOptions, createdAt.

    Submission: id, widgetId, tenantId, data (JSON), ip, geo (country, city, lat, lon), status, createdAt.

    Tenant: each owner has a unique API key.

API Surface:

    POST /api/widgets (create), GET /api/widgets (list), PUT /api/widgets/:id, DELETE /api/widgets/:id (authenticated)

    GET /widget.js?id=<widgetId> – public script

    GET /api/widgets/:id/config – public config (cached)

    POST /api/submissions – public, CORS‑enabled

    GET /api/dashboard/submissions – authenticated stats

Layer Sketch: Express middleware → Controllers → Services → Data Access.

Non‑goal: No real domain, no real CDN, no payment, minimal frontend.