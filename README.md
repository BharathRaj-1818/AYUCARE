# AyuCare - Ayurvedic Diet Management Software 

A comprehensive cloud-based Practice Management & Nutrient Analysis Software for Ayurvedic Dietitians. This application integrates modern nutritional metrics with Ayurvedic dietary principles for holistic patient care.

## Features

### Core Features
- **Patient Management**: Complete patient profiles with Ayurvedic constitution (Prakriti), health conditions, allergies, and lifestyle habits
- **Food Database**: 80+ Ayurvedic foods with nutritional data and traditional properties (Rasa, Virya, Vipaka, Guna, Dosha effects)
- **AI-Powered Diet Charts**: Generate personalized Ayurvedic diet plans using GPT-4 based on patient profiles
- **Recipe Management**: Create and manage recipes with automatic nutrient calculation
- **PDF Reports**: Download printable diet charts for patient handouts

### Ayurvedic Properties Tracked
- **Six Tastes (Rasa)**: Sweet, Sour, Salty, Pungent, Bitter, Astringent
- **Potency (Virya)**: Hot (Ushna), Cold (Sheeta), Neutral
- **Post-digestive Effect (Vipaka)**: Sweet, Sour, Pungent
- **Qualities (Guna)**: Light, Heavy, Oily, Dry
- **Dosha Effects**: Impact on Vata, Pitta, Kapha

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database with Motor async driver
- **OpenAI GPT-4** - AI diet plan generation
- **ReportLab** - PDF generation
- **JWT** - Secure authentication

### Frontend
- **React 19** - UI framework
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **Recharts** - Data visualization
- **React Router** - Navigation

## Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB 5.0+
- OpenAI API Key

## Installation & Setup

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd ayucare
```

### Step 2: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
Create/edit `.env` file in the backend directory:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ayucare_db"
CORS_ORIGINS="*"
OPENAI_API_KEY="your-openai-api-key-here"
JWT_SECRET="your-secret-key-here"
```

5. Start the backend server:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Step 3: Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment variables:
Create/edit `.env` file in the frontend directory:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

4. Start the frontend development server:
```bash
yarn start
```

### Step 4: Access the Application

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login
3. Seed the food database by clicking "Seed Food Database" on the dashboard
4. Start adding patients and creating diet charts!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create patient
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient

### Foods
- `GET /api/foods` - List foods with filters
- `POST /api/foods` - Add new food
- `GET /api/foods/{id}` - Get food details
- `GET /api/foods/categories/list` - Get food categories
- `POST /api/seed/foods` - Seed database with Ayurvedic foods

### Diet Charts
- `GET /api/diet-charts` - List diet charts
- `POST /api/diet-charts` - Create diet chart
- `GET /api/diet-charts/{id}` - Get diet chart
- `DELETE /api/diet-charts/{id}` - Delete diet chart
- `POST /api/ai/generate-diet` - Generate AI diet chart
- `GET /api/diet-charts/{id}/pdf` - Download PDF

### Recipes
- `GET /api/recipes` - List recipes
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/{id}` - Get recipe
- `DELETE /api/recipes/{id}` - Delete recipe

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Usage Guide

### 1. Adding a Patient
1. Go to Patients → Add Patient
2. Fill in basic information (name, age, gender)
3. Add physical metrics (height, weight)
4. Set Ayurvedic profile (Prakriti, Vikriti)
5. Add lifestyle details and medical information
6. Save the patient

### 2. Generating an AI Diet Chart
1. Go to Diet Charts → Create Diet Chart
2. Select a patient
3. Set duration (3-30 days)
4. Optionally set target calories and special requirements
5. Click "Generate Diet Chart"
6. Review the AI-generated plan
7. Download as PDF if needed

### 3. Using the Food Database
1. Go to Food Database
2. If empty, click "Seed Database" to add 80+ Ayurvedic foods
3. Search by name (English/Hindi)
4. Filter by category, taste (Rasa), or temperature (Virya)
5. Click on any food to see detailed Ayurvedic properties

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ui/      # Shadcn UI components
│   │   │   └── Layout.jsx
│   │   ├── context/     # React contexts
│   │   ├── lib/         # Utilities & API
│   │   ├── pages/       # Page components
│   │   ├── App.js       # Main app component
│   │   ├── App.css      # App styles
│   │   └── index.css    # Global styles
│   ├── package.json
│   └── .env             # Frontend environment variables
│
└── README.md
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- CORS configuration
- Environment-based configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create a GitHub issue or contact the development team.

---

Built with care for Ayurvedic practitioners worldwide.
