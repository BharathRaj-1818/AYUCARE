# 🌿 AyuCare — Comprehensive Cloud-Based Ayurvedic Diet Management Software

> **BE Final Year Project** | Problem ID: 25024  
> An intelligent, full-stack Ayurvedic diet management platform for dietitians and patients — powered by Groq AI, built with FastAPI + React.js + MongoDB.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [PWA Support](#pwa-support)
- [Multilingual Support](#multilingual-support)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known Issues & Bug Fixes](#known-issues--bug-fixes)
- [Roadmap](#roadmap)

---

## Overview

AyuCare is a comprehensive cloud-based Ayurvedic diet management system designed for Ayurvedic dietitians and their patients. It combines ancient Ayurvedic principles — Prakriti (body constitution), Ritucharya (seasonal diet), Dosha analysis — with modern AI (Groq) to generate personalized diet plans, track progress, and enable real-time video consultations.

The platform has two distinct portals:
- **Dietitian Portal** — full patient management, diet chart creation, AI-powered diet generation, appointments, herbs database, and analytics.
- **Patient Portal** — PWA-installable mobile app for patients to view their diet charts, track progress, take Prakriti quiz, and join video consultations.

---

## Features

### Dietitian Portal
| Feature | Description |
|---|---|
| 🔐 JWT Authentication | Secure login/register for dietitians |
| 👥 Patient Management | Full CRUD — add, view, edit, delete patients |
| 🍽️ Food Database | 83 seeded Ayurvedic foods with nutrients |
| 📖 Recipe Management | Create and manage Ayurvedic recipes |
| 📋 Diet Chart CRUD | Create personalized diet charts per patient |
| 🤖 AI Diet Generation | Groq AI generates full diet plans from patient profile |
| 🔬 Nutrient Gap Analysis | AI analyzes nutritional deficiencies in diet charts |
| 📄 PDF Export | Download diet charts as formatted PDFs (ReportLab) |
| 🧘 Prakriti Quiz | 20-question Vata/Pitta/Kapha constitution assessment |
| 🌿 Ritucharya Engine | Season-based diet recommendations (6 seasons) |
| 💬 AyuAssist Chatbot | Groq-powered Ayurvedic assistant chatbot |
| 📅 Appointments | Schedule, manage, and conduct video consultations |
| 📹 Video Consultations | jitsi video calls |
| 🌱 Herbs & Supplements | Searchable herbs database with Ayurvedic properties |
| 📧 Email Invite System | Send invite codes + QR codes to patients via Gmail SMTP |
| 📊 Dashboard Analytics | Stats overview — patients, charts, appointments, recipes |

### Patient Portal (PWA)
| Feature | Description |
|---|---|
| 📲 PWA Install | Installable as a mobile app (Android/iOS) |
| 🔐 Patient Auth | Separate JWT auth flow via invite code |
| 🏠 Patient Dashboard | Personalized overview of diet, progress, appointments |
| 📋 View Diet Charts | Access dietitian-assigned diet plans |
| 🧘 Prakriti View | See Prakriti assessment results and Dosha analysis |
| 📈 Progress Tracking | Log daily weight and health notes with chart history |
| 📅 Book Appointments | Request appointments with dietitian |
| 📹 Join Video Calls | One-tap join video consultation |
| 🌍 Multilingual Support | English, Hindi, Telugu, Tamil, Kannada |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI (Python 3.10+), Motor (async MongoDB), JWT (python-jose), bcrypt |
| **AI** | Groq ai |
| **Frontend** | React.js 19, TailwindCSS, Shadcn UI, Recharts, React Router v7 |
| **Database** | MongoDB (via Motor async client) |
| **PDF Generation** | ReportLab |
| **Video Calls** | Jitsi video call |
| **Email** | Gmail SMTP (SSL, port 465) |
| **QR Codes** | `qrcode[pil]` |
| **PWA** | Service Worker + Web App Manifest |
| **Multilingual** | i18next + react-i18next + i18next-browser-languagedetector |
| **Package Manager** | Yarn (frontend), pip (backend) |

---

## Project Structure

```
AYUCARE-2/
│
├── backend/
│   ├── server.py              # Single-file FastAPI application (all routes + models)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables (not committed)
│   ├── .gitignore
│   └── venv/                  # Python virtual environment
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json      # PWA manifest
│   │   ├── service-worker.js  # PWA service worker
│   │   ├── ayucare-icon.svg
│   │   └── icons/             # PWA icons (72x72 to 512x512 PNG)
│   │       ├── 72x72.png
│   │       ├── 96x96.png
│   │       ├── 128x128.png
│   │       ├── 144x144.png
│   │       ├── 152x152.png
│   │       ├── 192x192.png
│   │       ├── 384x384.png
│   │       └── 512x512.png
│   │
│   ├── src/
│   │   ├── App.js             # Root router — all routes defined here
│   │   ├── index.js           # React entry point + i18n init
│   │   ├── App.css
│   │   ├── index.css
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.jsx                  # Dietitian sidebar layout
│   │   │   ├── InviteCodeGenerator.jsx     # QR + Email invite system
│   │   │   ├── PatientProgressTab.jsx      # Progress chart component
│   │   │   ├── LanguageSwitcher.jsx        # Language dropdown (EN/HI/TE/TA/KN)
│   │   │   ├── patient/
│   │   │   │   ├── PatientLayout.jsx       # Patient portal top nav layout
│   │   │   │   └── InstallBanner.jsx       # PWA install prompt banner
│   │   │   └── ui/                         # Shadcn UI component library
│   │   │       └── (accordion, button, card, dialog, table, tabs, toast ...)
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.js              # Dietitian auth state (JWT)
│   │   │   └── PatientPortalContext.js     # Patient auth state (JWT)
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-toast.js               # Toast notification hook
│   │   │   └── usePWA.js                  # PWA install prompt hook
│   │   │
│   │   ├── lib/
│   │   │   ├── api.js                     # Axios instance + all API calls
│   │   │   └── utils.js                   # Utility helpers (cn, formatDate, etc.)
│   │   │
│   │   ├── i18n/                          # Multilingual support
│   │   │   ├── index.js                   # i18next config + language detector
│   │   │   └── locales/
│   │   │       ├── en.json                # English translations
│   │   │       ├── hi.json                # Hindi translations
│   │   │       ├── te.json                # Telugu translations
│   │   │       ├── ta.json                # Tamil translations
│   │   │       └── kn.json                # Kannada translations
│   │   │
│   │   └── pages/
│   │       ├── Dashboard.jsx              # Dietitian dashboard with stats
│   │       ├── Login.jsx                  # Dietitian login
│   │       ├── Register.jsx               # Dietitian registration
│   │       ├── Patients.jsx               # Patient list + search
│   │       ├── PatientDetail.jsx          # Patient profile + invite code gen
│   │       ├── PatientForm.jsx            # Add/edit patient form
│   │       ├── Foods.jsx                  # Food database management
│   │       ├── DietCharts.jsx             # Diet chart list
│   │       ├── DietChartDetail.jsx        # Chart detail + AI analysis
│   │       ├── DietChartForm.jsx          # Create/edit diet chart + AI generate
│   │       ├── Recipes.jsx                # Recipe list
│   │       ├── RecipeDetail.jsx           # Recipe details
│   │       ├── RecipeForm.jsx             # Create/edit recipe
│   │       ├── PrakritiQuiz.jsx           # 20-question Prakriti assessment
│   │       ├── Appointments.jsx           # Appointment management + video
│   │       ├── Herbs.jsx                  # Herbs & supplements database
│   │       ├── Settings.jsx               # Account settings
│   │       └── patient-portal/
│   │           ├── PatientLogin.jsx       # Patient login
│   │           ├── PatientRegister.jsx    # Patient register (auto-fills ?code=)
│   │           ├── PatientDashboard.jsx   # Patient home
│   │           ├── PatientDietCharts.jsx  # View assigned diet charts
│   │           ├── PatientPrakriti.jsx    # View Prakriti results
│   │           ├── PatientProgress.jsx    # Log + view weight progress
│   │           └── PatientAppointments.jsx# Book + join video appointments
│   │
│   ├── plugins/
│   │   └── health-check/
│   │       ├── health-endpoints.js        # Dev health check endpoints
│   │       └── webpack-health-plugin.js   # Webpack plugin for health checks
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   ├── craco.config.js
│   ├── postcss.config.js
│   ├── jsconfig.json
│   └── components.json                    # Shadcn UI config
│
│   ├── plugins/
│   │   └── health-check/
│   │       ├── health-endpoints.js        # Dev health check endpoints
│   │       └── webpack-health-plugin.js   # Webpack plugin for health checks
│   │
├── tests/                     # Test files
├── test_reports/              # Test result reports
├── backend_test.py            # Backend API test script
├── backend_test_results.json  # Test results (JSON)
├── test_result.md             # Test results (Markdown)
├── design_guidelines.json     # UI/UX design guidelines
├── memory/                    # Project memory/context files
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- **Python** 3.10+
- **Node.js** 18+ and **Yarn**
- **MongoDB** (local or MongoDB Atlas cloud)
- **Gmail account** with an App Password (for email invites)
- **Groq API Key** — from (console.groq.com/keys)


---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv venv

# On Windows
venv\Scripts\activate

# On Mac/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Install QR code library (for invite system)
pip install "qrcode[pil]"

# 5. Create your .env file (see Environment Variables section)
```

---

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
yarn install

# 3. Install multilingual packages
yarn add i18next react-i18next i18next-browser-languagedetector

# 4. Create your .env file (see Environment Variables section)
```

> **Note:** If you see a `react-scripts(0.0.0)` error, open `package.json` and change all scripts from `craco start/build/test` to `react-scripts start/build/test`.

---

### Environment Variables

#### `backend/.env`
```env
MONGO_URL=mongodb://localhost:27017          # or your MongoDB Atlas URI
DB_NAME=ayucare
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=ayucare-secret-key-2024
SMTP_EMAIL=youremail@gmail.com               # Gmail address
SMTP_PASSWORD=xxxx xxxx xxxx xxxx           # Gmail App Password (16 chars)
FRONTEND_URL=http://localhost:3000           # change to deployed URL in production
CORS_ORIGINS=*
```

#### `frontend/.env`
```env
REACT_APP_BACKEND_URL=http://localhost:8001

# For mobile testing on the same WiFi network:
# REACT_APP_BACKEND_URL=http://192.168.x.x:8001
```

> **Getting a Gmail App Password:**  
> Google Account → Security → 2-Step Verification → App Passwords → Generate for "Mail".

---

## Running the App

### Start Backend
```bash
cd backend
source venv/bin/activate        # Mac/Linux
# or: venv\Scripts\activate     # Windows

uvicorn server:app --host 0.0.0.0 --port 8001 --reload

```
- Backend: `http://localhost:8001`
- Swagger API Docs: `http://localhost:8001/docs`

### Start Frontend
```bash
cd frontend
yarn start
```
- Frontend: `http://localhost:3000`

### Seed the Database (first run only)
After both servers are running, seed initial data via Swagger UI at `http://localhost:8001/docs` or curl:
```bash
# Seed 83 Ayurvedic foods
curl -X POST http://localhost:8001/api/seed/foods \
  -H "Authorization: Bearer YOUR_DIETITIAN_JWT_TOKEN"

# Seed herbs database
curl -X POST http://localhost:8001/api/herbs/seed \
  -H "Authorization: Bearer YOUR_DIETITIAN_JWT_TOKEN"
```

---

## API Reference

### Authentication (Dietitian)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new dietitian |
| POST | `/api/auth/login` | Login, returns JWT token |
| GET | `/api/auth/me` | Get current dietitian profile |

### Patients
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients/:id` | Get patient details |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |

### Foods & Recipes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/foods` | List all foods |
| POST | `/api/foods` | Add food |
| GET | `/api/recipes` | List all recipes |
| POST | `/api/recipes` | Create recipe |

### Diet Charts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/diet-charts` | List all diet charts |
| POST | `/api/diet-charts` | Create diet chart |
| POST | `/api/ai/generate-diet` | AI-generate a diet chart (Groq) |
| POST | `/api/diet-charts/:id/analyze-nutrients` | AI nutrient gap analysis |
| GET | `/api/diet-charts/:id/pdf` | Download chart as PDF |

### AI & Ayurveda
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ayuchat` | AyuAssist chatbot (Groq) |
| GET | `/api/prakriti/questions` | Get 20 Prakriti quiz questions |
| POST | `/api/prakriti/assess` | Submit quiz, get Dosha result |
| GET | `/api/ritucharya/current` | Get current season diet recommendations |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| PUT | `/api/appointments/:id` | Update appointment |
| DELETE | `/api/appointments/:id` | Delete appointment |
| GET | `/api/appointments/slots/:date` | Get available slots for a date |

### Patient Portal
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/patient-portal/invite` | Generate invite code |
| POST | `/api/patient-portal/invite/send-email` | Send invite email + QR to patient |
| POST | `/api/patient-portal/register` | Patient registration (requires invite code) |
| POST | `/api/patient-portal/login` | Patient login |
| GET | `/api/patient-portal/me` | Get patient profile |
| GET | `/api/patient-portal/dashboard` | Patient dashboard data |
| GET | `/api/patient-portal/diet-charts` | Patient's assigned diet charts |
| GET | `/api/patient-portal/prakriti` | Patient's Prakriti assessment |
| POST | `/api/patient-portal/progress/log` | Log progress entry |
| GET | `/api/patient-portal/progress` | Get progress history |
| GET | `/api/patient-portal/appointments` | Patient's appointments |
| POST | `/api/patient-portal/appointments/request` | Request new appointment |
| DELETE | `/api/patient-portal/appointments/:id/cancel` | Cancel appointment |

### Herbs & Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/herbs` | List all herbs |
| POST | `/api/herbs` | Add herb |
| POST | `/api/herbs/seed` | Seed herb database |
| GET | `/api/dashboard/stats` | Dashboard statistics |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                                                              │
│   ┌──────────────────┐       ┌───────────────────────────┐  │
│   │ Dietitian Portal  │       │    Patient Portal (PWA)   │  │
│   │  (Layout.jsx)     │       │   (PatientLayout.jsx)     │  │
│   └────────┬──────────┘       └──────────┬────────────────┘  │
│            │                             │                   │
│            └──────────────┬──────────────┘                   │
│                           │  api.js (Axios)                  │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────┼──────────────────────────────────┐
│               BACKEND (FastAPI — server.py)                   │
│                           │                                  │
│   ┌───────────────────────▼──────────────────────────────┐   │
│   │                    Route Handlers                     │   │
│   │  Auth | Patients | Foods | Recipes | Diet Charts     │   │
│   │  Prakriti | Ritucharya | Appointments | Herbs        │   │
│   │  Patient Portal | Invite | Progress | AyuChat        │   │
│   └──────────┬─────────────────────────┬─────────────────┘   │
│              │                         │                     │
│   ┌──────────▼──────────┐   ┌──────────▼──────────┐         │
│   │   MongoDB (Motor)   │   │  Groq   │         │
│   │  10 Collections     │   │  AI Diet + Chat     │         │
│   └─────────────────────┘   └─────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### MongoDB Collections
| Collection | Description |
|---|---|
| `users` | Dietitian accounts |
| `patients` | Patient profiles |
| `foods` | Ayurvedic food database |
| `recipes` | Ayurvedic recipes |
| `diet_charts` | Patient diet charts |
| `progress_logs` | Patient weight/health logs |
| `appointments` | Consultation appointments |
| `invite_codes` | Patient invite codes (72hr expiry) |
| `prakriti_assessments` | Dosha quiz results |
| `nutrient_reports` | AI nutrient analysis reports |

### Authentication Flow
- **Dietitian:** JWT stored as `ayucare_token` in localStorage → managed by `AuthContext.js`
- **Patient:** JWT stored as `ayucare_patient_token` in localStorage → managed by `PatientPortalContext.js`
- Both tokens sent as `Authorization: Bearer <token>` headers via the `api.js` Axios instance

---

## PWA Support

AyuCare's patient portal is a fully installable Progressive Web App.

**Key files:**
- `frontend/public/manifest.json` — app name, icons, theme color, display mode
- `frontend/public/service-worker.js` — offline caching strategy
- `frontend/src/components/patient/InstallBanner.jsx` — install prompt UI
- `frontend/src/hooks/usePWA.js` — beforeinstallprompt event handler

**Generate PWA icons from SVG (run once):**
```bash
cd frontend
yarn add sharp --dev
node generate-icons.js
```

**Install on Android:** Open patient portal in Chrome → tap "Add to Home Screen" banner → Install.

**Install on iOS:** Open in Safari → Share → Add to Home Screen.

> HTTPS is required for service workers to work in production. Both Vercel and Render provide HTTPS by default.

---

## Multilingual Support

AyuCare supports **5 languages** across all pages. Language preference is auto-saved to localStorage and persists across sessions and page refreshes.

| Language | Code | Script |
|---|---|---|
| English | `en` | Latin |
| Hindi | `hi` | Devanagari |
| Telugu | `te` | Telugu |
| Tamil | `ta` | Tamil |
| Kannada | `kn` | Kannada |

**Install packages:**
```bash
cd frontend
yarn add i18next react-i18next i18next-browser-languagedetector
```

**Wire into app** — add to top of `frontend/src/index.js`:
```js
import './i18n/index.js';
```

**Use in any component:**
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('nav.dashboard')}</h1>;
}
```

The `<LanguageSwitcher />` component in both layouts switches language globally — all pages update instantly.

---

## Testing

### Backend Tests
```bash
# Run full backend test suite
python backend_test.py

# View results
cat backend_test_results.json
cat test_result.md
```
- **Test Coverage:** 16 test cases with 93.75% success rate (15/16 passing)

### Manual API Testing
Visit Swagger UI at `http://localhost:8001/docs` for interactive endpoint testing.

### Mobile / PWA Testing
To test the patient PWA on a physical phone (same WiFi network):

1. Find your computer's local IP:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update `frontend/.env`:
   ```env
   REACT_APP_BACKEND_URL=http://192.168.x.x:8001
   ```

3. Ensure backend runs with `--host 0.0.0.0`

4. On your phone browser, open: `http://192.168.x.x:3000/patient/login`

---

## Deployment

### Backend — Render

1. Push backend to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `backend/.env` in the Render dashboard
5. Update `FRONTEND_URL` to your Vercel frontend URL

### Frontend — Vercel

1. Push frontend to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   REACT_APP_BACKEND_URL=https://your-app.onrender.com
   ```
5. Deploy — Vercel auto-rebuilds on every push to main

### Post-Deployment Checklist
- [ ] Update `CORS_ORIGINS` in backend `.env` to your Vercel domain
- [ ] Update `FRONTEND_URL` in backend `.env` to your Vercel domain
- [ ] Re-seed foods and herbs after first deploy
- [ ] Test invite email flow end-to-end with production URLs
- [ ] Verify PWA installs correctly on mobile (requires HTTPS)
- [ ] Confirm video consultation works with Jitsi

---

## Known Issues & Bug Fixes

| # | Issue | Fix Applied |
|---|---|---|
| 1 | `get_current_patient` defined twice in `server.py` | Kept single correct version, removed duplicate |
| 2 | `ProgressLogCreate` Pydantic model defined twice | Single model + subclass pattern |
| 3 | `patient_log_progress` and `patient_get_progress` routes defined twice | Deduplicated route handlers |
| 4 | `/patient-portal/invite` using patient token instead of dietitian token | Fixed route detection logic in `api.js` |
| 5 | `/patient/appointments` and `/patient/progress` were unguarded routes | Added auth guards in `App.js` |
| 6 | "My Progress" nav link duplicated in `PatientLayout.jsx` | Removed duplicate nav entry |
| 7 | `localhost:8001` unreachable during mobile testing | Use local IP `192.168.x.x:8001` with `--host 0.0.0.0` |
| 9 | `groq`  model in `server.py` |

---

## Roadmap

| Feature | Effort | Priority | Status |
|---|---|---|---|
| 🔔 Smart Reminders (browser Notification API) | 30 mins | 🔴 High | Pending |
| 🌿 Herb DB upgrade (50+ herbs) | 1 hour | 🟡 Medium | Pending |
| 🌍 Multilingual Support (EN / HI / TE / TA / KN) | 2 hours | 🟢 Low | ✅ Complete |
| 🚀 Deploy (Vercel + Render) | 1 hour | 🔴 High | Pending |

---

## Contributing

This is a Final Year BE project. For suggestions or improvements:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is developed as an academic Final Year Project. All rights reserved.

---

<div align="center">
  <p>Built with 🌿 for Ayurvedic wellness</p>
  <p><strong>AyuCare</strong> — Ancient wisdom, modern technology</p>
</div>

