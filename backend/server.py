from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from openai import AsyncOpenAI
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch
import json
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client
openai_client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'ayucare-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="AyuCare API", description="Ayurvedic Diet Management Software")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "dietitian"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    prakriti: Optional[str] = None  # Vata, Pitta, Kapha or combinations
    vikriti: Optional[str] = None   # Current imbalance
    dietary_habits: Optional[str] = None
    meal_frequency: Optional[int] = 3
    bowel_movements: Optional[str] = None
    water_intake_liters: Optional[float] = None
    sleep_hours: Optional[float] = None
    allergies: Optional[List[str]] = []
    health_conditions: Optional[List[str]] = []
    medications: Optional[List[str]] = []
    notes: Optional[str] = None

class PatientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    prakriti: Optional[str] = None
    vikriti: Optional[str] = None
    dietary_habits: Optional[str] = None
    meal_frequency: Optional[int] = 3
    bowel_movements: Optional[str] = None
    water_intake_liters: Optional[float] = None
    sleep_hours: Optional[float] = None
    allergies: Optional[List[str]] = []
    health_conditions: Optional[List[str]] = []
    medications: Optional[List[str]] = []
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    user_id: str

class FoodCreate(BaseModel):
    name: str
    name_hindi: Optional[str] = None
    category: str  # Grains, Vegetables, Fruits, Dairy, Proteins, Spices, Oils, etc.
    calories: float  # per 100g
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    # Ayurvedic properties
    rasa: List[str] = []  # Sweet, Sour, Salty, Pungent, Bitter, Astringent
    virya: str = "Neutral"  # Hot (Ushna), Cold (Sheeta), Neutral
    vipaka: str = "Sweet"  # Post-digestive effect: Sweet, Sour, Pungent
    guna: List[str] = []  # Light (Laghu), Heavy (Guru), Oily (Snigdha), Dry (Ruksha)
    dosha_effect: Dict[str, str] = {}  # {"vata": "increases", "pitta": "decreases", "kapha": "neutral"}
    # Micronutrients
    vitamin_a_mcg: float = 0
    vitamin_c_mg: float = 0
    vitamin_d_mcg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0
    potassium_mg: float = 0
    sodium_mg: float = 0
    # Additional info
    serving_size_g: float = 100
    is_vegetarian: bool = True
    is_vegan: bool = False
    is_gluten_free: bool = False
    season_best: Optional[List[str]] = []
    description: Optional[str] = None

class FoodResponse(FoodCreate):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str

class RecipeCreate(BaseModel):
    name: str
    name_hindi: Optional[str] = None
    description: Optional[str] = None
    category: str  # Breakfast, Lunch, Dinner, Snack
    cuisine: str = "Indian"
    ingredients: List[Dict[str, Any]]  # [{"food_id": "...", "quantity_g": 100}]
    instructions: Optional[List[str]] = []
    prep_time_mins: int = 0
    cook_time_mins: int = 0
    servings: int = 1
    dosha_suitable: List[str] = []  # Vata, Pitta, Kapha
    health_benefits: Optional[List[str]] = []
    image_url: Optional[str] = None

class RecipeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    name_hindi: Optional[str] = None
    description: Optional[str] = None
    category: str
    cuisine: str
    ingredients: List[Dict[str, Any]]
    instructions: List[str]
    prep_time_mins: int
    cook_time_mins: int
    servings: int
    dosha_suitable: List[str]
    health_benefits: List[str]
    image_url: Optional[str] = None
    total_nutrients: Dict[str, float]
    created_at: str
    user_id: str

class DietChartCreate(BaseModel):
    patient_id: str
    title: str
    start_date: str
    end_date: str
    target_calories: Optional[int] = None
    notes: Optional[str] = None
    meals: Optional[List[Dict[str, Any]]] = []  # Will be filled by AI or manually

class DietChartResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    title: str
    start_date: str
    end_date: str
    target_calories: Optional[int] = None
    notes: Optional[str] = None
    meals: List[Dict[str, Any]]
    total_daily_nutrients: Dict[str, float]
    created_at: str
    user_id: str

class AIGenerateRequest(BaseModel):
    patient_id: str
    duration_days: int = 7
    target_calories: Optional[int] = None
    specific_requirements: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"]
    )

# ==================== PATIENT ROUTES ====================

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, user: dict = Depends(get_current_user)):
    patient_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate BMI if height and weight provided
    bmi = None
    if patient.height_cm and patient.weight_kg:
        height_m = patient.height_cm / 100
        bmi = round(patient.weight_kg / (height_m ** 2), 1)
    
    patient_doc = {
        "id": patient_id,
        **patient.model_dump(),
        "bmi": bmi,
        "created_at": now,
        "updated_at": now,
        "user_id": user["id"]
    }
    
    await db.patients.insert_one(patient_doc)
    return PatientResponse(**{k: v for k, v in patient_doc.items() if k != "_id"})

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(
    search: Optional[str] = None,
    prakriti: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    if prakriti:
        query["prakriti"] = prakriti
    
    patients = await db.patients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [PatientResponse(**p) for p in patients]

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id, "user_id": user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientResponse(**patient)

@api_router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient: PatientCreate, user: dict = Depends(get_current_user)):
    existing = await db.patients.find_one({"id": patient_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Recalculate BMI
    bmi = None
    if patient.height_cm and patient.weight_kg:
        height_m = patient.height_cm / 100
        bmi = round(patient.weight_kg / (height_m ** 2), 1)
    
    update_data = {
        **patient.model_dump(),
        "bmi": bmi,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    updated = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return PatientResponse(**updated)

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, user: dict = Depends(get_current_user)):
    result = await db.patients.delete_one({"id": patient_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}

# ==================== FOOD ROUTES ====================

@api_router.post("/foods", response_model=FoodResponse)
async def create_food(food: FoodCreate, user: dict = Depends(get_current_user)):
    food_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    food_doc = {
        "id": food_id,
        **food.model_dump(),
        "created_at": now
    }
    
    await db.foods.insert_one(food_doc)
    return FoodResponse(**{k: v for k, v in food_doc.items() if k != "_id"})

@api_router.get("/foods", response_model=List[FoodResponse])
async def get_foods(
    search: Optional[str] = None,
    category: Optional[str] = None,
    rasa: Optional[str] = None,
    virya: Optional[str] = None,
    dosha: Optional[str] = None,
    is_vegetarian: Optional[bool] = None,
    limit: int = 100,
    skip: int = 0
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"name_hindi": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    if rasa:
        query["rasa"] = rasa
    if virya:
        query["virya"] = virya
    if dosha:
        query[f"dosha_effect.{dosha.lower()}"] = {"$in": ["decreases", "balances"]}
    if is_vegetarian is not None:
        query["is_vegetarian"] = is_vegetarian
    
    foods = await db.foods.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return [FoodResponse(**f) for f in foods]

@api_router.get("/foods/{food_id}", response_model=FoodResponse)
async def get_food(food_id: str):
    food = await db.foods.find_one({"id": food_id}, {"_id": 0})
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    return FoodResponse(**food)

@api_router.get("/foods/categories/list")
async def get_food_categories():
    categories = await db.foods.distinct("category")
    return {"categories": categories}

# ==================== RECIPE ROUTES ====================

@api_router.post("/recipes", response_model=RecipeResponse)
async def create_recipe(recipe: RecipeCreate, user: dict = Depends(get_current_user)):
    recipe_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate total nutrients from ingredients
    total_nutrients = {
        "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0
    }
    
    for ing in recipe.ingredients:
        food = await db.foods.find_one({"id": ing.get("food_id")}, {"_id": 0})
        if food:
            ratio = ing.get("quantity_g", 100) / 100
            total_nutrients["calories"] += food.get("calories", 0) * ratio
            total_nutrients["protein_g"] += food.get("protein_g", 0) * ratio
            total_nutrients["carbs_g"] += food.get("carbs_g", 0) * ratio
            total_nutrients["fat_g"] += food.get("fat_g", 0) * ratio
            total_nutrients["fiber_g"] += food.get("fiber_g", 0) * ratio
    
    # Round values
    for key in total_nutrients:
        total_nutrients[key] = round(total_nutrients[key], 1)
    
    recipe_doc = {
        "id": recipe_id,
        **recipe.model_dump(),
        "total_nutrients": total_nutrients,
        "created_at": now,
        "user_id": user["id"]
    }
    
    await db.recipes.insert_one(recipe_doc)
    return RecipeResponse(**{k: v for k, v in recipe_doc.items() if k != "_id"})

@api_router.get("/recipes", response_model=List[RecipeResponse])
async def get_recipes(
    category: Optional[str] = None,
    dosha: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    if category:
        query["category"] = category
    if dosha:
        query["dosha_suitable"] = dosha
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [RecipeResponse(**r) for r in recipes]

@api_router.get("/recipes/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return RecipeResponse(**recipe)

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    result = await db.recipes.delete_one({"id": recipe_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted successfully"}

# ==================== DIET CHART ROUTES ====================

@api_router.post("/diet-charts", response_model=DietChartResponse)
async def create_diet_chart(chart: DietChartCreate, user: dict = Depends(get_current_user)):
    # Verify patient exists
    patient = await db.patients.find_one({"id": chart.patient_id, "user_id": user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    chart_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate daily nutrients if meals provided
    total_daily = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0}
    
    chart_doc = {
        "id": chart_id,
        **chart.model_dump(),
        "patient_name": patient.get("name"),
        "total_daily_nutrients": total_daily,
        "created_at": now,
        "user_id": user["id"]
    }
    
    await db.diet_charts.insert_one(chart_doc)
    return DietChartResponse(**{k: v for k, v in chart_doc.items() if k != "_id"})

@api_router.get("/diet-charts", response_model=List[DietChartResponse])
async def get_diet_charts(
    patient_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    if patient_id:
        query["patient_id"] = patient_id
    
    charts = await db.diet_charts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DietChartResponse(**c) for c in charts]

@api_router.get("/diet-charts/{chart_id}", response_model=DietChartResponse)
async def get_diet_chart(chart_id: str, user: dict = Depends(get_current_user)):
    chart = await db.diet_charts.find_one({"id": chart_id, "user_id": user["id"]}, {"_id": 0})
    if not chart:
        raise HTTPException(status_code=404, detail="Diet chart not found")
    return DietChartResponse(**chart)

@api_router.delete("/diet-charts/{chart_id}")
async def delete_diet_chart(chart_id: str, user: dict = Depends(get_current_user)):
    result = await db.diet_charts.delete_one({"id": chart_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diet chart not found")
    return {"message": "Diet chart deleted successfully"}

# ==================== AI GENERATION ====================

@api_router.post("/ai/generate-diet", response_model=DietChartResponse)
async def generate_diet_with_ai(request: AIGenerateRequest, user: dict = Depends(get_current_user)):
    # Get patient details
    patient = await db.patients.find_one({"id": request.patient_id, "user_id": user["id"]}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get available foods for reference
    foods = await db.foods.find({}, {"_id": 0, "name": 1, "category": 1, "calories": 1, "rasa": 1, "virya": 1, "dosha_effect": 1}).to_list(100)
    foods_summary = [{"name": f["name"], "category": f["category"], "calories": f.get("calories", 0)} for f in foods[:50]]
    
    # Build AI prompt
    prompt = f"""You are an expert Ayurvedic dietitian. Create a personalized {request.duration_days}-day diet plan for the following patient:

Patient Profile:
- Name: {patient.get('name')}
- Age: {patient.get('age')} years
- Gender: {patient.get('gender')}
- Prakriti (Constitution): {patient.get('prakriti', 'Unknown')}
- Vikriti (Current Imbalance): {patient.get('vikriti', 'None')}
- BMI: {patient.get('bmi', 'Unknown')}
- Dietary Habits: {patient.get('dietary_habits', 'Not specified')}
- Meal Frequency: {patient.get('meal_frequency', 3)} meals/day
- Health Conditions: {', '.join(patient.get('health_conditions', [])) or 'None'}
- Allergies: {', '.join(patient.get('allergies', [])) or 'None'}
- Target Calories: {request.target_calories or 'Calculate based on profile'}
- Special Requirements: {request.specific_requirements or 'None'}

Available Foods Reference: {json.dumps(foods_summary[:30])}

Create a diet plan following Ayurvedic principles:
1. Balance the doshas based on prakriti and vikriti
2. Include all six rasas (tastes) appropriately
3. Consider virya (hot/cold) properties
4. Include seasonal and easily digestible foods
5. Provide specific portion sizes

Return a JSON object with this exact structure:
{{
    "title": "Diet Plan Title",
    "target_calories": <number>,
    "notes": "Brief Ayurvedic explanation",
    "meals": [
        {{
            "day": 1,
            "breakfast": {{"time": "7:00 AM", "items": ["item1 (portion)", "item2 (portion)"], "calories": 300}},
            "mid_morning": {{"time": "10:00 AM", "items": ["item"], "calories": 100}},
            "lunch": {{"time": "12:30 PM", "items": ["item1", "item2", "item3"], "calories": 500}},
            "evening_snack": {{"time": "4:00 PM", "items": ["item"], "calories": 150}},
            "dinner": {{"time": "7:00 PM", "items": ["item1", "item2"], "calories": 400}}
        }}
    ]
}}

Return ONLY valid JSON, no additional text."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert Ayurvedic dietitian. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        ai_response = response.choices[0].message.content
        # Clean response - remove markdown code blocks if present
        if ai_response.startswith("```"):
            ai_response = ai_response.split("```")[1]
            if ai_response.startswith("json"):
                ai_response = ai_response[4:]
        ai_response = ai_response.strip()
        
        diet_plan = json.loads(ai_response)
        
        # Create diet chart
        chart_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Calculate date range
        start_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        end_date = (datetime.now(timezone.utc) + timedelta(days=request.duration_days)).strftime("%Y-%m-%d")
        
        # Calculate average daily nutrients
        total_daily = {"calories": diet_plan.get("target_calories", 1800), "protein_g": 60, "carbs_g": 250, "fat_g": 50, "fiber_g": 25}
        
        chart_doc = {
            "id": chart_id,
            "patient_id": request.patient_id,
            "patient_name": patient.get("name"),
            "title": diet_plan.get("title", f"AI Diet Plan for {patient.get('name')}"),
            "start_date": start_date,
            "end_date": end_date,
            "target_calories": diet_plan.get("target_calories"),
            "notes": diet_plan.get("notes", ""),
            "meals": diet_plan.get("meals", []),
            "total_daily_nutrients": total_daily,
            "created_at": now,
            "user_id": user["id"],
            "ai_generated": True
        }
        
        await db.diet_charts.insert_one(chart_doc)
        return DietChartResponse(**{k: v for k, v in chart_doc.items() if k != "_id"})
        
    except json.JSONDecodeError as e:
        logger.error(f"AI response JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"AI generation error: {error_msg}")
        
        # Check for specific OpenAI errors
        if "quota" in error_msg.lower() or "rate_limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=429, 
                detail="OpenAI API quota exceeded. Please check your API key billing or try again later."
            )
        elif "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=401, 
                detail="OpenAI API authentication failed. Please check your API key configuration."
            )
        else:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {error_msg}")

# ==================== PDF GENERATION ====================

@api_router.get("/diet-charts/{chart_id}/pdf")
async def generate_diet_chart_pdf(chart_id: str, user: dict = Depends(get_current_user)):
    chart = await db.diet_charts.find_one({"id": chart_id, "user_id": user["id"]}, {"_id": 0})
    if not chart:
        raise HTTPException(status_code=404, detail="Diet chart not found")
    
    patient = await db.patients.find_one({"id": chart["patient_id"]}, {"_id": 0})
    
    # Create PDF
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    doc = SimpleDocTemplate(temp_file.name, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=18, textColor=colors.HexColor('#2F5233'), spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#2F5233'), spaceAfter=10)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, spaceAfter=5)
    
    elements = []
    
    # Header
    elements.append(Paragraph("AyuCare - Ayurvedic Diet Chart", title_style))
    elements.append(Paragraph(chart.get("title", "Diet Plan"), heading_style))
    elements.append(Spacer(1, 10))
    
    # Patient Info
    if patient:
        patient_info = f"""
        <b>Patient:</b> {patient.get('name', 'N/A')}<br/>
        <b>Age/Gender:</b> {patient.get('age', 'N/A')} years / {patient.get('gender', 'N/A')}<br/>
        <b>Prakriti:</b> {patient.get('prakriti', 'N/A')}<br/>
        <b>Duration:</b> {chart.get('start_date', 'N/A')} to {chart.get('end_date', 'N/A')}<br/>
        <b>Target Calories:</b> {chart.get('target_calories', 'N/A')} kcal/day
        """
        elements.append(Paragraph(patient_info, normal_style))
        elements.append(Spacer(1, 15))
    
    # Notes
    if chart.get("notes"):
        elements.append(Paragraph("<b>Ayurvedic Notes:</b>", heading_style))
        elements.append(Paragraph(chart.get("notes"), normal_style))
        elements.append(Spacer(1, 15))
    
    # Meals Table
    for meal_day in chart.get("meals", []):
        day_num = meal_day.get("day", 1)
        elements.append(Paragraph(f"<b>Day {day_num}</b>", heading_style))
        
        table_data = [["Meal", "Time", "Items", "Calories"]]
        
        for meal_type in ["breakfast", "mid_morning", "lunch", "evening_snack", "dinner"]:
            meal = meal_day.get(meal_type, {})
            if meal:
                items = ", ".join(meal.get("items", []))[:50]
                table_data.append([
                    meal_type.replace("_", " ").title(),
                    meal.get("time", ""),
                    items,
                    str(meal.get("calories", ""))
                ])
        
        if len(table_data) > 1:
            table = Table(table_data, colWidths=[80, 60, 280, 50])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2F5233')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F2F7F4')),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#C3DBC9')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 15))
    
    # Footer
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"<i>Generated by AyuCare on {datetime.now().strftime('%Y-%m-%d %H:%M')}</i>", normal_style))
    
    doc.build(elements)
    
    return FileResponse(
        temp_file.name,
        media_type="application/pdf",
        filename=f"diet_chart_{chart_id[:8]}.pdf"
    )

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    patient_count = await db.patients.count_documents({"user_id": user["id"]})
    chart_count = await db.diet_charts.count_documents({"user_id": user["id"]})
    recipe_count = await db.recipes.count_documents({"user_id": user["id"]})
    food_count = await db.foods.count_documents({})
    
    # Recent patients
    recent_patients = await db.patients.find(
        {"user_id": user["id"]}, {"_id": 0, "id": 1, "name": 1, "prakriti": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Recent charts
    recent_charts = await db.diet_charts.find(
        {"user_id": user["id"]}, {"_id": 0, "id": 1, "title": 1, "patient_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Prakriti distribution
    prakriti_pipeline = [
        {"$match": {"user_id": user["id"], "prakriti": {"$ne": None}}},
        {"$group": {"_id": "$prakriti", "count": {"$sum": 1}}}
    ]
    prakriti_dist = await db.patients.aggregate(prakriti_pipeline).to_list(10)
    
    return {
        "patient_count": patient_count,
        "chart_count": chart_count,
        "recipe_count": recipe_count,
        "food_count": food_count,
        "recent_patients": recent_patients,
        "recent_charts": recent_charts,
        "prakriti_distribution": prakriti_dist
    }

# ==================== SEED DATA ====================

@api_router.post("/seed/foods")
async def seed_foods_database():
    """Seed the database with Ayurvedic food items"""
    existing_count = await db.foods.count_documents({})
    if existing_count > 50:
        return {"message": f"Database already has {existing_count} foods", "seeded": False}
    
    foods = [
        # Grains
        {"name": "Rice (White)", "name_hindi": "चावल", "category": "Grains", "calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3, "fiber_g": 0.4, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Soft"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Rice (Brown)", "name_hindi": "ब्राउन चावल", "category": "Grains", "calories": 112, "protein_g": 2.3, "carbs_g": 24, "fat_g": 0.8, "fiber_g": 1.8, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Wheat", "name_hindi": "गेहूं", "category": "Grains", "calories": 340, "protein_g": 13, "carbs_g": 72, "fat_g": 2.5, "fiber_g": 12, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False},
        {"name": "Oats", "name_hindi": "जई", "category": "Grains", "calories": 389, "protein_g": 16.9, "carbs_g": 66, "fat_g": 6.9, "fiber_g": 10.6, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False},
        {"name": "Quinoa", "name_hindi": "क्विनोआ", "category": "Grains", "calories": 120, "protein_g": 4.4, "carbs_g": 21, "fat_g": 1.9, "fiber_g": 2.8, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Millet (Bajra)", "name_hindi": "बाजरा", "category": "Grains", "calories": 378, "protein_g": 11, "carbs_g": 73, "fat_g": 4.2, "fiber_g": 8.5, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Barley", "name_hindi": "जौ", "category": "Grains", "calories": 354, "protein_g": 12.5, "carbs_g": 73.5, "fat_g": 2.3, "fiber_g": 17.3, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": False},
        
        # Lentils & Legumes
        {"name": "Moong Dal (Green Gram)", "name_hindi": "मूंग दाल", "category": "Lentils", "calories": 347, "protein_g": 24, "carbs_g": 63, "fat_g": 1.2, "fiber_g": 16, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Soft"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Toor Dal (Pigeon Pea)", "name_hindi": "तूर दाल", "category": "Lentils", "calories": 343, "protein_g": 22, "carbs_g": 63, "fat_g": 1.5, "fiber_g": 15, "rasa": ["Sweet", "Astringent"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "neutral", "pitta": "neutral", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Masoor Dal (Red Lentils)", "name_hindi": "मसूर दाल", "category": "Lentils", "calories": 352, "protein_g": 25, "carbs_g": 60, "fat_g": 1.1, "fiber_g": 11, "rasa": ["Sweet", "Astringent"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "increases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Chana Dal (Bengal Gram)", "name_hindi": "चना दाल", "category": "Lentils", "calories": 360, "protein_g": 20, "carbs_g": 60, "fat_g": 5, "fiber_g": 18, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Urad Dal (Black Gram)", "name_hindi": "उड़द दाल", "category": "Lentils", "calories": 341, "protein_g": 25, "carbs_g": 59, "fat_g": 1.4, "fiber_g": 18, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Rajma (Kidney Beans)", "name_hindi": "राजमा", "category": "Lentils", "calories": 333, "protein_g": 24, "carbs_g": 60, "fat_g": 0.8, "fiber_g": 25, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Chickpeas", "name_hindi": "छोले", "category": "Lentils", "calories": 364, "protein_g": 19, "carbs_g": 61, "fat_g": 6, "fiber_g": 17, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Vegetables
        {"name": "Spinach", "name_hindi": "पालक", "category": "Vegetables", "calories": 23, "protein_g": 2.9, "carbs_g": 3.6, "fat_g": 0.4, "fiber_g": 2.2, "rasa": ["Astringent", "Bitter"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "vitamin_a_mcg": 469, "vitamin_c_mg": 28, "iron_mg": 2.7, "calcium_mg": 99, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Bottle Gourd (Lauki)", "name_hindi": "लौकी", "category": "Vegetables", "calories": 14, "protein_g": 0.6, "carbs_g": 3.4, "fat_g": 0.1, "fiber_g": 0.5, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Soft"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Bitter Gourd (Karela)", "name_hindi": "करेला", "category": "Vegetables", "calories": 17, "protein_g": 1, "carbs_g": 3.7, "fat_g": 0.2, "fiber_g": 2.8, "rasa": ["Bitter"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Okra (Bhindi)", "name_hindi": "भिंडी", "category": "Vegetables", "calories": 33, "protein_g": 1.9, "carbs_g": 7.5, "fat_g": 0.2, "fiber_g": 3.2, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Slimy"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Eggplant (Brinjal)", "name_hindi": "बैंगन", "category": "Vegetables", "calories": 25, "protein_g": 1, "carbs_g": 6, "fat_g": 0.2, "fiber_g": 3, "rasa": ["Bitter", "Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Potato", "name_hindi": "आलू", "category": "Vegetables", "calories": 77, "protein_g": 2, "carbs_g": 17, "fat_g": 0.1, "fiber_g": 2.2, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Sweet Potato", "name_hindi": "शकरकंद", "category": "Vegetables", "calories": 86, "protein_g": 1.6, "carbs_g": 20, "fat_g": 0.1, "fiber_g": 3, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "vitamin_a_mcg": 709, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Carrot", "name_hindi": "गाजर", "category": "Vegetables", "calories": 41, "protein_g": 0.9, "carbs_g": 10, "fat_g": 0.2, "fiber_g": 2.8, "rasa": ["Sweet", "Bitter"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "neutral", "kapha": "decreases"}, "vitamin_a_mcg": 835, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Tomato", "name_hindi": "टमाटर", "category": "Vegetables", "calories": 18, "protein_g": 0.9, "carbs_g": 3.9, "fat_g": 0.2, "fiber_g": 1.2, "rasa": ["Sour", "Sweet"], "virya": "Hot", "vipaka": "Sour", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "vitamin_c_mg": 14, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cucumber", "name_hindi": "खीरा", "category": "Vegetables", "calories": 15, "protein_g": 0.7, "carbs_g": 3.6, "fat_g": 0.1, "fiber_g": 0.5, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cauliflower", "name_hindi": "फूलगोभी", "category": "Vegetables", "calories": 25, "protein_g": 1.9, "carbs_g": 5, "fat_g": 0.3, "fiber_g": 2, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "vitamin_c_mg": 48, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cabbage", "name_hindi": "पत्तागोभी", "category": "Vegetables", "calories": 25, "protein_g": 1.3, "carbs_g": 6, "fat_g": 0.1, "fiber_g": 2.5, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Pumpkin", "name_hindi": "कद्दू", "category": "Vegetables", "calories": 26, "protein_g": 1, "carbs_g": 7, "fat_g": 0.1, "fiber_g": 0.5, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "vitamin_a_mcg": 426, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Radish", "name_hindi": "मूली", "category": "Vegetables", "calories": 16, "protein_g": 0.7, "carbs_g": 3.4, "fat_g": 0.1, "fiber_g": 1.6, "rasa": ["Pungent", "Sweet"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Drumstick (Moringa)", "name_hindi": "सहजन", "category": "Vegetables", "calories": 37, "protein_g": 2.1, "carbs_g": 8.5, "fat_g": 0.2, "fiber_g": 3.2, "rasa": ["Pungent", "Bitter"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "calcium_mg": 30, "iron_mg": 0.4, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Fruits
        {"name": "Banana", "name_hindi": "केला", "category": "Fruits", "calories": 89, "protein_g": 1.1, "carbs_g": 23, "fat_g": 0.3, "fiber_g": 2.6, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sour", "guna": ["Heavy", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "potassium_mg": 358, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Apple", "name_hindi": "सेब", "category": "Fruits", "calories": 52, "protein_g": 0.3, "carbs_g": 14, "fat_g": 0.2, "fiber_g": 2.4, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "neutral"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Mango", "name_hindi": "आम", "category": "Fruits", "calories": 60, "protein_g": 0.8, "carbs_g": 15, "fat_g": 0.4, "fiber_g": 1.6, "rasa": ["Sweet", "Sour"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "vitamin_a_mcg": 54, "vitamin_c_mg": 36, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "season_best": ["Summer"]},
        {"name": "Papaya", "name_hindi": "पपीता", "category": "Fruits", "calories": 43, "protein_g": 0.5, "carbs_g": 11, "fat_g": 0.3, "fiber_g": 1.7, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "vitamin_a_mcg": 47, "vitamin_c_mg": 62, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Pomegranate", "name_hindi": "अनार", "category": "Fruits", "calories": 83, "protein_g": 1.7, "carbs_g": 19, "fat_g": 1.2, "fiber_g": 4, "rasa": ["Sweet", "Astringent", "Sour"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "neutral"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Grapes", "name_hindi": "अंगूर", "category": "Fruits", "calories": 69, "protein_g": 0.7, "carbs_g": 18, "fat_g": 0.2, "fiber_g": 0.9, "rasa": ["Sweet", "Sour"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Orange", "name_hindi": "संतरा", "category": "Fruits", "calories": 47, "protein_g": 0.9, "carbs_g": 12, "fat_g": 0.1, "fiber_g": 2.4, "rasa": ["Sour", "Sweet"], "virya": "Hot", "vipaka": "Sour", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "vitamin_c_mg": 53, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "season_best": ["Winter"]},
        {"name": "Watermelon", "name_hindi": "तरबूज", "category": "Fruits", "calories": 30, "protein_g": 0.6, "carbs_g": 8, "fat_g": 0.2, "fiber_g": 0.4, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True, "season_best": ["Summer"]},
        {"name": "Guava", "name_hindi": "अमरूद", "category": "Fruits", "calories": 68, "protein_g": 2.6, "carbs_g": 14, "fat_g": 1, "fiber_g": 5.4, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "vitamin_c_mg": 228, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Coconut (Fresh)", "name_hindi": "नारियल", "category": "Fruits", "calories": 354, "protein_g": 3.3, "carbs_g": 15, "fat_g": 33, "fiber_g": 9, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Dairy
        {"name": "Milk (Cow)", "name_hindi": "गाय का दूध", "category": "Dairy", "calories": 61, "protein_g": 3.2, "carbs_g": 4.8, "fat_g": 3.3, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "calcium_mg": 119, "vitamin_d_mcg": 1.2, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True},
        {"name": "Yogurt (Curd)", "name_hindi": "दही", "category": "Dairy", "calories": 98, "protein_g": 11, "carbs_g": 3.6, "fat_g": 5, "fiber_g": 0, "rasa": ["Sour", "Sweet"], "virya": "Hot", "vipaka": "Sour", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "calcium_mg": 110, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True},
        {"name": "Buttermilk (Chaas)", "name_hindi": "छाछ", "category": "Dairy", "calories": 40, "protein_g": 3.3, "carbs_g": 4.8, "fat_g": 0.9, "fiber_g": 0, "rasa": ["Sour", "Sweet", "Astringent"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "neutral", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True},
        {"name": "Ghee (Clarified Butter)", "name_hindi": "घी", "category": "Dairy", "calories": 900, "protein_g": 0, "carbs_g": 0, "fat_g": 100, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True},
        {"name": "Paneer (Cottage Cheese)", "name_hindi": "पनीर", "category": "Dairy", "calories": 265, "protein_g": 18, "carbs_g": 1.2, "fat_g": 21, "fiber_g": 0, "rasa": ["Sweet", "Sour"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "calcium_mg": 208, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True},
        
        # Spices
        {"name": "Turmeric", "name_hindi": "हल्दी", "category": "Spices", "calories": 312, "protein_g": 10, "carbs_g": 67, "fat_g": 3.2, "fiber_g": 22.7, "rasa": ["Bitter", "Pungent", "Astringent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "neutral", "pitta": "neutral", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Ginger", "name_hindi": "अदरक", "category": "Spices", "calories": 80, "protein_g": 1.8, "carbs_g": 18, "fat_g": 0.8, "fiber_g": 2, "rasa": ["Pungent", "Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cumin Seeds", "name_hindi": "जीरा", "category": "Spices", "calories": 375, "protein_g": 18, "carbs_g": 44, "fat_g": 22, "fiber_g": 10.5, "rasa": ["Pungent", "Bitter"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "iron_mg": 66, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Coriander Seeds", "name_hindi": "धनिया", "category": "Spices", "calories": 298, "protein_g": 12, "carbs_g": 55, "fat_g": 18, "fiber_g": 42, "rasa": ["Pungent", "Bitter", "Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "neutral", "pitta": "decreases", "kapha": "neutral"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Black Pepper", "name_hindi": "काली मिर्च", "category": "Spices", "calories": 255, "protein_g": 10, "carbs_g": 64, "fat_g": 3.3, "fiber_g": 26, "rasa": ["Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cardamom", "name_hindi": "इलायची", "category": "Spices", "calories": 311, "protein_g": 11, "carbs_g": 68, "fat_g": 7, "fiber_g": 28, "rasa": ["Pungent", "Sweet"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cinnamon", "name_hindi": "दालचीनी", "category": "Spices", "calories": 247, "protein_g": 4, "carbs_g": 81, "fat_g": 1.2, "fiber_g": 53, "rasa": ["Pungent", "Sweet", "Astringent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "calcium_mg": 1002, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cloves", "name_hindi": "लौंग", "category": "Spices", "calories": 274, "protein_g": 6, "carbs_g": 65, "fat_g": 13, "fiber_g": 34, "rasa": ["Pungent", "Bitter"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Fennel Seeds", "name_hindi": "सौंफ", "category": "Spices", "calories": 345, "protein_g": 16, "carbs_g": 52, "fat_g": 15, "fiber_g": 40, "rasa": ["Sweet", "Pungent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "neutral"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Asafoetida (Hing)", "name_hindi": "हींग", "category": "Spices", "calories": 297, "protein_g": 4, "carbs_g": 68, "fat_g": 1.1, "fiber_g": 4, "rasa": ["Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Oily", "Sharp"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Fenugreek Seeds", "name_hindi": "मेथी", "category": "Spices", "calories": 323, "protein_g": 23, "carbs_g": 58, "fat_g": 6.4, "fiber_g": 25, "rasa": ["Bitter", "Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "iron_mg": 34, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Mustard Seeds", "name_hindi": "राई", "category": "Spices", "calories": 508, "protein_g": 26, "carbs_g": 28, "fat_g": 36, "fiber_g": 12, "rasa": ["Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Oily", "Sharp"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Oils
        {"name": "Sesame Oil", "name_hindi": "तिल का तेल", "category": "Oils", "calories": 884, "protein_g": 0, "carbs_g": 0, "fat_g": 100, "fiber_g": 0, "rasa": ["Sweet", "Bitter", "Astringent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Heavy", "Oily", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Coconut Oil", "name_hindi": "नारियल तेल", "category": "Oils", "calories": 862, "protein_g": 0, "carbs_g": 0, "fat_g": 100, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Mustard Oil", "name_hindi": "सरसों का तेल", "category": "Oils", "calories": 884, "protein_g": 0, "carbs_g": 0, "fat_g": 100, "fiber_g": 0, "rasa": ["Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Oily", "Sharp"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Olive Oil", "name_hindi": "जैतून का तेल", "category": "Oils", "calories": 884, "protein_g": 0, "carbs_g": 0, "fat_g": 100, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "neutral", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Nuts & Seeds
        {"name": "Almonds", "name_hindi": "बादाम", "category": "Nuts", "calories": 579, "protein_g": 21, "carbs_g": 22, "fat_g": 50, "fiber_g": 12.5, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "calcium_mg": 269, "vitamin_e_mg": 25.6, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Cashews", "name_hindi": "काजू", "category": "Nuts", "calories": 553, "protein_g": 18, "carbs_g": 30, "fat_g": 44, "fiber_g": 3.3, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Walnuts", "name_hindi": "अखरोट", "category": "Nuts", "calories": 654, "protein_g": 15, "carbs_g": 14, "fat_g": 65, "fiber_g": 6.7, "rasa": ["Sweet", "Astringent"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Peanuts", "name_hindi": "मूंगफली", "category": "Nuts", "calories": 567, "protein_g": 26, "carbs_g": 16, "fat_g": 49, "fiber_g": 8.5, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Flax Seeds", "name_hindi": "अलसी", "category": "Seeds", "calories": 534, "protein_g": 18, "carbs_g": 29, "fat_g": 42, "fiber_g": 27, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Sunflower Seeds", "name_hindi": "सूरजमुखी बीज", "category": "Seeds", "calories": 584, "protein_g": 21, "carbs_g": 20, "fat_g": 51, "fiber_g": 8.6, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "neutral", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Pumpkin Seeds", "name_hindi": "कद्दू के बीज", "category": "Seeds", "calories": 559, "protein_g": 30, "carbs_g": 11, "fat_g": 49, "fiber_g": 6, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "neutral", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Sweeteners
        {"name": "Jaggery", "name_hindi": "गुड़", "category": "Sweeteners", "calories": 383, "protein_g": 0.4, "carbs_g": 98, "fat_g": 0.1, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "iron_mg": 11, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Honey", "name_hindi": "शहद", "category": "Sweeteners", "calories": 304, "protein_g": 0.3, "carbs_g": 82, "fat_g": 0, "fiber_g": 0.2, "rasa": ["Sweet", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Dry"], "dosha_effect": {"vata": "neutral", "pitta": "neutral", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": False, "is_gluten_free": True},
        {"name": "Rock Sugar (Mishri)", "name_hindi": "मिश्री", "category": "Sweeteners", "calories": 387, "protein_g": 0, "carbs_g": 100, "fat_g": 0, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Beverages
        {"name": "Green Tea", "name_hindi": "ग्रीन टी", "category": "Beverages", "calories": 2, "protein_g": 0.2, "carbs_g": 0.3, "fat_g": 0, "fiber_g": 0, "rasa": ["Bitter", "Astringent"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Coconut Water", "name_hindi": "नारियल पानी", "category": "Beverages", "calories": 19, "protein_g": 0.7, "carbs_g": 3.7, "fat_g": 0.2, "fiber_g": 1.1, "rasa": ["Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "neutral"}, "potassium_mg": 250, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        
        # Proteins (Non-Veg)
        {"name": "Chicken Breast", "name_hindi": "चिकन ब्रेस्ट", "category": "Proteins", "calories": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 3.6, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True},
        {"name": "Fish (Rohu)", "name_hindi": "रोहू मछली", "category": "Proteins", "calories": 97, "protein_g": 17, "carbs_g": 0, "fat_g": 3, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True},
        {"name": "Eggs", "name_hindi": "अंडा", "category": "Proteins", "calories": 155, "protein_g": 13, "carbs_g": 1.1, "fat_g": 11, "fiber_g": 0, "rasa": ["Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Heavy", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "increases"}, "is_vegetarian": False, "is_vegan": False, "is_gluten_free": True},
        
        # Herbs
        {"name": "Tulsi (Holy Basil)", "name_hindi": "तुलसी", "category": "Herbs", "calories": 23, "protein_g": 3.2, "carbs_g": 2.7, "fat_g": 0.6, "fiber_g": 1.6, "rasa": ["Pungent", "Bitter"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Mint (Pudina)", "name_hindi": "पुदीना", "category": "Herbs", "calories": 70, "protein_g": 3.8, "carbs_g": 15, "fat_g": 0.9, "fiber_g": 8, "rasa": ["Pungent"], "virya": "Cold", "vipaka": "Pungent", "guna": ["Light"], "dosha_effect": {"vata": "increases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Curry Leaves", "name_hindi": "करी पत्ता", "category": "Herbs", "calories": 108, "protein_g": 6.1, "carbs_g": 18.7, "fat_g": 1, "fiber_g": 6.4, "rasa": ["Bitter", "Pungent"], "virya": "Hot", "vipaka": "Pungent", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "increases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Ashwagandha", "name_hindi": "अश्वगंधा", "category": "Herbs", "calories": 245, "protein_g": 3.9, "carbs_g": 49.9, "fat_g": 0.3, "fiber_g": 32.3, "rasa": ["Bitter", "Astringent", "Sweet"], "virya": "Hot", "vipaka": "Sweet", "guna": ["Light", "Oily"], "dosha_effect": {"vata": "decreases", "pitta": "neutral", "kapha": "neutral"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Brahmi", "name_hindi": "ब्राह्मी", "category": "Herbs", "calories": 35, "protein_g": 2, "carbs_g": 6, "fat_g": 0.5, "fiber_g": 2, "rasa": ["Bitter", "Astringent", "Sweet"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "neutral"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Amla (Indian Gooseberry)", "name_hindi": "आंवला", "category": "Herbs", "calories": 44, "protein_g": 0.9, "carbs_g": 10.2, "fat_g": 0.6, "fiber_g": 4.3, "rasa": ["Sour", "Sweet", "Pungent", "Bitter", "Astringent"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "decreases"}, "vitamin_c_mg": 600, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Triphala", "name_hindi": "त्रिफला", "category": "Herbs", "calories": 50, "protein_g": 1, "carbs_g": 12, "fat_g": 0.2, "fiber_g": 5, "rasa": ["All six tastes"], "virya": "Neutral", "vipaka": "Sweet", "guna": ["Light", "Dry"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "decreases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
        {"name": "Shatavari", "name_hindi": "शतावरी", "category": "Herbs", "calories": 80, "protein_g": 5, "carbs_g": 15, "fat_g": 0.5, "fiber_g": 4, "rasa": ["Sweet", "Bitter"], "virya": "Cold", "vipaka": "Sweet", "guna": ["Heavy", "Oily", "Smooth"], "dosha_effect": {"vata": "decreases", "pitta": "decreases", "kapha": "increases"}, "is_vegetarian": True, "is_vegan": True, "is_gluten_free": True},
    ]
    
    # Add IDs and timestamps
    now = datetime.now(timezone.utc).isoformat()
    for food in foods:
        food["id"] = str(uuid.uuid4())
        food["created_at"] = now
        food["serving_size_g"] = food.get("serving_size_g", 100)
    
    await db.foods.insert_many(foods)
    
    return {"message": f"Successfully seeded {len(foods)} Ayurvedic foods", "count": len(foods)}

# ==================== ROOT ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Welcome to AyuCare API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
