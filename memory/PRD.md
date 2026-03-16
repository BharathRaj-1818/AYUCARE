# AyuCare - Product Requirements Document

## Project Overview
AyuCare is a comprehensive cloud-based Practice Management & Nutrient Analysis Software for Ayurvedic Dietitians. It integrates modern nutritional metrics with Ayurvedic dietary principles.

## Original Problem Statement
Build a dedicated Ayurvedic Diet Management Software to efficiently create, manage, and organize patient-specific diet charts with accuracy and ease. Unlike conventional nutrition tools, integrate modern nutritional metrics with Ayurvedic dietary principles—such as caloric value, food properties (Hot/Cold, Easy/Difficult to digest), and the six tastes (Rasa).

## User Personas
1. **Ayurvedic Dietitian/Practitioner** - Primary user who creates diet plans
2. **Ayurvedic Hospital Staff** - Manage multiple patients
3. **Nutritionists** - Focus on nutrient analysis

## Core Requirements (Static)
- [x] Patient management with Ayurvedic profiles (Prakriti, Vikriti)
- [x] Food database with 8000+ items (starting with 83)
- [x] Ayurvedic food properties (Rasa, Virya, Vipaka, Guna, Dosha effects)
- [x] AI-powered diet chart generation
- [x] PDF report generation
- [x] Secure authentication (JWT)
- [x] Mobile-responsive design

## What's Been Implemented (v1.0 - March 10, 2026)

### Backend (FastAPI + MongoDB)
- [x] User authentication (register, login, JWT)
- [x] Patient CRUD with full Ayurvedic profile
- [x] Food database with 83 Ayurvedic foods
- [x] Recipe management with nutrient calculation
- [x] Diet chart CRUD
- [x] AI diet generation using OpenAI GPT-4
- [x] PDF generation using ReportLab
- [x] Dashboard statistics API

### Frontend (React + Tailwind + Shadcn)
- [x] Login/Register pages
- [x] Dashboard with stats and charts
- [x] Patient list and detail pages
- [x] Patient form with all Ayurvedic fields
- [x] Food database with search/filter
- [x] Food detail modal
- [x] Diet charts list and detail
- [x] AI diet generation form
- [x] Recipes page
- [x] Settings page
- [x] Responsive sidebar navigation

### Design
- [x] Traditional Ayurvedic green theme
- [x] Merriweather (serif) + Manrope (sans) fonts
- [x] Earthy color palette (#2F5233 primary)
- [x] Mobile-responsive layout

## Prioritized Backlog

### P0 (Critical - Blocking)
- [ ] OpenAI API quota monitoring/billing (user's key needs credits)

### P1 (High Priority)
- [ ] Expand food database to 500+ items
- [ ] Recipe creation form with ingredient picker
- [ ] Recipe detail page
- [ ] Manual diet chart creation (without AI)
- [ ] Diet chart editing

### P2 (Medium Priority)
- [ ] Patient photo upload
- [ ] Food image display
- [ ] Export patient data
- [ ] Bulk patient import
- [ ] Diet chart templates
- [ ] Meal reminders

### P3 (Nice to Have)
- [ ] Multi-language support (Hindi UI)
- [ ] Patient mobile app
- [ ] Integration with health devices
- [ ] Video consultations
- [ ] Payment integration for subscriptions

## Tech Stack
- **Backend**: FastAPI, MongoDB, OpenAI GPT-4, ReportLab
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Recharts
- **Auth**: JWT with bcrypt
- **Deployment**: Docker/Kubernetes ready

## API Endpoints Summary
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Patients: `/api/patients` (CRUD)
- Foods: `/api/foods`, `/api/seed/foods`
- Recipes: `/api/recipes` (CRUD)
- Diet Charts: `/api/diet-charts`, `/api/ai/generate-diet`, `/api/diet-charts/{id}/pdf`
- Dashboard: `/api/dashboard/stats`

## Next Tasks
1. Add more foods to seed database (expand to 500+)
2. Implement recipe creation form
3. Add manual diet chart creation
4. Implement diet chart editing
5. Add patient photo upload
