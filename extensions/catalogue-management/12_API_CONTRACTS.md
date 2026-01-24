EXTENSION: Catalogue Management
ID: EXT-02
ARTEFACT: API Contracts
STATUS: GOVERNANCE DRAFT

PRINCIPLES

- Contracts are read-only definitions
- No business logic in contracts
- No Core imports from Extensions
- requestId is mandatory on all requests
- All responses are JSON

COMMON HEADERS

Request:
- X-Request-Id (string, required)

Response:
- requestId (string, required)

ENDPOINTS

POST /catalogue/draft/create
Purpose:
- Create a new catalogue draft

Request Body:
{
  "supplierId": "string"
}

Response 201:
{
  "catalogueDraftId": "string",
  "status": "DRAFT",
  "requestId": "string"
}

---

POST /catalogue/draft/submit
Purpose:
- Submit a draft catalogue for approval

Request Body:
{
  "catalogueDraftId": "string"
}

Response 200:
{
  "catalogueDraftId": "string",
  "status": "SUBMITTED",
  "requestId": "string"
}

---

POST /catalogue/approve
Purpose:
- Approve a submitted catalogue

Request Body:
{
  "catalogueDraftId": "string"
}

Response 200:
{
  "catalogueDraftId": "string",
  "status": "APPROVED",
  "requestId": "string"
}

---

POST /catalogue/publish
Purpose:
- Publish an approved catalogue

Request Body:
{
  "catalogueId": "string"
}

Response 200:
{
  "catalogueId": "string",
  "status": "PUBLISHED",
  "requestId": "string"
}

ERROR RESPONSES

403 AUTH_DENIED
{
  "error": "AUTH_DENIED",
  "message": "Access denied",
  "requestId": "string"
}

400 INVALID_REQUEST
{
  "error": "INVALID_REQUEST",
  "message": "Invalid input",
  "requestId": "string"
}

500 INTERNAL_ERROR
{
  "error": "INTERNAL_ERROR",
  "message": "Unexpected error",
  "requestId": "string"
}
