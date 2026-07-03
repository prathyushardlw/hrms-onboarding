# HRMS Onboarding — Backend

Next.js API-only server. Handles authentication, data storage (MongoDB), PDF generation, and email.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your values
npm run dev   # starts on http://localhost:3001
```

## Environment Variables

See `.env.example` for all required variables.

## Key Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `KAKA_EMAIL_SERVICE_KEY` | Kaka email service API key |
| `LABSQUIRE_FROM_EMAIL` | Sender email address |
| `NEXT_PUBLIC_BASE_URL` | Frontend URL (used in email links) |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |

## Data Storage

Uploaded files are stored in `data/` (created automatically):
- `data/templates/` — uploaded template PDFs
- `data/uploads/{onboardingId}/` — signed/filled documents
- `data/resumes/{candidateId}/` — candidate resumes
- `data/offers/{offerId}.pdf` — generated offer letters

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/register` | Register |
| `POST` | `/api/auth/switch-company` | Switch active company |
| `GET/POST` | `/api/templates` | List / create templates |
| `GET/PATCH/DELETE` | `/api/templates/:id` | Template detail |
| `POST` | `/api/templates/:id/upload` | Upload template PDF |
| `GET` | `/api/templates/:id/pdf` | Serve template PDF |
| `GET` | `/api/templates/:id/detect-fields` | Auto-detect PDF fields |
| `GET/POST` | `/api/onboarding` | List / create onboardings |
| `GET/PATCH` | `/api/onboarding/:id` | Onboarding detail |
| `POST` | `/api/onboarding/:id/send` | Send portal link email |
| `POST` | `/api/onboarding/:id/remind` | Send reminder email |
| `POST` | `/api/onboarding/:id/status` | Update status |
| `GET` | `/api/onboarding/:id/audit` | Audit log |
| `GET` | `/api/onboarding/:id/document/:docId/pdf` | Serve signed document PDF |
| `GET` | `/api/candidate/:token` | Candidate portal data |
| `POST` | `/api/candidate/:token/document/:docId` | Sign / fill+sign / upload document |
| `GET` | `/api/candidate/:token/document/:docId/fields` | Form fields for document |
| `GET` | `/api/candidate/:token/document/:docId/pdf` | PDF for candidate viewing |
| `GET/POST` | `/api/jobs` | Jobs |
| `GET/POST` | `/api/candidates` | Candidates |
| `GET/POST` | `/api/employees` | Employees |
| `GET/POST` | `/api/doc-rules` | Document rules by employment type |
| `GET/POST` | `/api/companies` | Companies |
