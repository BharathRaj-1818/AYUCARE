from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from groq import Groq
from google import genai
from google.genai import types
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
import json
import tempfile
import qrcode
from io import BytesIO
import base64
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import functools



ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]



GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not set in environment")
groq_client = Groq(api_key=GROQ_API_KEY)


JWT_SECRET = os.environ.get('JWT_SECRET', 'ayucare-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 8760

app = FastAPI(title="AyuCare API")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
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
    prakriti_score: Optional[Dict[str, Any]] = None
    last_assessed_at: Optional[Any] = None
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
    category: str
    calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    rasa: List[str] = []
    virya: str = "Neutral"
    vipaka: str = "Sweet"
    guna: List[str] = []
    dosha_effect: Dict[str, str] = {}
    vitamin_a_mcg: float = 0
    vitamin_c_mg: float = 0
    vitamin_d_mcg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0
    potassium_mg: float = 0
    sodium_mg: float = 0
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
    category: str
    cuisine: str = "Indian"
    ingredients: List[Dict[str, Any]]
    instructions: Optional[List[str]] = []
    prep_time_mins: int = 0
    cook_time_mins: int = 0
    servings: int = 1
    dosha_suitable: List[str] = []
    health_benefits: Optional[List[str]] = []
    image_url: Optional[str] = None

class RecipeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    name_hindi:      Optional[str]        = None
    description:     Optional[str]        = None
    category:        str
    cuisine:         str                  = "Indian"
    ingredients:     List[Dict[str, Any]] = []
    instructions:    List[str]            = []
    prep_time_mins:  int                  = 0
    cook_time_mins:  int                  = 0
    servings:        int                  = 1
    dosha_suitable:  List[str]            = []
    health_benefits: List[str]            = []
    image_url:       Optional[str]        = None
    total_nutrients: Dict[str, float]     = {}
    created_at:      str
    user_id:         str

class DietChartCreate(BaseModel):
    patient_id: str
    title: str
    start_date: str
    end_date: str
    target_calories: Optional[int] = None
    notes: Optional[str] = None
    meals: Optional[List[Dict[str, Any]]] = []

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

class PrakritiOption(BaseModel):
    text: str
    vata: int
    pitta: int
    kapha: int

class PrakritiAnswer(BaseModel):
    question_id: int
    selected_option_index: int

class PrakritiAssessmentRequest(BaseModel):
    patient_id: str
    answers: List[PrakritiAnswer]

class PrakritiScore(BaseModel):
    vata: float
    pitta: float
    kapha: float
    dominant: str
    secondary: Optional[str] = None
    description: str

class PatientPortalRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    invite_code: str

class PatientPortalLogin(BaseModel):
    email: EmailStr
    password: str

class InviteCodeCreate(BaseModel):
    patient_id: str
    expires_hours: int = 72

class SymptomEntry(BaseModel):
    symptom: str
    severity: int  # 1=mild 2=moderate 3=severe

# ── Single canonical ProgressLogCreate (used by BOTH dietitian and patient routes) ──
class ProgressLogCreate(BaseModel):
    date:                str
    weight_kg:           Optional[float] = None
    energy_level:        Optional[int]   = None
    digestion_quality:   Optional[int]   = None
    mood:                Optional[int]   = None
    sleep_hours:         Optional[float] = None
    water_intake_liters: Optional[float] = None
    bowel_movements:     Optional[str]   = None
    symptoms:            Optional[List[dict]] = []
    notes:               Optional[str]   = None

# ── Used only by the dietitian /progress/log route which needs patient_id in body ──
class ProgressLogCreateWithPatient(ProgressLogCreate):
    patient_id: str

class ProgressLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    date: str
    weight_kg:           Optional[float] = None
    energy_level:        Optional[int]   = None
    digestion_quality:   Optional[int]   = None
    sleep_hours:         Optional[float] = None
    water_intake_liters: Optional[float] = None
    bowel_movements:     Optional[str]   = None
    symptoms:            Optional[List[dict]] = []
    notes:               Optional[str]   = None
    mood:                Optional[int]   = None
    logged_at: str
    user_id:   str

class AppointmentCreate(BaseModel):
    patient_id:    str
    date:          str
    time_slot:     str
    type:          str = "in-person"
    notes:         Optional[str] = None
    duration_mins: int = 30

class AppointmentUpdate(BaseModel):
    status:      Optional[str] = None
    notes:       Optional[str] = None
    meeting_url: Optional[str] = None
    date:        Optional[str] = None
    time_slot:   Optional[str] = None
    type:        Optional[str] = None

class AppointmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id:             str
    patient_id:     str
    patient_name:   Optional[str] = None
    dietitian_id:   str
    dietitian_name: Optional[str] = None
    date:           str
    time_slot:      str
    type:           str
    status:         str
    notes:          Optional[str] = None
    meeting_url:    Optional[str] = None
    duration_mins:  int
    created_at:     str
    updated_at:     str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

# ==================== HERB & SUPPLEMENT DB ====================
 
class HerbCreate(BaseModel):
    name: str
    name_hindi: Optional[str] = None
    name_sanskrit: Optional[str] = None
    category: str  # Adaptogen, Digestive, Nervine, Rejuvenative, etc.
    description: Optional[str] = None
    primary_dosha_effect: Optional[str] = None  # Vata/Pitta/Kapha pacifying
    rasa: Optional[List[str]] = []
    virya: Optional[str] = None
    vipaka: Optional[str] = None
    indications: Optional[List[str]] = []       # what it treats
    contraindications: Optional[List[str]] = [] # when to avoid
    dosage_powder_g: Optional[str] = None       # e.g. "3-6g daily"
    dosage_decoction_ml: Optional[str] = None
    dosage_capsule: Optional[str] = None
    best_taken_with: Optional[List[str]] = []   # e.g. ["warm milk", "honey"]
    avoid_with: Optional[List[str]] = []
    season_best: Optional[List[str]] = []
    modern_research: Optional[str] = None
    image_url: Optional[str] = None
    is_common: bool = True
 
class HerbResponse(HerbCreate):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str

class SendInviteEmailRequest(BaseModel):
    invite_code: str
    patient_name: str
    patient_email: str

# ==================== PRAKRITI QUESTIONS ====================

PRAKRITI_QUESTIONS = [
    {"id": 1,  "category": "Body Frame",  "question": "My body frame is:",                      "options": [{"text": "Thin, light, difficult to gain weight",          "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Medium build, muscular, moderate weight",     "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Large, heavy, tends to gain weight easily",   "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 2,  "category": "Body Frame",  "question": "My body weight:",                        "options": [{"text": "Low, hard to gain or maintain weight",           "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Moderate, I can control it with effort",      "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Heavy, gain weight easily, hard to lose",     "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 3,  "category": "Skin",        "question": "My skin is typically:",                  "options": [{"text": "Dry, rough, or flaky especially in winter",      "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Sensitive, oily T-zone, prone to redness",    "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Thick, smooth, oily, well-hydrated",          "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 4,  "category": "Skin",        "question": "My complexion tends to be:",             "options": [{"text": "Dull, darkish, or ashy",                          "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Reddish, flushed, or with freckles/moles",    "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Fair, pale, or whitish",                      "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 5,  "category": "Hair",        "question": "My hair is:",                            "options": [{"text": "Dry, frizzy, brittle, breaks easily",             "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Fine, straight, prone to early greying/loss", "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Thick, wavy, oily, lustrous",                 "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 6,  "category": "Digestion",   "question": "My digestion is:",                       "options": [{"text": "Irregular sometimes strong sometimes weak",       "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Strong I feel hungry at regular times",       "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Slow I can skip meals without much trouble",  "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 7,  "category": "Digestion",   "question": "My appetite is:",                        "options": [{"text": "Variable sometimes very hungry sometimes not",    "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Strong I get irritable if I miss a meal",     "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Steady I can go long without feeling hungry", "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 8,  "category": "Digestion",   "question": "My bowel movements are:",                "options": [{"text": "Irregular, tendency for constipation",            "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Regular, sometimes loose or burning",         "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Slow but regular, heavy stools",              "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 9,  "category": "Sleep",       "question": "My sleep pattern is:",                   "options": [{"text": "Light, interrupted, I wake up easily",            "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Moderate sleep well but less than 7 hrs",     "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Deep, heavy, love to sleep, hard to wake",    "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 10, "category": "Energy",      "question": "My energy level throughout the day is:", "options": [{"text": "Comes in bursts high then suddenly drained",       "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Strong and purposeful I push through tasks",  "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Steady and sustained slow starter but long",  "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 11, "category": "Energy",      "question": "When I exercise, I prefer:",             "options": [{"text": "Light movement yoga, walking, dancing",            "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Competitive sports, intense training",        "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Relaxed steady exercise avoid overexertion",  "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 12, "category": "Temperature", "question": "My preference for climate is:",          "options": [{"text": "I love warmth and dislike cold and wind",          "vata": 1, "pitta": 0, "kapha": 0}, {"text": "I prefer cool environments, dislike heat",    "vata": 0, "pitta": 1, "kapha": 0}, {"text": "I adapt well but prefer warm and dry",        "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 13, "category": "Mind",        "question": "My mind is best described as:",          "options": [{"text": "Quick, creative, restless, many ideas at once",    "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Sharp, focused, analytical, detail-oriented", "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Calm, thoughtful, slow to decide but steady",  "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 14, "category": "Mind",        "question": "When under stress, I tend to:",          "options": [{"text": "Become anxious, worried, or spaced out",           "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Get angry, irritable, or critical",           "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Withdraw, become sluggish or depressed",      "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 15, "category": "Mind",        "question": "My memory is:",                          "options": [{"text": "Quick to learn, quick to forget",                 "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Sharp and accurate in the medium term",       "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Slow to learn but retains things long-term",  "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 16, "category": "Mind",        "question": "My speech pattern is:",                  "options": [{"text": "Fast, talkative, jumps between topics",            "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Precise, direct, sometimes sharp or cutting", "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Slow, deliberate, melodic and pleasant",      "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 17, "category": "Emotions",    "question": "I am most prone to feeling:",            "options": [{"text": "Fear, anxiety, loneliness, overwhelm",            "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Anger, frustration, jealousy, irritability",  "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Attachment, possessiveness, sadness",         "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 18, "category": "Emotions",    "question": "My relationships are generally:",        "options": [{"text": "Many short connections, enthusiasm fades fast",    "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Selective, intense, loyal but demanding",     "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Deep, long-lasting, sometimes too attached",  "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 19, "category": "Habits",      "question": "My spending habits are:",                "options": [{"text": "Impulsive, spend on whims without planning",       "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Spend on quality and goals, financially smart","vata": 0, "pitta": 1, "kapha": 0}, {"text": "Save carefully, reluctant to spend",          "vata": 0, "pitta": 0, "kapha": 1}]},
    {"id": 20, "category": "Habits",      "question": "My daily routine is:",                   "options": [{"text": "Irregular I thrive on variety and change",          "vata": 1, "pitta": 0, "kapha": 0}, {"text": "Scheduled and purposeful I plan everything",  "vata": 0, "pitta": 1, "kapha": 0}, {"text": "Slow-paced, consistent, I resist change",     "vata": 0, "pitta": 0, "kapha": 1}]},
]

# ==================== RITUCHARYA ====================

RITU_DATA = {
    "Vasanta":  {"name": "Vasanta (Spring)",       "months": [3,4],   "description": "Kapha accumulated in winter begins to liquefy. Digestive fire is moderate. Focus on light, easily digestible foods.", "dosha_focus": "Kapha", "dosha_action": "pacify", "diet_principles": ["Favour light, dry, and warm foods", "Avoid heavy, oily, sweet, and cold foods", "Bitter, pungent, and astringent tastes are beneficial", "Eat less than full capacity"], "foods_to_favour": ["Barley","Old wheat","Moong dal","Honey","Bitter gourd","Drumstick","Ginger","Turmeric","Pomegranate"], "foods_to_avoid": ["Heavy dairy","Fried foods","Cold beverages","Excess sweets","Banana","Watermelon"], "color": "green"},
    "Grishma":  {"name": "Grishma (Summer)",       "months": [5,6],   "description": "Intense heat depletes strength. Vata begins to accumulate. Agni weakens. Body needs cooling, hydrating, easy-to-digest foods.", "dosha_focus": "Vata", "dosha_action": "pacify", "diet_principles": ["Favour sweet, cold, liquid foods", "Stay well-hydrated", "Avoid salty, sour, pungent, and heavy foods", "Light meals only"], "foods_to_favour": ["Coconut water","Buttermilk","Cold milk","Rice","Cucumber","Watermelon","Ghee","Fennel"], "foods_to_avoid": ["Spicy food","Salty snacks","Hot beverages","Fenugreek","Mustard"], "color": "orange"},
    "Varsha":   {"name": "Varsha (Monsoon)",       "months": [7,8],   "description": "Vata is aggravated. Agni becomes very weak due to humidity. Food must be light, sour, and salty to support digestion.", "dosha_focus": "Vata", "dosha_action": "pacify", "diet_principles": ["Favour sour, salty, and oily foods to kindle Agni", "Eat freshly cooked warm food only", "Avoid raw foods and salads", "Drink boiled or purified water"], "foods_to_favour": ["Old rice","Wheat","Moong dal","Khichdi","Ginger","Garlic","Ghee","Honey"], "foods_to_avoid": ["Raw salads","Cold water","Heavy legumes","Curd at night","Stale food"], "color": "blue"},
    "Sharada":  {"name": "Sharada (Autumn)",       "months": [9,10],  "description": "Pitta accumulated in monsoon gets aggravated by returning sun. Agni strengthens. Bitter, sweet, astringent foods pacify Pitta.", "dosha_focus": "Pitta", "dosha_action": "pacify", "diet_principles": ["Favour bitter, sweet, and astringent tastes", "Avoid hot, spicy, sour, and fermented foods", "Cooling foods and drinks are beneficial"], "foods_to_favour": ["Rice","Green gram","Sugarcane juice","Amla","Pomegranate","Coconut water","Ghee","Coriander","Fennel"], "foods_to_avoid": ["Curd","Spicy food","Mustard oil","Fermented foods"], "color": "amber"},
    "Hemanta":  {"name": "Hemanta (Early Winter)", "months": [11,12], "description": "Agni is at its strongest. Body can digest heavy, nutritious foods. Best season for building strength.", "dosha_focus": "Vata", "dosha_action": "pacify", "diet_principles": ["Eat nourishing, heavy, sweet, sour, and salty foods", "Dairy products, oils, and wholesome grains are ideal", "Increase protein and healthy fat intake", "Warm foods and beverages are essential"], "foods_to_favour": ["Milk","Ghee","Urad dal","Sesame","Jaggery","Wheat","Nuts","Root vegetables","Dates"], "foods_to_avoid": ["Cold drinks","Raw salads","Light dry foods","Fasting"], "color": "purple"},
    "Shishira": {"name": "Shishira (Late Winter)", "months": [1,2],   "description": "Coldest season. Agni remains strong. Body needs heavy, warm, nourishing foods to combat cold.", "dosha_focus": "Vata", "dosha_action": "pacify", "diet_principles": ["Warm, heavy, nourishing foods", "Sour, salty, sweet tastes are beneficial", "Sesame and jaggery are especially good", "Avoid cold and raw foods"], "foods_to_favour": ["Sesame seeds","Jaggery","Ghee","Milk","Urad dal","Ginger","Cinnamon","Cardamom","Wheat rotis"], "foods_to_avoid": ["Cold water","Cold desserts","Raw salads","Fasting"], "color": "indigo"},
}

def get_current_ritu() -> dict:
    month = datetime.now().month
    for key, ritu in RITU_DATA.items():
        if month in ritu["months"]:
            return {"key": key, **ritu}
    return {"key": "Vasanta", **RITU_DATA["Vasanta"]}

def get_ritu_for_month(month: int) -> dict:
    for key, ritu in RITU_DATA.items():
        if month in ritu["months"]:
            return {"key": key, **ritu}
    return {"key": "Vasanta", **RITU_DATA["Vasanta"]}

SYMPTOM_DOSHA_MAP = {
    "anxiety":          {"vata": 3, "pitta": 0, "kapha": 0},
    "constipation":     {"vata": 3, "pitta": 0, "kapha": 0},
    "dry skin":         {"vata": 3, "pitta": 0, "kapha": 0},
    "joint pain":       {"vata": 3, "pitta": 0, "kapha": 0},
    "insomnia":         {"vata": 3, "pitta": 1, "kapha": 0},
    "bloating":         {"vata": 3, "pitta": 0, "kapha": 0},
    "fatigue":          {"vata": 2, "pitta": 1, "kapha": 2},
    "inflammation":     {"vata": 0, "pitta": 3, "kapha": 0},
    "acid reflux":      {"vata": 0, "pitta": 3, "kapha": 0},
    "irritability":     {"vata": 0, "pitta": 3, "kapha": 0},
    "skin rash":        {"vata": 0, "pitta": 3, "kapha": 0},
    "fever":            {"vata": 0, "pitta": 3, "kapha": 0},
    "excessive hunger": {"vata": 0, "pitta": 3, "kapha": 0},
    "weight gain":      {"vata": 0, "pitta": 0, "kapha": 3},
    "lethargy":         {"vata": 0, "pitta": 0, "kapha": 3},
    "congestion":       {"vata": 0, "pitta": 0, "kapha": 3},
    "water retention":  {"vata": 0, "pitta": 0, "kapha": 3},
    "depression":       {"vata": 1, "pitta": 0, "kapha": 3},
    "headache":         {"vata": 1, "pitta": 2, "kapha": 1},
    "low appetite":     {"vata": 1, "pitta": 0, "kapha": 2},
}

def detect_dosha_imbalance(logs: list) -> dict:
    if not logs:
        return {"imbalances": [], "overall_status": "stable"}
    vata_score = pitta_score = kapha_score = 0
    for log in logs[-14:]:
        for symptom_entry in log.get("symptoms", []):
            s_name   = symptom_entry.get("symptom", "").lower()
            severity = symptom_entry.get("severity", 1)
            mapping  = SYMPTOM_DOSHA_MAP.get(s_name, {})
            vata_score  += mapping.get("vata",  0) * severity
            pitta_score += mapping.get("pitta", 0) * severity
            kapha_score += mapping.get("kapha", 0) * severity
        energy = log.get("energy_level")
        if energy and energy <= 2:
            vata_score += 2; kapha_score += 2
        sleep = log.get("sleep_hours")
        if sleep and sleep < 5:
            vata_score += 3
        digestion = log.get("digestion_quality")
        if digestion and digestion <= 2:
            vata_score += 1; pitta_score += 1
    imbalances = []
    THRESHOLD = 6
    if vata_score >= THRESHOLD:
        imbalances.append({"dosha": "Vata", "score": vata_score, "severity": "high" if vata_score >= 15 else "moderate", "symptoms": ["anxiety","constipation","dry skin","insomnia","bloating"], "recommendations": ["Eat warm, oily, and grounding foods like khichdi and ghee", "Establish a fixed daily routine — same wake/sleep time", "Reduce cold, raw, and dry foods", "Do warm oil massage (Abhyanga) daily", "Practice gentle yoga and meditation"]})
    if pitta_score >= THRESHOLD:
        imbalances.append({"dosha": "Pitta", "score": pitta_score, "severity": "high" if pitta_score >= 15 else "moderate", "symptoms": ["inflammation","acid reflux","irritability","skin rash"], "recommendations": ["Favour cooling foods — coconut water, cucumber, pomegranate", "Avoid spicy, sour, and fermented foods", "Do not skip meals — Pitta types become irritable when hungry", "Exercise in the cool morning hours only", "Include coriander, fennel, and cardamom in daily diet"]})
    if kapha_score >= THRESHOLD:
        imbalances.append({"dosha": "Kapha", "score": kapha_score, "severity": "high" if kapha_score >= 15 else "moderate", "symptoms": ["weight gain","lethargy","congestion","water retention"], "recommendations": ["Eat light, dry, and warm foods — avoid heavy dairy and sweets", "Exercise vigorously every day, preferably in the morning", "Add ginger, black pepper, and mustard to meals", "Avoid daytime sleeping", "Drink warm water with honey and lemon each morning"]})
    overall = "stable"
    if any(i["severity"] == "high" for i in imbalances): overall = "attention_needed"
    elif imbalances: overall = "mild_imbalance"
    return {"imbalances": imbalances, "overall_status": overall, "vata_score": vata_score, "pitta_score": pitta_score, "kapha_score": kapha_score, "logs_analysed": min(len(logs), 14)}

# ==================== RDA REFERENCE ====================

RDA_REFERENCE = {
    "male":   {"child": {"calories":1800,"protein_g":35,"carbs_g":260,"fat_g":55,"fiber_g":25,"calcium_mg":1000,"iron_mg":10,"vitamin_c_mg":40}, "teen": {"calories":2500,"protein_g":60,"carbs_g":350,"fat_g":70,"fiber_g":35,"calcium_mg":1300,"iron_mg":12,"vitamin_c_mg":65}, "adult": {"calories":2200,"protein_g":56,"carbs_g":310,"fat_g":65,"fiber_g":30,"calcium_mg":1000,"iron_mg":8,"vitamin_c_mg":90}, "senior": {"calories":2000,"protein_g":60,"carbs_g":280,"fat_g":60,"fiber_g":28,"calcium_mg":1200,"iron_mg":8,"vitamin_c_mg":90}},
    "female": {"child": {"calories":1600,"protein_g":35,"carbs_g":230,"fat_g":50,"fiber_g":22,"calcium_mg":1000,"iron_mg":10,"vitamin_c_mg":40}, "teen": {"calories":2200,"protein_g":46,"carbs_g":300,"fat_g":60,"fiber_g":28,"calcium_mg":1300,"iron_mg":15,"vitamin_c_mg":65}, "adult": {"calories":1900,"protein_g":46,"carbs_g":260,"fat_g":55,"fiber_g":25,"calcium_mg":1000,"iron_mg":18,"vitamin_c_mg":75}, "senior": {"calories":1800,"protein_g":46,"carbs_g":240,"fat_g":50,"fiber_g":22,"calcium_mg":1200,"iron_mg":8,"vitamin_c_mg":75}},
}

def get_rda(age: int, gender: str) -> dict:
    g = "female" if gender.lower() in ["female","f","woman","girl"] else "male"
    stage = "child" if age < 13 else "teen" if age < 19 else "adult" if age < 60 else "senior"
    return RDA_REFERENCE[g][stage]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    return jwt.encode({"user_id": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── SINGLE correct get_current_patient — looks up db.users, checks role=patient ──
async def get_current_patient(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("role") != "patient":
            raise HTTPException(status_code=403, detail="Patient access only")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== PRAKRITI SCORING ====================

def calculate_prakriti_scores(answers: List[PrakritiAnswer]) -> PrakritiScore:
    v = p = k = 0
    qmap = {q["id"]: q for q in PRAKRITI_QUESTIONS}
    for a in answers:
        q = qmap.get(a.question_id)
        if not q or a.selected_option_index >= len(q["options"]): continue
        sel = q["options"][a.selected_option_index]
        v += sel["vata"]; p += sel["pitta"]; k += sel["kapha"]
    grand = v + p + k or 1
    vp = round(v/grand*100,1); pp = round(p/grand*100,1); kp = round(k/grand*100,1)
    sd = sorted({"Vata":vp,"Pitta":pp,"Kapha":kp}.items(), key=lambda x:x[1], reverse=True)
    dom = sd[0][0]; sec = sd[1][0] if sd[1][1] >= 25 else None
    label = f"{dom}-{sec}" if sec and abs(sd[0][1]-sd[1][1]) <= 15 else dom
    desc = {"Vata":"Creative, energetic, quick-thinking. Tendency toward dryness, irregularity, and anxiety when imbalanced.","Pitta":"Intelligent, focused, driven. Tendency toward inflammation, irritability, and perfectionism when imbalanced.","Kapha":"Calm, nurturing, stable. Tendency toward weight gain, lethargy, and attachment when imbalanced.","Vata-Pitta":"Energetic and sharp. Driven but prone to burnout, anxiety, and inflammation.","Pitta-Vata":"Sharp and creative. May experience restlessness combined with intensity.","Pitta-Kapha":"Determined and steady. Strong constitution but may accumulate heat and weight.","Kapha-Pitta":"Grounded with sharp focus. Strong immunity but may struggle with sluggishness.","Vata-Kapha":"Creative and calm but may lack consistency and stamina.","Kapha-Vata":"Steady with creative bursts. May swing between overactivity and inertia."}
    return PrakritiScore(vata=vp, pitta=pp, kapha=kp, dominant=label, secondary=sec, description=desc.get(label, f"Dominant {label} constitution."))

# ==================== GROQ HELPER ====================

async def call_ai(prompt: str, temperature: float = 0.3) -> str:
    """
    Production-grade Groq AI caller (LLaMA 3.3 70B)

    Improvements:
    - Lower temperature → stable JSON outputs
    - Safe async execution
    - Markdown stripping
    - Basic retry mechanism
    """

    def _call():
        return groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Return only the requested output. No extra text."},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=4096,
        )

    for attempt in range(2):  # simple retry
        try:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, _call)

            text = response.choices[0].message.content.strip()

            # 🔧 Remove markdown fences
            if text.startswith("```"):
                lines = text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines).strip()

            return text

        except Exception as e:
            logger.error(f"Groq attempt {attempt+1} failed: {e}")
            if attempt == 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"AI generation failed: {str(e)}"
                )
# ==================== AI HELPER ====================

def safe_json_load(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 🔧 Step 1: Clean basic formatting
        text = text.replace("\n", " ").replace("\t", " ")
        text = text.replace(",}", "}").replace(",]", "]")

        # 🔧 Step 2: Extract JSON substring (VERY IMPORTANT)
        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1:
            text = text[start:end+1]

        # 🔧 Step 3: Retry parsing
        return json.loads(text)
    
# ==================== JITSI MEET HELPER ====================


async def create_jitsi_room(appointment_id: str) -> str:
    """
    Generate a Jitsi Meet room URL. Rooms are created on-demand when users join.
    Uses a short deterministic room name based on appointment ID for reliability.
    """
    # Use first 12 chars of appointment_id for a shorter, cleaner room name
    short_id = appointment_id.replace("-", "")[:12]
    room_name = f"AyuCare{short_id}"
    # Add config params for better UX: disable prejoin page, start with audio muted
    return f"https://meet.jit.si/{room_name}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false"
    

# --- Helper: Generate QR code as base64 PNG ---
def generate_qr_base64(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=8, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2d6a4f", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()



# --- Helper: Send invite email via Gmail SMTP ---
def send_invite_email(patient_email: str, patient_name: str, invite_code: str, qr_base64: str, register_url: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_email or not smtp_password:
        raise Exception("SMTP credentials not configured in .env")

    msg = MIMEMultipart("related")
    msg["Subject"] = "Your AyuCare Invite — Join Your Dietitian's Portal"
    msg["From"] = f"AyuCare <{smtp_email}>"
    msg["To"] = patient_email

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background:#f4f9f4; padding:30px;">
      <div style="max-width:520px; margin:auto; background:white; border-radius:12px;
                  padding:32px; box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <div style="text-align:center; margin-bottom:24px;">
          <h1 style="color:#2d6a4f; margin:0;">🌿 AyuCare</h1>
          <p style="color:#666; margin-top:6px;">Ayurvedic Diet Management</p>
        </div>

        <p style="color:#333; font-size:16px;">Hello <strong>{patient_name}</strong>,</p>
        <p style="color:#555;">Your dietitian has invited you to join the AyuCare patient portal.
           Use the code below or scan the QR to register:</p>

        <div style="text-align:center; margin:28px 0;">
          <div style="display:inline-block; background:#f0fdf4; border:2px dashed #2d6a4f;
                      border-radius:10px; padding:18px 36px;">
            <p style="margin:0; color:#888; font-size:13px;">YOUR INVITE CODE</p>
            <p style="margin:8px 0 0; font-size:32px; font-weight:bold;
                      letter-spacing:6px; color:#2d6a4f;">{invite_code}</p>
          </div>
        </div>

        <div style="text-align:center; margin:20px 0;">
          <p style="color:#555; font-size:14px;">Or scan this QR code with your phone:</p>
          <img src="cid:qrcode" alt="QR Code"
               style="width:160px; height:160px; border-radius:8px;" />
        </div>

        <div style="text-align:center; margin:28px 0;">
          <a href="{register_url}?code={invite_code}"
             style="background:#2d6a4f; color:white; padding:14px 32px;
                    border-radius:8px; text-decoration:none; font-size:15px;
                    font-weight:bold;">
            Register Now →
          </a>
        </div>

        <p style="color:#aaa; font-size:12px; text-align:center; margin-top:28px;">
          This invite code is valid for 72 hours.<br/>
          If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
    """

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html"))
    msg.attach(alt)

    # Attach QR image inline
    qr_bytes = base64.b64decode(qr_base64)
    qr_img = MIMEImage(qr_bytes, _subtype="png")
    qr_img.add_header("Content-ID", "<qrcode>")
    qr_img.add_header("Content-Disposition", "inline", filename="qrcode.png")
    msg.attach(qr_img)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, patient_email, msg.as_string())

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({"id": uid, "email": user_data.email, "password_hash": hash_password(user_data.password), "name": user_data.name, "role": user_data.role, "created_at": now})
    return TokenResponse(access_token=create_token(uid, user_data.email), user=UserResponse(id=uid, email=user_data.email, name=user_data.name, role=user_data.role, created_at=now))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    print(f"[LOGIN ATTEMPT] email={credentials.email}")  # ← ADD
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    print(f"[LOGIN] user found={user is not None}, role={user.get('role') if user else 'N/A'}")  # ← ADD
    if not user or not verify_password(credentials.password, user["password_hash"]):
        print(f"[LOGIN FAILED] wrong password or no user")  # ← ADD
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_token(user["id"], user["email"]), user=UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], created_at=user["created_at"]))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], created_at=user["created_at"])

# ==================== PATIENT ROUTES ====================

@api_router.post("/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, user: dict = Depends(get_current_user)):
    pid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    bmi = round(patient.weight_kg/(patient.height_cm/100)**2,1) if patient.height_cm and patient.weight_kg else None
    doc = {"id": pid, **patient.model_dump(), "bmi": bmi, "created_at": now, "updated_at": now, "user_id": user["id"]}
    await db.patients.insert_one(doc)
    return PatientResponse(**{k:v for k,v in doc.items() if k != "_id"})

@api_router.get("/patients", response_model=List[PatientResponse])
async def get_patients(search: Optional[str]=None, prakriti: Optional[str]=None, user: dict=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if search: query["$or"] = [{"name":{"$regex":search,"$options":"i"}},{"email":{"$regex":search,"$options":"i"}},{"phone":{"$regex":search,"$options":"i"}}]
    if prakriti: query["prakriti"] = prakriti
    return [PatientResponse(**p) for p in await db.patients.find(query,{"_id":0}).sort("created_at",-1).to_list(1000)]

@api_router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, user: dict=Depends(get_current_user)):
    p = await db.patients.find_one({"id":patient_id,"user_id":user["id"]},{"_id":0})
    if not p: raise HTTPException(status_code=404, detail="Patient not found")
    return PatientResponse(**p)

@api_router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient: PatientCreate, user: dict=Depends(get_current_user)):
    if not await db.patients.find_one({"id":patient_id,"user_id":user["id"]}): raise HTTPException(status_code=404, detail="Patient not found")
    bmi = round(patient.weight_kg/(patient.height_cm/100)**2,1) if patient.height_cm and patient.weight_kg else None
    await db.patients.update_one({"id":patient_id},{"$set":{**patient.model_dump(),"bmi":bmi,"updated_at":datetime.now(timezone.utc).isoformat()}})
    return PatientResponse(**await db.patients.find_one({"id":patient_id},{"_id":0}))

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, user: dict=Depends(get_current_user)):
    r = await db.patients.delete_one({"id":patient_id,"user_id":user["id"]})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}

# ==================== FOOD ROUTES ====================

@api_router.post("/foods", response_model=FoodResponse)
async def create_food(food: FoodCreate, user: dict=Depends(get_current_user)):
    fid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    doc = {"id":fid,**food.model_dump(),"created_at":now}
    await db.foods.insert_one(doc)
    return FoodResponse(**{k:v for k,v in doc.items() if k!="_id"})

@api_router.get("/foods", response_model=List[FoodResponse])
async def get_foods(search:Optional[str]=None,category:Optional[str]=None,rasa:Optional[str]=None,virya:Optional[str]=None,dosha:Optional[str]=None,is_vegetarian:Optional[bool]=None,limit:int=100,skip:int=0):
    query = {}
    if search: query["$or"]=[{"name":{"$regex":search,"$options":"i"}},{"name_hindi":{"$regex":search,"$options":"i"}}]
    if category: query["category"]=category
    if rasa: query["rasa"]=rasa
    if virya: query["virya"]=virya
    if dosha: query[f"dosha_effect.{dosha.lower()}"]={"$in":["decreases","balances"]}
    if is_vegetarian is not None: query["is_vegetarian"]=is_vegetarian
    return [FoodResponse(**f) for f in await db.foods.find(query,{"_id":0}).skip(skip).limit(limit).to_list(limit)]

@api_router.get("/foods/categories/list")
async def get_food_categories():
    return {"categories": await db.foods.distinct("category")}

@api_router.get("/foods/{food_id}", response_model=FoodResponse)
async def get_food(food_id: str):
    f = await db.foods.find_one({"id":food_id},{"_id":0})
    if not f: raise HTTPException(status_code=404, detail="Food not found")
    return FoodResponse(**f)

# ==================== RECIPE ROUTES ====================

@api_router.post("/recipes", response_model=RecipeResponse)
async def create_recipe(recipe: RecipeCreate, user: dict = Depends(get_current_user)):
    rid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    total = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0}
    enriched_ingredients = []
    for ing in recipe.ingredients:
        food = await db.foods.find_one({"id": ing.get("food_id")}, {"_id": 0})
        if food:
            r = ing.get("quantity_g", 100) / 100
            for k in total: total[k] += food.get(k, 0) * r
            enriched_ingredients.append({"food_id": ing.get("food_id"), "food_name": food.get("name", ""), "quantity_g": ing.get("quantity_g", 100)})
    total = {k: round(v, 1) for k, v in total.items()}
    doc = {"id": rid, "name": recipe.name, "name_hindi": recipe.name_hindi, "description": recipe.description, "category": recipe.category, "cuisine": recipe.cuisine, "ingredients": enriched_ingredients, "instructions": recipe.instructions or [], "prep_time_mins": recipe.prep_time_mins, "cook_time_mins": recipe.cook_time_mins, "servings": recipe.servings, "dosha_suitable": recipe.dosha_suitable or [], "health_benefits": recipe.health_benefits or [], "image_url": recipe.image_url, "total_nutrients": total, "created_at": now, "user_id": user["id"]}
    await db.recipes.insert_one(doc)
    return RecipeResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/recipes", response_model=List[RecipeResponse])
async def get_recipes(category: Optional[str]=None, dosha: Optional[str]=None, search: Optional[str]=None, user: dict=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if category: query["category"] = category
    if dosha: query["dosha_suitable"] = dosha
    if search: query["name"] = {"$regex": search, "$options": "i"}
    recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for r in recipes:
        try: result.append(RecipeResponse(**r))
        except Exception as e: logger.warning(f"Skipping malformed recipe {r.get('id','?')}: {e}")
    return result

@api_router.get("/recipes/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    r = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not r: raise HTTPException(status_code=404, detail="Recipe not found")
    return RecipeResponse(**r)

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, user: dict = Depends(get_current_user)):
    result = await db.recipes.delete_one({"id": recipe_id, "user_id": user["id"]})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted successfully"}

# ==================== DIET CHART ROUTES ====================

@api_router.post("/diet-charts", response_model=DietChartResponse)
async def create_diet_chart(chart: DietChartCreate, user: dict=Depends(get_current_user)):
    patient = await db.patients.find_one({"id":chart.patient_id,"user_id":user["id"]},{"_id":0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    cid=str(uuid.uuid4()); now=datetime.now(timezone.utc).isoformat()
    doc={"id":cid,**chart.model_dump(),"patient_name":patient.get("name"),"total_daily_nutrients":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0},"created_at":now,"user_id":user["id"]}
    await db.diet_charts.insert_one(doc)
    return DietChartResponse(**{k:v for k,v in doc.items() if k!="_id"})

@api_router.get("/diet-charts", response_model=List[DietChartResponse])
async def get_diet_charts(patient_id:Optional[str]=None,user:dict=Depends(get_current_user)):
    query={"user_id":user["id"]}
    if patient_id: query["patient_id"]=patient_id
    return [DietChartResponse(**c) for c in await db.diet_charts.find(query,{"_id":0}).sort("created_at",-1).to_list(100)]

@api_router.get("/diet-charts/{chart_id}", response_model=DietChartResponse)
async def get_diet_chart(chart_id: str, user: dict=Depends(get_current_user)):
    c = await db.diet_charts.find_one({"id":chart_id,"user_id":user["id"]},{"_id":0})
    if not c: raise HTTPException(status_code=404, detail="Diet chart not found")
    return DietChartResponse(**c)

@api_router.delete("/diet-charts/{chart_id}")
async def delete_diet_chart(chart_id: str, user: dict=Depends(get_current_user)):
    r = await db.diet_charts.delete_one({"id":chart_id,"user_id":user["id"]})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Diet chart not found")
    return {"message": "Diet chart deleted successfully"}

# ==================== AI DIET GENERATION ====================

@api_router.post("/ai/generate-diet", response_model=DietChartResponse)
async def generate_diet_with_ai(request: AIGenerateRequest, user: dict=Depends(get_current_user)):
    patient = await db.patients.find_one({"id":request.patient_id,"user_id":user["id"]},{"_id":0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    foods = await db.foods.find({},{"_id":0,"name":1,"category":1,"calories":1,"rasa":1,"virya":1,"dosha_effect":1}).to_list(100)
    foods_summary = [{"name":f["name"],"category":f["category"],"calories":f.get("calories",0)} for f in foods[:40]]
    ritu = get_current_ritu()
    prompt = f"""You are an expert Ayurvedic dietitian. Create a personalized {request.duration_days}-day diet plan.
PATIENT: {patient.get('name')}, {patient.get('age')} yrs, {patient.get('gender')}
Prakriti: {patient.get('prakriti','Unknown')} | Vikriti: {patient.get('vikriti','None')} | BMI: {patient.get('bmi','Unknown')}
Diet: {patient.get('dietary_habits','Not specified')} | Meals/day: {patient.get('meal_frequency',3)}
Conditions: {', '.join(patient.get('health_conditions',[])) or 'None'} | Allergies: {', '.join(patient.get('allergies',[])) or 'None'}
Target calories: {request.target_calories or 'calculate from profile'}
Special: {request.specific_requirements or 'None'}
CURRENT SEASON (RITUCHARYA): {ritu['name']}
Dominant dosha: {ritu['dosha_focus']} (pacify) | {ritu['description']}
Principles: {'; '.join(ritu['diet_principles'])}
Favour: {', '.join(ritu['foods_to_favour'])} | Avoid: {', '.join(ritu['foods_to_avoid'])}
FOODS AVAILABLE: {json.dumps(foods_summary[:25])}
Return ONLY valid JSON, no markdown fences:
{{"title":"...","target_calories":1800,"season":"{ritu['key']}","season_name":"{ritu['name']}","notes":"Prakriti and seasonal reasoning...","meals":[{{"day":1,"breakfast":{{"time":"7:00 AM","items":["item (portion)"],"calories":300,"ayurvedic_note":"..."}},"mid_morning":{{"time":"10:00 AM","items":["item"],"calories":100,"ayurvedic_note":"..."}},"lunch":{{"time":"12:30 PM","items":["item1","item2"],"calories":500,"ayurvedic_note":"..."}},"evening_snack":{{"time":"4:00 PM","items":["item"],"calories":150,"ayurvedic_note":"..."}},"dinner":{{"time":"7:00 PM","items":["item1","item2"],"calories":400,"ayurvedic_note":"..."}}}}]}}"""
    try:
        diet_plan = safe_json_load(await call_ai(prompt, temperature=0.3))
        cid = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
        doc = {"id":cid,"patient_id":request.patient_id,"patient_name":patient.get("name"),"title":diet_plan.get("title",f"Diet Plan for {patient.get('name')}"),"start_date":datetime.now(timezone.utc).strftime("%Y-%m-%d"),"end_date":(datetime.now(timezone.utc)+timedelta(days=request.duration_days)).strftime("%Y-%m-%d"),"target_calories":diet_plan.get("target_calories"),"notes":diet_plan.get("notes",""),"meals":diet_plan.get("meals",[]),"total_daily_nutrients":{"calories":diet_plan.get("target_calories",1800),"protein_g":60,"carbs_g":250,"fat_g":50,"fiber_g":25},"season":diet_plan.get("season",ritu["key"]),"season_name":diet_plan.get("season_name",ritu["name"]),"ritu_principles":ritu["diet_principles"],"created_at":now,"user_id":user["id"],"ai_generated":True}
        await db.diet_charts.insert_one(doc)
        return DietChartResponse(**{k:v for k,v in doc.items() if k!="_id"})
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response — please try again")
    except HTTPException: raise
    except Exception as e:
        logger.error(f"Diet generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# ==================== NUTRIENT GAP ANALYSIS ====================

@api_router.post("/diet-charts/{chart_id}/analyze-nutrients")
async def analyze_nutrient_gaps(chart_id: str, user: dict=Depends(get_current_user)):
    chart = await db.diet_charts.find_one({"id":chart_id,"user_id":user["id"]},{"_id":0})
    if not chart: raise HTTPException(status_code=404, detail="Diet chart not found")
    patient = await db.patients.find_one({"id":chart["patient_id"]},{"_id":0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    rda = get_rda(patient.get("age",30), patient.get("gender","male"))
    meals_summary = []
    for day in chart.get("meals",[])[:3]:
        items = []
        for mt in ["breakfast","mid_morning","lunch","evening_snack","dinner"]:
            m = day.get(mt,{})
            if m and m.get("items"): items.extend(m["items"])
        meals_summary.append({"day":day.get("day"),"items":items})
    prompt = f"""You are a clinical nutritionist and Ayurvedic dietitian. Analyze this diet plan for nutrient gaps.
PATIENT: {patient.get('name')}, Age {patient.get('age')}, {patient.get('gender')}
Prakriti: {patient.get('prakriti','Unknown')} | Conditions: {', '.join(patient.get('health_conditions',[])) or 'None'}
Dietary: {patient.get('dietary_habits','Not specified')} | Allergies: {', '.join(patient.get('allergies',[])) or 'None'}
DAILY RDA: Calories:{rda['calories']}kcal | Protein:{rda['protein_g']}g | Carbs:{rda['carbs_g']}g | Fat:{rda['fat_g']}g | Fiber:{rda['fiber_g']}g | Calcium:{rda['calcium_mg']}mg | Iron:{rda['iron_mg']}mg | Vitamin C:{rda['vitamin_c_mg']}mg
DIET: "{chart.get('title')}" | Target: {chart.get('target_calories','Not set')} kcal | Season: {chart.get('season_name','Unknown')}
SAMPLE MEALS: {json.dumps(meals_summary)}
Return ONLY valid JSON, no markdown fences:
{{"overall_rating":"good","summary":"2-3 sentence overall assessment","gaps":[{{"nutrient":"Iron","current_estimate":"~8mg/day","recommended":"{rda['iron_mg']}mg/day","status":"low","severity":"moderate","ayurvedic_alternatives":["Sesame seeds","Fenugreek leaves","Amla","Dates"],"modern_alternatives":["Spinach","Lentils","Fortified cereals"],"explanation":"Why this matters..."}}],"strengths":["Good protein from moong dal"],"recommendations":["Add 1 tbsp sesame seeds to breakfast"],"ayurvedic_note":"Ayurvedic perspective..."}}"""
    try:
        analysis = safe_json_load(await call_ai(prompt, temperature=0.2))
        report = {"chart_id":chart_id,"patient_id":chart["patient_id"],"chart_title":chart.get("title"),"patient_name":patient.get("name"),"patient_age":patient.get("age"),"patient_gender":patient.get("gender"),"rda_used":rda,"overall_rating":analysis.get("overall_rating","good"),"summary":analysis.get("summary",""),"gaps":analysis.get("gaps",[]),"strengths":analysis.get("strengths",[]),"recommendations":analysis.get("recommendations",[]),"ayurvedic_note":analysis.get("ayurvedic_note",""),"generated_at":datetime.now(timezone.utc).isoformat()}
        await db.nutrient_reports.update_one({"chart_id":chart_id},{"$set":report},upsert=True)
        return report
    except json.JSONDecodeError as e:
        logger.error(f"Nutrient analysis JSON error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse analysis — please try again")
    except HTTPException: raise
    except Exception as e:
        logger.error(f"Nutrient analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/diet-charts/{chart_id}/nutrient-report")
async def get_nutrient_report(chart_id: str, user: dict=Depends(get_current_user)):
    report = await db.nutrient_reports.find_one({"chart_id":chart_id},{"_id":0})
    if not report: raise HTTPException(status_code=404, detail="No report found — run analysis first")
    return report

# ==================== PRAKRITI ROUTES ====================

@api_router.get("/prakriti/questions")
async def get_prakriti_questions(current_user: dict=Depends(get_current_user)):
    return {"questions":PRAKRITI_QUESTIONS,"total":len(PRAKRITI_QUESTIONS)}

@api_router.post("/prakriti/assess")
async def submit_prakriti_assessment(request: PrakritiAssessmentRequest, current_user: dict=Depends(get_current_user)):
    patient = await db.patients.find_one({"id":request.patient_id,"user_id":current_user["id"]},{"_id":0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    if len(request.answers) != len(PRAKRITI_QUESTIONS): raise HTTPException(status_code=400, detail=f"Expected {len(PRAKRITI_QUESTIONS)} answers, got {len(request.answers)}")
    scores = calculate_prakriti_scores(request.answers)
    now = datetime.now(timezone.utc)
    doc = {"id":str(uuid.uuid4()),"patient_id":request.patient_id,"user_id":current_user["id"],"scores":scores.dict(),"answers":[a.dict() for a in request.answers],"assessed_at":now.isoformat(),"created_at":now.isoformat()}
    await db.prakriti_assessments.insert_one(doc)
    await db.patients.update_one({"id":request.patient_id},{"$set":{"prakriti":scores.dominant,"prakriti_score":scores.dict(),"last_assessed_at":now.isoformat(),"updated_at":now.isoformat()}})
    return {"id":doc["id"],"patient_id":request.patient_id,"scores":scores.dict(),"assessed_at":now.isoformat(),"message":f"Prakriti assessed as {scores.dominant}"}

@api_router.get("/prakriti/history/{patient_id}")
async def get_prakriti_history(patient_id: str, current_user: dict=Depends(get_current_user)):
    assessments = await db.prakriti_assessments.find({"patient_id":patient_id,"user_id":current_user["id"]},{"_id":0}).sort("assessed_at",-1).to_list(20)
    return {"assessments":assessments,"total":len(assessments)}

# ==================== RITUCHARYA ROUTES ====================

@api_router.get("/ritucharya/current")
async def get_current_season(current_user: dict=Depends(get_current_user)):
    return get_current_ritu()

@api_router.get("/ritucharya/all")
async def get_all_seasons(current_user: dict=Depends(get_current_user)):
    return {"seasons":[{"key":k,**v} for k,v in RITU_DATA.items()],"current":get_current_ritu()["key"]}

@api_router.get("/ritucharya/{month}")
async def get_season_for_month(month: int, current_user: dict=Depends(get_current_user)):
    if not 1 <= month <= 12: raise HTTPException(status_code=400, detail="Month must be 1-12")
    return get_ritu_for_month(month)

# ==================== HERB ROUTES ====================
# IMPORTANT: /herbs/seed must come before /herbs/{herb_id}
 
@api_router.post("/herbs", response_model=HerbResponse)
async def create_herb(herb: HerbCreate, user: dict = Depends(get_current_user)):
    hid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": hid, **herb.model_dump(), "created_at": now}
    await db.herbs.insert_one(doc)
    return HerbResponse(**{k: v for k, v in doc.items() if k != "_id"})
 
@api_router.get("/herbs", response_model=List[HerbResponse])
async def get_herbs(
    search:   Optional[str] = None,
    category: Optional[str] = None,
    dosha:    Optional[str] = None,
    user:     dict          = Depends(get_current_user)
):
    query = {}
    if search:   query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"name_hindi": {"$regex": search, "$options": "i"}}, {"name_sanskrit": {"$regex": search, "$options": "i"}}]
    if category: query["category"] = category
    if dosha:    query["primary_dosha_effect"] = {"$regex": dosha, "$options": "i"}
    herbs = await db.herbs.find(query, {"_id": 0}).sort("name", 1).to_list(200)
    result = []
    for h in herbs:
        try: result.append(HerbResponse(**h))
        except Exception as e: logger.warning(f"Skipping malformed herb {h.get('id')}: {e}")
    return result
 
@api_router.get("/herbs/seed")
async def seed_herbs(user: dict = Depends(get_current_user)):
    if await db.herbs.count_documents({}) > 10:
        return {"message": "Already seeded", "seeded": False}
    return {"trigger": "seed"}
 
@api_router.post("/herbs/seed")
async def seed_herbs_post(user: dict = Depends(get_current_user)):
    if await db.herbs.count_documents({}) > 10:
        return {"message": "Already seeded", "seeded": False, "count": await db.herbs.count_documents({})}
 
    herbs = [
        {"name":"Ashwagandha","name_hindi":"अश्वगंधा","name_sanskrit":"Withania somnifera","category":"Adaptogen","description":"King of Ayurvedic herbs. Powerful adaptogen that reduces stress, builds strength and immunity.","primary_dosha_effect":"Vata-Kapha pacifying","rasa":["Bitter","Astringent","Sweet"],"virya":"Hot","vipaka":"Sweet","indications":["Stress & anxiety","Fatigue & weakness","Low immunity","Insomnia","Low libido","Thyroid support"],"contraindications":["Pregnancy","Hyperthyroidism","Autoimmune conditions","With sedatives"],"dosage_powder_g":"3-6g","dosage_capsule":"1-2 caps (500mg) twice daily","best_taken_with":["Warm milk","Ghee","Honey"],"avoid_with":["Alcohol","Immunosuppressants"],"season_best":["Hemanta","Shishira"],"modern_research":"Studies show 11-15% reduction in cortisol; improves VO2 max in athletes","is_common":True},
        {"name":"Triphala","name_hindi":"त्रिफला","name_sanskrit":"Triphala","category":"Digestive","description":"Three-fruit formula (Amalaki, Bibhitaki, Haritaki). Most widely used Ayurvedic formulation for digestion and detox.","primary_dosha_effect":"Tridosha balancing","rasa":["Sweet","Sour","Pungent","Bitter","Astringent"],"virya":"Neutral","vipaka":"Sweet","indications":["Constipation","Poor digestion","Eye health","Detoxification","Weight management","Diabetes support"],"contraindications":["Pregnancy","Severe diarrhea","Dehydration"],"dosage_powder_g":"3-5g","dosage_capsule":"2 caps at bedtime","best_taken_with":["Warm water","Honey","Ghee"],"avoid_with":[],"season_best":["Varsha","Sharada"],"modern_research":"Antioxidant, anti-inflammatory; shown to improve gut microbiome diversity","is_common":True},
        {"name":"Brahmi","name_hindi":"ब्राह्मी","name_sanskrit":"Bacopa monnieri","category":"Nervine","description":"Brain tonic and nervine. Enhances memory, reduces anxiety, promotes sleep.","primary_dosha_effect":"Pitta-Vata pacifying","rasa":["Bitter","Astringent","Sweet"],"virya":"Cold","vipaka":"Sweet","indications":["Memory & cognition","Anxiety & stress","ADHD","Epilepsy support","Hair loss","Insomnia"],"contraindications":["Pregnancy","Hypothyroidism","With thyroid medications"],"dosage_powder_g":"1-3g","dosage_capsule":"1 cap (300mg) twice daily","best_taken_with":["Warm milk","Ghee","Almonds"],"avoid_with":["Thyroid medications","Sedatives"],"season_best":["Grishma","Sharada"],"modern_research":"Multiple RCTs show improved memory formation and recall; adaptogenic for cognitive stress","is_common":True},
        {"name":"Turmeric","name_hindi":"हल्दी","name_sanskrit":"Curcuma longa","category":"Anti-inflammatory","description":"Golden spice of Ayurveda. Powerful anti-inflammatory, antioxidant, and liver protective.","primary_dosha_effect":"Tridosha balancing","rasa":["Bitter","Pungent","Astringent"],"virya":"Hot","vipaka":"Pungent","indications":["Inflammation","Joint pain","Digestive issues","Liver disorders","Skin conditions","Diabetes","Cancer prevention"],"contraindications":["Bile duct obstruction","Gallstones in excess","Blood thinners in high dose"],"dosage_powder_g":"1-3g","dosage_capsule":"500mg twice daily","best_taken_with":["Black pepper","Warm milk","Ghee"],"avoid_with":["Blood thinners in medicinal dose"],"season_best":["Varsha","Hemanta"],"modern_research":"Curcumin shown effective in IBD, arthritis; bioavailability enhanced 2000% with piperine","is_common":True},
        {"name":"Shatavari","name_hindi":"शतावरी","name_sanskrit":"Asparagus racemosus","category":"Rejuvenative","description":"Queen of herbs for women. Hormonal balancer, galactagogue, and uterine tonic.","primary_dosha_effect":"Vata-Pitta pacifying","rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","indications":["Women's health","Hormonal imbalance","Menopause symptoms","Low milk production","Acidity","Infertility support"],"contraindications":["Kapha excess","Oedema","With diuretics"],"dosage_powder_g":"3-6g","dosage_capsule":"1-2 caps twice daily","best_taken_with":["Warm milk","Ghee","Honey"],"avoid_with":["Diuretics"],"season_best":["Grishma","Sharada"],"modern_research":"Phytoestrogens shown to balance estrogen; improves insulin sensitivity","is_common":True},
        {"name":"Trikatu","name_hindi":"त्रिकटु","name_sanskrit":"Trikatu","category":"Digestive","description":"Three pungents (Ginger, Black pepper, Long pepper). Powerful Agni kindler and metabolism booster.","primary_dosha_effect":"Kapha-Vata pacifying","rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","indications":["Low appetite","Slow digestion","Obesity","Respiratory congestion","Hypothyroidism","Cold & flu"],"contraindications":["Pitta excess","Gastric ulcers","Pregnancy","Hyperacidity"],"dosage_powder_g":"1-2g","dosage_capsule":"1 cap before meals","best_taken_with":["Honey","Warm water","Before meals"],"avoid_with":["Antacids","Empty stomach in Pitta types"],"season_best":["Vasanta","Hemanta"],"modern_research":"Piperine enhances bioavailability of other drugs/herbs by up to 2000%","is_common":True},
        {"name":"Guduchi","name_hindi":"गुडूची","name_sanskrit":"Tinospora cordifolia","category":"Immunomodulator","description":"Amrita — the divine nectar. Universal immune booster and anti-inflammatory.","primary_dosha_effect":"Tridosha balancing","rasa":["Bitter","Pungent","Astringent"],"virya":"Hot","vipaka":"Sweet","indications":["Low immunity","Chronic fever","Autoimmune conditions","Liver diseases","Gout","Diabetes"],"contraindications":["Pregnancy","Auto-immune disease (use cautiously)","With immunosuppressants"],"dosage_powder_g":"3-6g","dosage_decoction_ml":"40-80ml","dosage_capsule":"500mg twice daily","best_taken_with":["Warm water","Honey","Ginger"],"avoid_with":["Immunosuppressants"],"season_best":["Varsha","Sharada"],"modern_research":"Tinosporine modulates both innate and adaptive immunity; hepatoprotective in clinical trials","is_common":True},
        {"name":"Amalaki","name_hindi":"आंवला","name_sanskrit":"Emblica officinalis","category":"Rejuvenative","description":"Richest natural source of Vitamin C. Rasayana for longevity, hair, and eyes.","primary_dosha_effect":"Tridosha balancing","rasa":["Sour","Sweet","Pungent","Bitter","Astringent"],"virya":"Cold","vipaka":"Sweet","indications":["Vitamin C deficiency","Hair fall","Eye weakness","Liver health","Hyperacidity","Skin aging","Diabetes"],"contraindications":["Severe diarrhea","With antacids in excess","Cold & flu (raw fruit)"],"dosage_powder_g":"3-6g","dosage_capsule":"500mg twice daily","best_taken_with":["Honey","Warm water","Ghee"],"avoid_with":[],"season_best":["Sharada","Hemanta"],"modern_research":"600mg Vitamin C per 100g; polyphenols shown cardioprotective and anti-diabetic","is_common":True},
        {"name":"Neem","name_hindi":"नीम","name_sanskrit":"Azadirachta indica","category":"Anti-microbial","description":"Village pharmacy. Anti-bacterial, anti-fungal, blood purifier and skin healer.","primary_dosha_effect":"Pitta-Kapha pacifying","rasa":["Bitter","Astringent"],"virya":"Cold","vipaka":"Pungent","indications":["Skin infections","Blood disorders","Diabetes","Dental health","Intestinal worms","Fever"],"contraindications":["Pregnancy","Children under 5","Infertility (high dose)","Vata excess"],"dosage_powder_g":"1-3g","dosage_capsule":"250-500mg twice daily","best_taken_with":["Warm water","Honey"],"avoid_with":["Pregnancy","Trying to conceive"],"season_best":["Vasanta","Grishma"],"modern_research":"Nimbin and nimbidin show antibacterial against MRSA; antifungal against Candida","is_common":True},
        {"name":"Shilajit","name_hindi":"शिलाजीत","name_sanskrit":"Asphaltum","category":"Rejuvenative","description":"Mountain tar. Mineral-rich resin for energy, vitality, and anti-aging.","primary_dosha_effect":"Vata-Kapha pacifying","rasa":["Bitter","Pungent","Astringent"],"virya":"Hot","vipaka":"Pungent","indications":["Chronic fatigue","Male fertility","Altitude sickness","Cognitive decline","Diabetes","Urinary disorders"],"contraindications":["Gout","High uric acid","Hemochromatosis","Pregnancy"],"dosage_powder_g":"0.3-0.5g","dosage_capsule":"250-500mg daily","best_taken_with":["Warm milk","Honey","Ashwagandha"],"avoid_with":["High iron supplements","Gout medication"],"season_best":["Hemanta","Shishira"],"modern_research":"Fulvic acid improves mitochondrial function; testosterone increase shown in double-blind trials","is_common":True},
        {"name":"Licorice","name_hindi":"मुलेठी","name_sanskrit":"Glycyrrhiza glabra","category":"Expectorant","description":"Soothing, sweet, and harmonizing. Throat soother, adrenal support, and Pitta pacifier.","primary_dosha_effect":"Vata-Pitta pacifying","rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","indications":["Cough & sore throat","Gastric ulcers","Adrenal fatigue","Liver protection","Hormonal balance","Skin conditions"],"contraindications":["Hypertension","Oedema","Kidney disease","Pregnancy","Hypokalemia"],"dosage_powder_g":"1-3g","dosage_decoction_ml":"40ml","best_taken_with":["Honey","Warm milk","Ginger"],"avoid_with":["Antihypertensives","Diuretics","Corticosteroids"],"season_best":["Grishma","Sharada"],"modern_research":"Glycyrrhizin antiviral against H1N1, HSV; deglycyrrhizinated form safe for ulcers","is_common":True},
        {"name":"Gokshura","name_hindi":"गोखरू","name_sanskrit":"Tribulus terrestris","category":"Urinary","description":"Tribulus. Kidney tonic, urinary cleanser, and testosterone support.","primary_dosha_effect":"Vata-Pitta pacifying","rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","indications":["Kidney stones","UTI","Male fertility","Low testosterone","PCOS","Dysuria"],"contraindications":["Pregnancy","Prostate cancer","Dehydration"],"dosage_powder_g":"3-5g","dosage_capsule":"500mg twice daily","best_taken_with":["Warm milk","Warm water"],"avoid_with":["Diabetes medications","Lithium"],"season_best":["Grishma","Sharada"],"modern_research":"Saponins shown to increase LH and testosterone; diuretic effect confirmed in trials","is_common":True},
        {"name":"Haritaki","name_hindi":"हरीतकी","name_sanskrit":"Terminalia chebula","category":"Digestive","description":"King of medicines in Tibetan medicine. Laxative, rejuvenative, and Vata pacifier.","primary_dosha_effect":"Tridosha balancing","rasa":["Sweet","Sour","Pungent","Bitter","Astringent"],"virya":"Hot","vipaka":"Sweet","indications":["Constipation","Eye diseases","Skin conditions","Wound healing","Cough","Diabetes"],"contraindications":["Pregnancy","Severe dehydration","Extreme emaciation"],"dosage_powder_g":"3-5g","dosage_capsule":"500mg at bedtime","best_taken_with":["Warm water","Rock salt","Ghee"],"avoid_with":["Pregnancy"],"season_best":["Hemanta","Shishira"],"modern_research":"Chebulinic acid potent antioxidant; antimicrobial against H. pylori","is_common":True},
        {"name":"Manjistha","name_hindi":"मंजिष्ठा","name_sanskrit":"Rubia cordifolia","category":"Blood purifier","description":"Best Pitta-reducing herb. Lymphatic cleanser, skin brightener, and anti-inflammatory.","primary_dosha_effect":"Pitta-Kapha pacifying","rasa":["Sweet","Bitter","Astringent"],"virya":"Hot","vipaka":"Pungent","indications":["Skin disorders","Acne","Eczema","Psoriasis","Lymphatic congestion","UTI","Menstrual irregularity"],"contraindications":["Pregnancy","Kidney disease in high dose","Vata excess"],"dosage_powder_g":"3-6g","dosage_capsule":"500mg twice daily","best_taken_with":["Warm water","Honey","Neem"],"avoid_with":[],"season_best":["Grishma","Sharada"],"modern_research":"Purpurin and munjistin shown anti-proliferative in cancer cell lines","is_common":True},
        {"name":"Punarnava","name_hindi":"पुनर्नवा","name_sanskrit":"Boerhavia diffusa","category":"Diuretic","description":"Rejuvenator. Best Kapha-reducing herb for water retention, kidney health, and liver support.","primary_dosha_effect":"Kapha-Pitta pacifying","rasa":["Sweet","Bitter","Astringent"],"virya":"Hot","vipaka":"Sweet","indications":["Water retention","Oedema","Kidney disease","Liver disorders","Obesity","Anaemia","Arthritis"],"contraindications":["Pregnancy","Dehydration","With diuretics"],"dosage_powder_g":"3-6g","dosage_decoction_ml":"40-80ml","best_taken_with":["Warm water","Ginger","Honey"],"avoid_with":["Diuretics","Lithium"],"season_best":["Varsha","Vasanta"],"modern_research":"Punarnavine shown hepatoprotective; diuretic effect comparable to mild thiazides","is_common":False},
    ]
 
    now = datetime.now(timezone.utc).isoformat()
    for h in herbs:
        h["id"] = str(uuid.uuid4())
        h["created_at"] = now
 
    await db.herbs.insert_many(herbs)
    return {"message": f"Seeded {len(herbs)} herbs", "count": len(herbs), "seeded": True}
 
@api_router.get("/herbs/{herb_id}", response_model=HerbResponse)
async def get_herb(herb_id: str, user: dict = Depends(get_current_user)):
    h = await db.herbs.find_one({"id": herb_id}, {"_id": 0})
    if not h: raise HTTPException(status_code=404, detail="Herb not found")
    return HerbResponse(**h)
 
@api_router.delete("/herbs/{herb_id}")
async def delete_herb(herb_id: str, user: dict = Depends(get_current_user)):
    r = await db.herbs.delete_one({"id": herb_id})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Herb not found")
    return {"message": "Herb deleted"}
 


# ── Prescribe herbs on a diet chart ──
@api_router.post("/diet-charts/{chart_id}/prescribe-herbs")
async def prescribe_herbs(chart_id: str, body: dict, user: dict = Depends(get_current_user)):
    chart = await db.diet_charts.find_one({"id": chart_id, "user_id": user["id"]})
    if not chart: raise HTTPException(status_code=404, detail="Diet chart not found")
    herb_ids = body.get("herb_ids", [])
    herbs = await db.herbs.find({"id": {"$in": herb_ids}}, {"_id": 0}).to_list(20)
    await db.diet_charts.update_one({"id": chart_id}, {"$set": {"prescribed_herbs": herbs, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": f"Prescribed {len(herbs)} herbs", "herbs": herbs}
 

# ==================== PROGRESS TRACKING (DIETITIAN) ====================

@api_router.post("/progress/log", response_model=ProgressLogResponse)
async def create_progress_log(log: ProgressLogCreateWithPatient, user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": log.patient_id}, {"_id": 0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    existing = await db.progress_logs.find_one({"patient_id": log.patient_id, "date": log.date})
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.progress_logs.update_one({"patient_id": log.patient_id, "date": log.date}, {"$set": {**log.model_dump(), "logged_at": now}})
        updated = await db.progress_logs.find_one({"patient_id": log.patient_id, "date": log.date}, {"_id": 0})
        return ProgressLogResponse(**updated)
    log_id = str(uuid.uuid4())
    doc = {"id": log_id, **log.model_dump(), "logged_at": now, "user_id": user["id"]}
    await db.progress_logs.insert_one(doc)
    return ProgressLogResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/progress/{patient_id}")
async def get_progress_logs(patient_id: str, days: int = 30, user: dict = Depends(get_current_user)):
    from datetime import date, timedelta as td
    cutoff = (date.today() - td(days=days)).isoformat()
    logs = await db.progress_logs.find({"patient_id": patient_id, "date": {"$gte": cutoff}}, {"_id": 0}).sort("date", 1).to_list(200)
    weight_trend    = [{"date": l["date"], "value": l["weight_kg"]}           for l in logs if l.get("weight_kg")]
    energy_trend    = [{"date": l["date"], "value": l["energy_level"]}        for l in logs if l.get("energy_level")]
    sleep_trend     = [{"date": l["date"], "value": l["sleep_hours"]}         for l in logs if l.get("sleep_hours")]
    digestion_trend = [{"date": l["date"], "value": l["digestion_quality"]}   for l in logs if l.get("digestion_quality")]
    water_trend     = [{"date": l["date"], "value": l["water_intake_liters"]} for l in logs if l.get("water_intake_liters")]
    return {"logs": logs, "total": len(logs), "trends": {"weight": weight_trend, "energy": energy_trend, "sleep": sleep_trend, "digestion": digestion_trend, "water": water_trend}, "imbalance_analysis": detect_dosha_imbalance(logs)}

@api_router.delete("/progress/{log_id}")
async def delete_progress_log(log_id: str, user: dict = Depends(get_current_user)):
    result = await db.progress_logs.delete_one({"id": log_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Log deleted"}


# ==================== APPOINTMENTS ====================

@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentCreate, user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": data.patient_id, "user_id": user["id"]}, {"_id": 0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    appt_id = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    meeting_url = await create_jitsi_room(appt_id) if data.type == "video" else None  # ← CHECK THIS LINE
    doc = {"id": appt_id, "patient_id": data.patient_id, "patient_name": patient.get("name"), "dietitian_id": user["id"], "dietitian_name": user.get("name"), "date": data.date, "time_slot": data.time_slot, "type": data.type, "status": "confirmed", "notes": data.notes, "meeting_url": meeting_url, "duration_mins": data.duration_mins, "created_at": now, "updated_at": now}
    await db.appointments.insert_one(doc)
    return AppointmentResponse(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(patient_id: Optional[str]=None, status: Optional[str]=None, date_from: Optional[str]=None, date_to: Optional[str]=None, user: dict=Depends(get_current_user)):
    query: Dict[str, Any] = {"dietitian_id": user["id"]}
    if patient_id: query["patient_id"] = patient_id
    if status: query["status"] = status
    if date_from or date_to:
        query["date"] = {}
        if date_from: query["date"]["$gte"] = date_from
        if date_to: query["date"]["$lte"] = date_to
    appts = await db.appointments.find(query, {"_id": 0}).sort("date", 1).to_list(200)
    return [AppointmentResponse(**a) for a in appts]

@api_router.get("/appointments/slots/{date}")
async def get_available_slots(date: str, user: dict = Depends(get_current_user)):
    ALL_SLOTS = ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"]
    booked = await db.appointments.find({"dietitian_id": user["id"], "date": date, "status": {"$in": ["confirmed","pending"]}}, {"_id": 0, "time_slot": 1}).to_list(50)
    booked_slots = {a["time_slot"] for a in booked}
    return {"date": date, "available": [s for s in ALL_SLOTS if s not in booked_slots], "booked": list(booked_slots)}

@api_router.get("/appointments/{appt_id}", response_model=AppointmentResponse)
async def get_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    a = await db.appointments.find_one({"id": appt_id, "dietitian_id": user["id"]}, {"_id": 0})
    if not a: raise HTTPException(status_code=404, detail="Appointment not found")
    return AppointmentResponse(**a)


@api_router.put("/appointments/{appt_id}", response_model=AppointmentResponse)
async def update_appointment(appt_id: str, data: AppointmentUpdate, user: dict = Depends(get_current_user)):
    existing = await db.appointments.find_one({"id": appt_id, "dietitian_id": user["id"]}, {"_id": 0})
    if not existing: raise HTTPException(status_code=404, detail="Appointment not found")
    updates: Dict[str, Any] = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    if data.type == "video" and not existing.get("meeting_url"):
        updates["meeting_url"] = await create_jitsi_room(appt_id)  # ← CHECK THIS LINE
    await db.appointments.update_one({"id": appt_id}, {"$set": updates})
    updated = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    return AppointmentResponse(**updated)

@api_router.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    r = await db.appointments.delete_one({"id": appt_id, "dietitian_id": user["id"]})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted"}

# ==================== AYUASSIST CHATBOT ====================

@api_router.post("/ayuchat")
async def ayurveda_chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    history_text = ""
    if request.history and len(request.history) > 1:
        recent = request.history[-8:]
        for msg in recent[:-1]:
            role = "Dietitian" if msg["role"] == "user" else "AyuAssist"
            history_text += f"{role}: {msg['content']}\n"
    prompt = f"""You are AyuAssist, an expert Ayurvedic dietitian AI assistant embedded in AyuCare software.
You help Ayurvedic practitioners make evidence-based dietary decisions rooted in classical Ayurvedic texts (Charaka Samhita, Ashtanga Hridayam) combined with modern nutritional science.
YOUR EXPERTISE: Six tastes (Rasa), Virya, Vipaka, Dosha effects, Ritucharya, Agni, modern nutrition, Indian foods.
RESPONSE STYLE: Be concise but complete — 3 to 8 sentences. Use bullet points only when listing multiple foods or steps. Always mention Ayurvedic reasoning. Include specific Indian examples. Never replace medical advice.
{f"CONVERSATION SO FAR:{chr(10)}{history_text}" if history_text else ""}
CURRENT QUESTION: {request.message}
Respond as AyuAssist:"""
    try:
        reply = await call_ai(prompt, temperature=0.7)
        return {"reply": reply, "model": "gemini-2.5-flash"}
    except HTTPException as e: raise e
    except Exception as e:
        logger.error(f"Chatbot error: {e}")
        raise HTTPException(status_code=500, detail="Chatbot unavailable — please try again")

# ==================== PATIENT PORTAL — AUTH ====================

@api_router.post("/patient-portal/invite")
async def create_invite_code(data: InviteCodeCreate, user: dict = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": data.patient_id, "user_id": user["id"]}, {"_id": 0})
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    import random, string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    now  = datetime.now(timezone.utc)
    invite_doc = {"code": code, "patient_id": data.patient_id, "patient_name": patient.get("name"), "dietitian_id": user["id"], "dietitian_name": user.get("name"), "used": False, "created_at": now.isoformat(), "expires_at": (now + timedelta(hours=data.expires_hours)).isoformat()}
    await db.invite_codes.insert_one(invite_doc)
    return {"code": code, "patient_name": patient.get("name"), "expires_hours": data.expires_hours, "message": f"Share this code with {patient.get('name')} to register on the patient portal"}

@api_router.post("/patient-portal/register")
async def patient_portal_register(data: PatientPortalRegister):
    # 1. Force Uppercase and Trim to match frontend logic
    clean_code = data.invite_code.upper().strip()
    
    # 2. Find the code
    invite = await db.invite_codes.find_one({"code": clean_code, "used": False})
    
    if not invite:
        print(f"Registration Alert: Code {clean_code} not found or already used") # Debug log
        raise HTTPException(status_code=400, detail="Invalid or already used invite code")

    # 3. Robust Date Parsing
    try:
        # Better way to handle ISO dates in Python 3.11+
        expires_at_str = invite["expires_at"].replace("Z", "+00:00")
        expires_at = datetime.fromisoformat(expires_at_str)
        
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Invite code has expired")
    except Exception as e:
        print(f"Date Error: {e}")
        # If the date format is broken, we'll allow it for now so the user isn't stuck
        pass

    # 4. Check for existing email
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # 5. Success Logic
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": uid, 
        "email": data.email, 
        "password_hash": hash_password(data.password), 
        "name": data.name, 
        "role": "patient", 
        "patient_id": invite["patient_id"], 
        "dietitian_id": invite["dietitian_id"], 
        "created_at": now
    }

    await db.users.insert_one(user_doc)
    
    # Update linked records
    await db.invite_codes.update_one({"code": clean_code}, {"$set": {"used": True, "used_by": uid, "used_at": now}})
    await db.patients.update_one({"id": invite["patient_id"]}, {"$set": {"portal_user_id": uid, "portal_email": data.email}})
    
    token = create_token(uid, data.email)
    
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": uid, 
            "email": data.email, 
            "name": data.name, 
            "role": "patient", 
            "patient_id": invite["patient_id"]
        }
    }

@api_router.post("/patient-portal/login")
async def patient_portal_login(credentials: PatientPortalLogin):
    print(f"[PATIENT LOGIN ATTEMPT] email={credentials.email}")  # ← ADD
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    print(f"[PATIENT LOGIN] user found={user is not None}, role={user.get('role') if user else 'N/A'}")  # ← ADD
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="This login is for patients only")
    token = create_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": "patient", "patient_id": user.get("patient_id")}}

# --- Route ---
@app.post("/api/patient-portal/invite/send-email")
async def send_invite_email_route(
    req: SendInviteEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    import traceback

    # Step 1 — check env vars first
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if not smtp_email or not smtp_password:
        raise HTTPException(
            status_code=500,
            detail=f"SMTP not configured. SMTP_EMAIL={'set' if smtp_email else 'MISSING'}, SMTP_PASSWORD={'set' if smtp_password else 'MISSING'}"
        )

    # Step 2 — verify invite code exists
    invite = await db.invite_codes.find_one({
        "code": req.invite_code,
        "dietitian_id": str(current_user.get("_id") or current_user.get("user_id") or current_user.get("id"))
    })
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found or does not belong to you")

    # Step 3 — generate QR + send email
    try:
        register_url = f"{frontend_url}/patient/register"
        qr_data = f"{register_url}?code={req.invite_code}"
        qr_base64 = generate_qr_base64(qr_data)
        send_invite_email(req.patient_email, req.patient_name, req.invite_code, qr_base64, register_url)
        return {
            "message": "Invite email sent successfully",
            "qr_base64": qr_base64
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ==================== PATIENT PORTAL — DATA ====================

@api_router.get("/patient-portal/me")
async def patient_portal_me(patient_user: dict = Depends(get_current_patient)):
    patient = await db.patients.find_one({"id": patient_user.get("patient_id")}, {"_id": 0})
    return {"user": {k: v for k, v in patient_user.items() if k != "password_hash"}, "patient": patient}

@api_router.get("/patient-portal/dashboard")
async def patient_portal_dashboard(patient_user: dict = Depends(get_current_patient)):
    patient_id = patient_user.get("patient_id")
    patient      = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    charts_count = await db.diet_charts.count_documents({"patient_id": patient_id})
    latest_chart = await db.diet_charts.find_one({"patient_id": patient_id}, {"_id": 0})
    latest_log   = await db.progress_logs.find_one({"patient_id": patient_id}, {"_id": 0}, sort=[("date", -1)])
    upcoming_appt = await db.appointments.find_one({"patient_id": patient_id, "status": {"$in": ["confirmed","pending"]}}, {"_id": 0}, sort=[("date", 1)])
    return {"patient": patient, "charts_count": charts_count, "latest_chart": latest_chart, "latest_log": latest_log, "upcoming_appointment": upcoming_appt, "current_season": get_current_ritu()}

@api_router.get("/patient-portal/diet-charts")
async def patient_portal_diet_charts(patient_user: dict = Depends(get_current_patient)):
    charts = await db.diet_charts.find({"patient_id": patient_user.get("patient_id")}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"charts": charts, "total": len(charts)}

@api_router.get("/patient-portal/diet-charts/{chart_id}")
async def patient_portal_diet_chart_detail(chart_id: str, patient_user: dict = Depends(get_current_patient)):
    chart = await db.diet_charts.find_one({"id": chart_id, "patient_id": patient_user.get("patient_id")}, {"_id": 0})
    if not chart: raise HTTPException(status_code=404, detail="Diet chart not found")
    return chart

@api_router.get("/patient-portal/prakriti")
async def patient_portal_prakriti(patient_user: dict = Depends(get_current_patient)):
    patient_id  = patient_user.get("patient_id")
    assessments = await db.prakriti_assessments.find({"patient_id": patient_id}, {"_id": 0}).sort("assessed_at", -1).to_list(1)
    patient     = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return {"prakriti": patient.get("prakriti"), "prakriti_score": patient.get("prakriti_score"), "last_assessed_at": patient.get("last_assessed_at"), "latest_assessment": assessments[0] if assessments else None}

# ── Progress (patient portal) — SINGLE definition each ──────────────────────

@api_router.post("/patient-portal/progress/log")
async def patient_log_progress(log: ProgressLogCreate, patient_user: dict = Depends(get_current_patient)):
    patient_id = patient_user.get("patient_id")
    log_data   = log.model_dump()
    log_data["patient_id"] = patient_id
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.progress_logs.find_one({"patient_id": patient_id, "date": log_data["date"]})
    if existing:
        await db.progress_logs.update_one({"patient_id": patient_id, "date": log_data["date"]}, {"$set": {**log_data, "logged_at": now}})
        return {"message": "Progress updated", "date": log_data["date"]}
    log_data["id"]        = str(uuid.uuid4())
    log_data["logged_at"] = now
    log_data["user_id"]   = patient_user["id"]
    await db.progress_logs.insert_one(log_data)
    return {"message": "Progress logged successfully", "date": log_data["date"]}

@api_router.get("/patient-portal/progress")
async def patient_get_progress(days: int = 30, patient_user: dict = Depends(get_current_patient)):
    from datetime import date, timedelta as td
    patient_id = patient_user.get("patient_id")
    cutoff     = (date.today() - td(days=days)).isoformat()
    logs = await db.progress_logs.find({"patient_id": patient_id, "date": {"$gte": cutoff}}, {"_id": 0}).sort("date", 1).to_list(200)
    weight_trend    = [{"date": l["date"], "value": l["weight_kg"]}           for l in logs if l.get("weight_kg")]
    energy_trend    = [{"date": l["date"], "value": l["energy_level"]}        for l in logs if l.get("energy_level")]
    sleep_trend     = [{"date": l["date"], "value": l["sleep_hours"]}         for l in logs if l.get("sleep_hours")]
    digestion_trend = [{"date": l["date"], "value": l["digestion_quality"]}   for l in logs if l.get("digestion_quality")]
    water_trend     = [{"date": l["date"], "value": l["water_intake_liters"]} for l in logs if l.get("water_intake_liters")]

    # Compute daily streak from sorted dates
    def _compute_streak(log_list):
        if not log_list:
            return 0
        dates = sorted(set(l["date"] for l in log_list), reverse=True)
        today_str = date.today().isoformat()
        yesterday_str = (date.today() - td(days=1)).isoformat()
        if dates[0] not in (today_str, yesterday_str):
            return 0
        streak = 1
        for i in range(1, len(dates)):
            prev = date.fromisoformat(dates[i - 1])
            curr = date.fromisoformat(dates[i])
            if (prev - curr).days == 1:
                streak += 1
            else:
                break
        return streak

    streak = _compute_streak(logs)

    return {
        "logs":               logs,
        "total":              len(logs),
        "streak":             streak,
        "trends": {
            "weight":    weight_trend,
            "energy":    energy_trend,
            "sleep":     sleep_trend,
            "digestion": digestion_trend,
            "water":     water_trend,
        },
        "imbalance_analysis": detect_dosha_imbalance(logs),
    }

# ── Appointments (patient portal) ───────────────────────────────────────────

@api_router.get("/patient-portal/appointments")
async def patient_get_appointments(patient_user: dict = Depends(get_current_patient)):
    appts = await db.appointments.find({"patient_id": patient_user.get("patient_id")}, {"_id": 0}).sort("date", 1).to_list(50)
    return {"appointments": appts, "total": len(appts)}

@api_router.post("/patient-portal/appointments/request")
async def patient_request_appointment(data: AppointmentCreate, patient_user: dict = Depends(get_current_patient)):
    patient_id = patient_user.get("patient_id")
    patient    = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient: raise HTTPException(status_code=404, detail="Patient record not found")
    dietitian_id = patient.get("user_id")
    dietitian    = await db.users.find_one({"id": dietitian_id}, {"_id": 0})
    appt_id = str(uuid.uuid4()); now = datetime.now(timezone.utc).isoformat()
    meeting_url = await create_jitsi_room(appt_id) if data.type == "video" else None  # ← CHECK THIS LINE
    doc = {"id": appt_id, "patient_id": patient_id, "patient_name": patient.get("name"), "dietitian_id": dietitian_id, "dietitian_name": dietitian.get("name") if dietitian else None, "date": data.date, "time_slot": data.time_slot, "type": data.type, "status": "pending", "notes": data.notes, "meeting_url": meeting_url, "duration_mins": data.duration_mins, "created_at": now, "updated_at": now}
    await db.appointments.insert_one(doc)
    return {"message": "Appointment request sent to your dietitian", "appointment": {k: v for k, v in doc.items() if k != "_id"}}

@api_router.delete("/patient-portal/appointments/{appt_id}/cancel")
async def patient_cancel_appointment(appt_id: str, patient_user: dict = Depends(get_current_patient)):
    appt = await db.appointments.find_one({"id": appt_id, "patient_id": patient_user.get("patient_id")}, {"_id": 0})
    if not appt: raise HTTPException(status_code=404, detail="Appointment not found")
    if appt["status"] not in ("pending","confirmed"): raise HTTPException(status_code=400, detail="Cannot cancel this appointment")
    await db.appointments.update_one({"id": appt_id}, {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Appointment cancelled"}

# ==================== PDF ====================

# ==================== ENHANCED PDF GENERATION ====================
# Replace your existing /diet-charts/{chart_id}/pdf route with this

@api_router.get("/diet-charts/{chart_id}/pdf")
async def generate_pdf(chart_id: str, user: dict = Depends(get_current_user)):
    chart   = await db.diet_charts.find_one({"id": chart_id, "user_id": user["id"]}, {"_id": 0})
    if not chart: raise HTTPException(status_code=404, detail="Diet chart not found")
    patient = await db.patients.find_one({"id": chart["patient_id"]}, {"_id": 0})
    dietitian = user

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    doc = SimpleDocTemplate(
        tmp.name, pagesize=A4,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )

    # ── Colour palette ──
    PRIMARY    = colors.HexColor('#2F5233')
    SECONDARY  = colors.HexColor('#D4A373')
    LIGHT_BG   = colors.HexColor('#F2F7F4')
    AMBER_BG   = colors.HexColor('#FFFBEB')
    AMBER_BORDER = colors.HexColor('#D97706')
    WHITE      = colors.white
    STONE_600  = colors.HexColor('#57534E')
    STONE_400  = colors.HexColor('#A8A29E')
    RED_600    = colors.HexColor('#DC2626')

    styles = getSampleStyleSheet()

    # ── Custom styles ──
    title_style = ParagraphStyle('AyuTitle', parent=styles['Title'],
        fontSize=22, textColor=PRIMARY, fontName='Helvetica-Bold',
        spaceAfter=4, leading=28)
    subtitle_style = ParagraphStyle('AyuSubtitle', parent=styles['Normal'],
        fontSize=11, textColor=SECONDARY, spaceAfter=2)
    heading_style = ParagraphStyle('AyuHeading', parent=styles['Heading2'],
        fontSize=13, textColor=PRIMARY, fontName='Helvetica-Bold',
        spaceBefore=14, spaceAfter=6, leading=18)
    subheading_style = ParagraphStyle('AyuSub', parent=styles['Normal'],
        fontSize=10, textColor=PRIMARY, fontName='Helvetica-Bold',
        spaceBefore=8, spaceAfter=4)
    body_style = ParagraphStyle('AyuBody', parent=styles['Normal'],
        fontSize=9, textColor=STONE_600, leading=14, spaceAfter=4)
    small_style = ParagraphStyle('AyuSmall', parent=styles['Normal'],
        fontSize=8, textColor=STONE_400, leading=12)
    label_style = ParagraphStyle('AyuLabel', parent=styles['Normal'],
        fontSize=8, textColor=STONE_400, fontName='Helvetica-Bold',
        spaceAfter=2, leading=12)
    value_style = ParagraphStyle('AyuValue', parent=styles['Normal'],
        fontSize=10, textColor=STONE_600, fontName='Helvetica-Bold', leading=14)
    meal_item_style = ParagraphStyle('MealItem', parent=styles['Normal'],
        fontSize=9, textColor=STONE_600, leading=13, leftIndent=10)
    note_style = ParagraphStyle('Note', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#92400E'), leading=12,
        leftIndent=8, fontName='Helvetica-Oblique')

    elems = []

    # ════════════════════════════════════════════════════════
    # HEADER BANNER
    # ════════════════════════════════════════════════════════
    header_data = [[
        Paragraph('<font color="#FFFFFF"><b>🌿 AyuCare</b></font>', ParagraphStyle('h', parent=styles['Normal'], fontSize=18, textColor=WHITE, fontName='Helvetica-Bold', leading=24)),
        Paragraph(f'<font color="#E1EDE5">Ayurvedic Diet Management System</font><br/><font color="#90A955" size="8">Generated: {datetime.now().strftime("%d %B %Y, %I:%M %p")}</font>', ParagraphStyle('hs', parent=styles['Normal'], fontSize=9, textColor=WHITE, leading=14))
    ]]
    header_table = Table(header_data, colWidths=[160, 355])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (0,-1), 16),
        ('RIGHTPADDING', (-1,0), (-1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    elems.append(header_table)
    elems.append(Spacer(1, 16))

    # ════════════════════════════════════════════════════════
    # DIET CHART TITLE
    # ════════════════════════════════════════════════════════
    elems.append(Paragraph(chart.get("title", "Diet Plan"), title_style))
    if chart.get("season_name"):
        elems.append(Paragraph(f'🌿 {chart["season_name"]} Season Plan', subtitle_style))
    elems.append(Spacer(1, 10))

    # ════════════════════════════════════════════════════════
    # PATIENT + DIETITIAN INFO (2-column)
    # ════════════════════════════════════════════════════════
    if patient:
        prakriti_score = patient.get("prakriti_score", {})
        dosha_text = ""
        if prakriti_score:
            dosha_text = f"Vata {prakriti_score.get('vata',0)}% | Pitta {prakriti_score.get('pitta',0)}% | Kapha {prakriti_score.get('kapha',0)}%"

        info_data = [
            [
                Paragraph('<b>PATIENT DETAILS</b>', label_style),
                Paragraph('<b>PRESCRIBING DIETITIAN</b>', label_style)
            ],
            [
                Paragraph(f'<b>{patient.get("name","—")}</b>', value_style),
                Paragraph(f'<b>Dr. {dietitian.get("name","—")}</b>', value_style)
            ],
            [
                Paragraph(f'{patient.get("age","—")} yrs | {patient.get("gender","—")} | BMI: {patient.get("bmi","—")}', body_style),
                Paragraph(f'{dietitian.get("email","—")}', body_style)
            ],
            [
                Paragraph(f'Prakriti: <b>{patient.get("prakriti","Not assessed")}</b>', body_style),
                Paragraph(f'Date: {datetime.now().strftime("%d %B %Y")}', body_style)
            ],
        ]
        if dosha_text:
            info_data.append([Paragraph(dosha_text, small_style), Paragraph("", small_style)])

        info_table = Table(info_data, colWidths=[257, 258])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), LIGHT_BG),
            ('BACKGROUND', (0,1), (-1,-1), WHITE),
            ('BOX', (0,0), (0,-1), 0.5, PRIMARY),
            ('BOX', (1,0), (1,-1), 0.5, PRIMARY),
            ('LINEAFTER', (0,0), (0,-1), 0.5, PRIMARY),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        elems.append(info_table)
        elems.append(Spacer(1, 12))

    # ════════════════════════════════════════════════════════
    # SUMMARY BAR (calories / protein / carbs / fat / days)
    # ════════════════════════════════════════════════════════
    nut = chart.get("total_daily_nutrients", {})
    summary_data = [[
        Paragraph(f'<b>{chart.get("target_calories","—")}</b><br/><font size="7" color="#78716C">kcal/day</font>', ParagraphStyle('sc', parent=styles['Normal'], fontSize=13, textColor=PRIMARY, fontName='Helvetica-Bold', alignment=1, leading=18)),
        Paragraph(f'<b>{nut.get("protein_g","—")}g</b><br/><font size="7" color="#78716C">Protein</font>',       ParagraphStyle('sc', parent=styles['Normal'], fontSize=13, textColor=PRIMARY, fontName='Helvetica-Bold', alignment=1, leading=18)),
        Paragraph(f'<b>{nut.get("carbs_g","—")}g</b><br/><font size="7" color="#78716C">Carbs</font>',           ParagraphStyle('sc', parent=styles['Normal'], fontSize=13, textColor=PRIMARY, fontName='Helvetica-Bold', alignment=1, leading=18)),
        Paragraph(f'<b>{nut.get("fat_g","—")}g</b><br/><font size="7" color="#78716C">Fat</font>',               ParagraphStyle('sc', parent=styles['Normal'], fontSize=13, textColor=PRIMARY, fontName='Helvetica-Bold', alignment=1, leading=18)),
        Paragraph(f'<b>{len(chart.get("meals",[]))}</b><br/><font size="7" color="#78716C">Days</font>',           ParagraphStyle('sc', parent=styles['Normal'], fontSize=13, textColor=PRIMARY, fontName='Helvetica-Bold', alignment=1, leading=18)),
    ]]
    summary_table = Table(summary_data, colWidths=[103]*5)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#C3DBC9')),
        ('INNERGRID', (0,0), (-1,-1), 0.3, colors.HexColor('#C3DBC9')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    elems.append(summary_table)
    elems.append(Spacer(1, 12))

    # ════════════════════════════════════════════════════════
    # SEASONAL NOTES
    # ════════════════════════════════════════════════════════
    ritu_principles = chart.get("ritu_principles", [])
    if ritu_principles:
        elems.append(Paragraph("🌿 Seasonal Dietary Principles (Ritucharya)", heading_style))
        season_data = [[Paragraph(f"• {p}", body_style)] for p in ritu_principles[:4]]
        season_table = Table(season_data, colWidths=[515])
        season_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), AMBER_BG),
            ('BOX', (0,0), (-1,-1), 0.5, AMBER_BORDER),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        elems.append(season_table)
        elems.append(Spacer(1, 10))

    # ════════════════════════════════════════════════════════
    # AYURVEDIC NOTES
    # ════════════════════════════════════════════════════════
    if chart.get("notes"):
        elems.append(Paragraph("📋 Dietitian's Notes", heading_style))
        elems.append(Paragraph(chart["notes"], body_style))
        elems.append(Spacer(1, 8))

    # ════════════════════════════════════════════════════════
    # PRESCRIBED HERBS (if any)
    # ════════════════════════════════════════════════════════
    prescribed_herbs = chart.get("prescribed_herbs", [])
    if prescribed_herbs:
        elems.append(Paragraph("🌱 Prescribed Herbs & Supplements", heading_style))
        herb_header = [
            Paragraph('<b>Herb</b>', label_style),
            Paragraph('<b>Dosage</b>', label_style),
            Paragraph('<b>Take With</b>', label_style),
            Paragraph('<b>Indications</b>', label_style),
        ]
        herb_rows = [herb_header]
        for h in prescribed_herbs:
            dosage = h.get("dosage_capsule") or h.get("dosage_powder_g", "As directed")
            herb_rows.append([
                Paragraph(f'<b>{h.get("name","")}</b><br/><font size="7" color="#78716C">{h.get("name_hindi","")}</font>', body_style),
                Paragraph(dosage, body_style),
                Paragraph(", ".join(h.get("best_taken_with", [])[:2]), body_style),
                Paragraph(", ".join(h.get("indications", [])[:2]), body_style),
            ])
        herb_table = Table(herb_rows, colWidths=[130, 110, 110, 165])
        herb_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), PRIMARY),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('BACKGROUND', (0,1), (-1,-1), WHITE),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
            ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#C3DBC9')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        elems.append(herb_table)
        elems.append(Spacer(1, 12))

    # ════════════════════════════════════════════════════════
    # DAILY MEAL PLANS
    # ════════════════════════════════════════════════════════
    meal_type_order = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner']
    meal_labels = {'breakfast':'Breakfast 🌅','mid_morning':'Mid-Morning ☀️','lunch':'Lunch 🍽','evening_snack':'Evening Snack 🌤','dinner':'Dinner 🌙'}

    for day_meal in chart.get("meals", []):
        elems.append(Paragraph(f"Day {day_meal.get('day', '?')} — Meal Plan", heading_style))

        rows = [[
            Paragraph('<b>Meal</b>', label_style),
            Paragraph('<b>Time</b>', label_style),
            Paragraph('<b>Food Items</b>', label_style),
            Paragraph('<b>Kcal</b>', label_style),
        ]]

        day_total = 0
        for mt in meal_type_order:
            meal = day_meal.get(mt)
            if not meal: continue
            items_text = "<br/>".join([f"• {item}" for item in (meal.get("items") or [])])
            note = meal.get("ayurvedic_note", "")
            if note:
                items_text += f'<br/><font size="7" color="#92400E"><i>💡 {note}</i></font>'
            cal = meal.get("calories", 0)
            day_total += cal
            rows.append([
                Paragraph(meal_labels.get(mt, mt), subheading_style),
                Paragraph(meal.get("time", "—"), body_style),
                Paragraph(items_text or "—", meal_item_style),
                Paragraph(str(cal) if cal else "—", body_style),
            ])

        # Total row
        rows.append([
            Paragraph('<b>Daily Total</b>', ParagraphStyle('dt', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=PRIMARY)),
            Paragraph('', body_style),
            Paragraph('', body_style),
            Paragraph(f'<b>{day_total}</b>', ParagraphStyle('dt', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', textColor=PRIMARY)),
        ])

        meal_table = Table(rows, colWidths=[95, 60, 295, 65])
        meal_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), PRIMARY),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('BACKGROUND', (0,-1), (-1,-1), LIGHT_BG),
            ('ROWBACKGROUNDS', (0,1), (-1,-2), [WHITE, LIGHT_BG]),
            ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#C3DBC9')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        elems.append(meal_table)
        elems.append(Spacer(1, 10))

    # ════════════════════════════════════════════════════════
    # ALLERGIES / AVOID FOODS WARNING
    # ════════════════════════════════════════════════════════
    allergies = patient.get("allergies", []) if patient else []
    if allergies:
        warn_data = [[Paragraph(f'⚠️  <b>ALLERGY ALERT:</b> Patient is allergic to: {", ".join(allergies)}. Ensure all meals avoid these items.', ParagraphStyle('warn', parent=styles['Normal'], fontSize=9, textColor=RED_600, fontName='Helvetica', leading=13))]]
        warn_table = Table(warn_data, colWidths=[515])
        warn_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')),
            ('BOX', (0,0), (-1,-1), 1, RED_600),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        elems.append(warn_table)
        elems.append(Spacer(1, 10))

    # ════════════════════════════════════════════════════════
    # FOOTER
    # ════════════════════════════════════════════════════════
    elems.append(Spacer(1, 10))
    footer_data = [[
        Paragraph(f'<font color="#FFFFFF" size="8">AyuCare — Ayurvedic Diet Management System | Prepared by Dr. {dietitian.get("name","—")}</font>', ParagraphStyle('ft', parent=styles['Normal'], fontSize=8, textColor=WHITE)),
        Paragraph(f'<font color="#90A955" size="8">{chart.get("start_date","—")} to {chart.get("end_date","—")}</font>', ParagraphStyle('ft2', parent=styles['Normal'], fontSize=8, textColor=WHITE, alignment=2)),
    ]]
    footer_table = Table(footer_data, colWidths=[380, 135])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    elems.append(footer_table)

    doc.build(elems)
    return FileResponse(tmp.name, media_type="application/pdf", filename=f"AyuCare_DietPlan_{patient.get('name','patient').replace(' ','_')}_{chart_id[:6]}.pdf")

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    from datetime import date as _date, timedelta as _td

    uid = user["id"]

    # ── Basic counts (fast parallel queries) ──
    patient_count, chart_count, recipe_count, food_count = await asyncio.gather(
        db.patients.count_documents({"user_id": uid}),
        db.diet_charts.count_documents({"user_id": uid}),
        db.recipes.count_documents({"user_id": uid}),
        db.foods.count_documents({}),
    )

    # ── Recent patients & charts ──
    recent_patients = await db.patients.find(
        {"user_id": uid}, {"_id": 0, "id": 1, "name": 1, "prakriti": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)

    recent_charts = await db.diet_charts.find(
        {"user_id": uid}, {"_id": 0, "id": 1, "title": 1, "patient_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)

    prakriti_distribution = await db.patients.aggregate([
        {"$match": {"user_id": uid, "prakriti": {"$ne": None}}},
        {"$group": {"_id": "$prakriti", "count": {"$sum": 1}}}
    ]).to_list(10)

    # ── Patient activity — use aggregation instead of per-patient loop ──
    cutoff_7      = (_date.today() - _td(days=7)).isoformat()
    cutoff_active = (_date.today() - _td(days=2)).isoformat()

    # Get all patients for this dietitian
    all_patients = await db.patients.find(
        {"user_id": uid}, {"_id": 0, "id": 1, "name": 1, "prakriti": 1}
    ).to_list(500)

    if not all_patients:
        return {
            "patient_count": patient_count, "chart_count": chart_count,
            "recipe_count": recipe_count, "food_count": food_count,
            "active_count": 0, "recent_patients": recent_patients,
            "recent_charts": recent_charts, "prakriti_distribution": prakriti_distribution,
            "inactive_patients": [],
        }

    patient_ids = [p["id"] for p in all_patients]

    # Single aggregation to get last log date per patient
    pipeline = [
        {"$match": {"patient_id": {"$in": patient_ids}}},
        {"$group": {"_id": "$patient_id", "last_date": {"$max": "$date"}}},
    ]
    last_log_docs = await db.progress_logs.aggregate(pipeline).to_list(500)
    last_log_map = {doc["_id"]: doc["last_date"] for doc in last_log_docs}

    inactive_patients = []
    active_count = 0

    for p in all_patients:
        last_date = last_log_map.get(p["id"])
        if last_date and last_date >= cutoff_active:
            active_count += 1
        if not last_date or last_date < cutoff_7:
            days_since = (
                (_date.today() - _date.fromisoformat(last_date)).days
                if last_date else None
            )
            inactive_patients.append({
                "id": p["id"], "name": p["name"],
                "prakriti": p.get("prakriti"),
                "last_logged": last_date, "days_since": days_since,
            })

    inactive_patients.sort(
        key=lambda x: (x["last_logged"] is not None, x.get("days_since") or 9999)
    )

    return {
        "patient_count":         patient_count,
        "chart_count":           chart_count,
        "recipe_count":          recipe_count,
        "food_count":            food_count,
        "active_count":          active_count,
        "recent_patients":       recent_patients,
        "recent_charts":         recent_charts,
        "prakriti_distribution": prakriti_distribution,
        "inactive_patients":     inactive_patients[:8],
    }

# ==================== SEED ====================

@api_router.post("/seed/foods")
async def seed_foods_database():
    if await db.foods.count_documents({}) > 50:
        return {"message":"Database already seeded","seeded":False}
    foods = [
    # ── GRAINS ──────────────────────────────────────────────────────────────
    {"name":"Rice (White)","category":"Grains","calories":130,"protein_g":2.7,"carbs_g":28,"fat_g":0.3,"fiber_g":0.4,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rice (Brown)","category":"Grains","calories":216,"protein_g":4.5,"carbs_g":45,"fat_g":1.8,"fiber_g":3.5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Basmati Rice","category":"Grains","calories":121,"protein_g":3.5,"carbs_g":25,"fat_g":0.4,"fiber_g":0.6,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Wheat","category":"Grains","calories":340,"protein_g":13,"carbs_g":72,"fat_g":2.5,"fiber_g":12,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Whole Wheat Flour (Atta)","category":"Grains","calories":339,"protein_g":13.2,"carbs_g":72,"fat_g":2.5,"fiber_g":10.7,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Maida (Refined Flour)","category":"Grains","calories":348,"protein_g":10,"carbs_g":76,"fat_g":0.9,"fiber_g":2.7,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Semolina (Suji/Rava)","category":"Grains","calories":360,"protein_g":12.7,"carbs_g":73,"fat_g":1.1,"fiber_g":3.9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Corn (Maize)","category":"Grains","calories":86,"protein_g":3.3,"carbs_g":19,"fat_g":1.4,"fiber_g":2.7,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cornflour (Makki Atta)","category":"Grains","calories":361,"protein_g":6.9,"carbs_g":79,"fat_g":3.9,"fiber_g":7.3,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Jowar (Sorghum)","category":"Grains","calories":329,"protein_g":10.4,"carbs_g":72,"fat_g":3.5,"fiber_g":6.3,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Bajra (Pearl Millet)","category":"Grains","calories":363,"protein_g":11.6,"carbs_g":67,"fat_g":5,"fiber_g":11.5,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ragi (Finger Millet)","category":"Grains","calories":336,"protein_g":7.3,"carbs_g":72.6,"fat_g":1.5,"fiber_g":3.6,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Oats","category":"Grains","calories":389,"protein_g":16.9,"carbs_g":66,"fat_g":6.9,"fiber_g":10.6,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Poha (Flattened Rice)","category":"Grains","calories":334,"protein_g":6.5,"carbs_g":76,"fat_g":0.5,"fiber_g":1.5,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Puffed Rice (Murmura)","category":"Grains","calories":402,"protein_g":7.6,"carbs_g":87,"fat_g":0.4,"fiber_g":1.0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sabudana (Tapioca Pearls)","category":"Grains","calories":352,"protein_g":0.2,"carbs_g":86,"fat_g":0.0,"fiber_g":0.9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Amaranth (Rajgira)","category":"Grains","calories":371,"protein_g":13.6,"carbs_g":65,"fat_g":7,"fiber_g":6.7,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Buckwheat (Kuttu)","category":"Grains","calories":343,"protein_g":13.3,"carbs_g":71,"fat_g":3.4,"fiber_g":10,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rice Flour","category":"Grains","calories":366,"protein_g":6,"carbs_g":80,"fat_g":1.4,"fiber_g":2.4,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Besan (Chickpea Flour)","category":"Grains","calories":387,"protein_g":22,"carbs_g":58,"fat_g":6,"fiber_g":10.8,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── LENTILS & PULSES ─────────────────────────────────────────────────────
    {"name":"Moong Dal (Split Green Gram)","category":"Lentils","calories":347,"protein_g":24,"carbs_g":63,"fat_g":1.2,"fiber_g":16,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Toor Dal (Split Pigeon Pea)","category":"Lentils","calories":343,"protein_g":22,"carbs_g":63,"fat_g":1.5,"fiber_g":15,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light"],"dosha_effect":{"vata":"neutral","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Chana Dal (Split Bengal Gram)","category":"Lentils","calories":372,"protein_g":22,"carbs_g":57,"fat_g":5,"fiber_g":17.6,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Urad Dal (Black Gram)","category":"Lentils","calories":341,"protein_g":25,"carbs_g":59,"fat_g":1.6,"fiber_g":18,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Masoor Dal (Red Lentil)","category":"Lentils","calories":353,"protein_g":25,"carbs_g":60,"fat_g":1.1,"fiber_g":10.7,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Whole Moong (Green Gram)","category":"Lentils","calories":347,"protein_g":23.9,"carbs_g":62,"fat_g":1.2,"fiber_g":16.3,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Whole Urad (Black Gram Whole)","category":"Lentils","calories":341,"protein_g":25,"carbs_g":59,"fat_g":1.6,"fiber_g":18,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Kabuli Chana (Chickpea)","category":"Lentils","calories":364,"protein_g":19,"carbs_g":61,"fat_g":6,"fiber_g":17,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Kala Chana (Black Chickpea)","category":"Lentils","calories":378,"protein_g":20.5,"carbs_g":65,"fat_g":5,"fiber_g":16.8,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rajma (Kidney Beans)","category":"Lentils","calories":333,"protein_g":24,"carbs_g":60,"fat_g":0.8,"fiber_g":15.2,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Lobia (Black-eyed Peas)","category":"Lentils","calories":336,"protein_g":23.5,"carbs_g":60,"fat_g":1.3,"fiber_g":10.6,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Moth Dal (Moth Beans)","category":"Lentils","calories":343,"protein_g":23,"carbs_g":62,"fat_g":1.6,"fiber_g":4.5,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Horse Gram (Kulthi)","category":"Lentils","calories":321,"protein_g":22,"carbs_g":57,"fat_g":0.5,"fiber_g":5.3,"rasa":["Astringent","Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Soybean","category":"Lentils","calories":446,"protein_g":36.5,"carbs_g":30,"fat_g":19.9,"fiber_g":9.3,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Peas (Green)","category":"Lentils","calories":81,"protein_g":5.4,"carbs_g":14.5,"fat_g":0.4,"fiber_g":5.1,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Dried Peas","category":"Lentils","calories":341,"protein_g":24.5,"carbs_g":63,"fat_g":1.1,"fiber_g":25,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── VEGETABLES ───────────────────────────────────────────────────────────
    {"name":"Spinach (Palak)","category":"Vegetables","calories":23,"protein_g":2.9,"carbs_g":3.6,"fat_g":0.4,"fiber_g":2.2,"rasa":["Astringent","Bitter"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Bottle Gourd (Lauki)","category":"Vegetables","calories":14,"protein_g":0.6,"carbs_g":3.4,"fat_g":0.1,"fiber_g":0.5,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Bitter Gourd (Karela)","category":"Vegetables","calories":17,"protein_g":1,"carbs_g":3.7,"fat_g":0.2,"fiber_g":2.8,"rasa":["Bitter"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ridge Gourd (Turai)","category":"Vegetables","calories":20,"protein_g":1.2,"carbs_g":4.4,"fat_g":0.1,"fiber_g":0.5,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Snake Gourd (Chichinda)","category":"Vegetables","calories":18,"protein_g":1,"carbs_g":3.8,"fat_g":0.2,"fiber_g":0.6,"rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pointed Gourd (Parval)","category":"Vegetables","calories":20,"protein_g":2,"carbs_g":2.2,"fat_g":0.3,"fiber_g":0,"rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ash Gourd (Petha)","category":"Vegetables","calories":13,"protein_g":0.4,"carbs_g":3,"fat_g":0.1,"fiber_g":2.9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pumpkin","category":"Vegetables","calories":26,"protein_g":1,"carbs_g":6.5,"fat_g":0.1,"fiber_g":0.5,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Potato","category":"Vegetables","calories":77,"protein_g":2,"carbs_g":17,"fat_g":0.1,"fiber_g":2.2,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sweet Potato","category":"Vegetables","calories":86,"protein_g":1.6,"carbs_g":20,"fat_g":0.1,"fiber_g":3,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Tomato","category":"Vegetables","calories":18,"protein_g":0.9,"carbs_g":3.9,"fat_g":0.2,"fiber_g":1.2,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Onion","category":"Vegetables","calories":40,"protein_g":1.1,"carbs_g":9.3,"fat_g":0.1,"fiber_g":1.7,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Garlic","category":"Vegetables","calories":149,"protein_g":6.4,"carbs_g":33,"fat_g":0.5,"fiber_g":2.1,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Heavy","Oily","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ginger (Fresh)","category":"Vegetables","calories":80,"protein_g":1.8,"carbs_g":18,"fat_g":0.8,"fiber_g":2,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Green Chilli","category":"Vegetables","calories":40,"protein_g":1.9,"carbs_g":8.8,"fat_g":0.4,"fiber_g":1.5,"rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Brinjal (Baingan)","category":"Vegetables","calories":25,"protein_g":1,"carbs_g":5.9,"fat_g":0.2,"fiber_g":3,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cauliflower (Gobi)","category":"Vegetables","calories":25,"protein_g":1.9,"carbs_g":5,"fat_g":0.3,"fiber_g":2,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cabbage","category":"Vegetables","calories":25,"protein_g":1.3,"carbs_g":5.8,"fat_g":0.1,"fiber_g":2.5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Carrot","category":"Vegetables","calories":41,"protein_g":0.9,"carbs_g":10,"fat_g":0.2,"fiber_g":2.8,"rasa":["Sweet","Pungent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Radish (Mooli)","category":"Vegetables","calories":16,"protein_g":0.7,"carbs_g":3.4,"fat_g":0.1,"fiber_g":1.6,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Beetroot","category":"Vegetables","calories":43,"protein_g":1.6,"carbs_g":9.6,"fat_g":0.2,"fiber_g":2.8,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Drumstick (Moringa)","category":"Vegetables","calories":37,"protein_g":2.1,"carbs_g":8.5,"fat_g":0.2,"fiber_g":3.2,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Raw Banana (Kachcha Kela)","category":"Vegetables","calories":89,"protein_g":1.3,"carbs_g":23,"fat_g":0.1,"fiber_g":2.6,"rasa":["Astringent","Sweet"],"virya":"Cold","vipaka":"Astringent","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Raw Papaya","category":"Vegetables","calories":32,"protein_g":1.3,"carbs_g":7.7,"fat_g":0.1,"fiber_g":2.1,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Tinda (Indian Round Gourd)","category":"Vegetables","calories":21,"protein_g":1.5,"carbs_g":3.9,"fat_g":0.1,"fiber_g":0.6,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Yam (Suran/Jimikand)","category":"Vegetables","calories":118,"protein_g":1.5,"carbs_g":28,"fat_g":0.2,"fiber_g":4.1,"rasa":["Astringent","Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Heavy","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Colocasia (Arbi)","category":"Vegetables","calories":112,"protein_g":1.5,"carbs_g":26.5,"fat_g":0.2,"fiber_g":4.1,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Lotus Root (Kamal Kakdi)","category":"Vegetables","calories":74,"protein_g":2.6,"carbs_g":17.2,"fat_g":0.1,"fiber_g":4.9,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Raw Jackfruit (Kathal)","category":"Vegetables","calories":95,"protein_g":1.7,"carbs_g":23.2,"fat_g":0.3,"fiber_g":1.5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cluster Beans (Gawar)","category":"Vegetables","calories":16,"protein_g":3.3,"carbs_g":10.8,"fat_g":0.4,"fiber_g":0,"rasa":["Astringent","Bitter"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"French Beans","category":"Vegetables","calories":31,"protein_g":1.8,"carbs_g":7,"fat_g":0.1,"fiber_g":3.4,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cucumber","category":"Vegetables","calories":15,"protein_g":0.7,"carbs_g":3.6,"fat_g":0.1,"fiber_g":0.5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Lady Finger (Bhindi)","category":"Vegetables","calories":33,"protein_g":1.9,"carbs_g":7.5,"fat_g":0.2,"fiber_g":3.2,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Capsicum (Bell Pepper)","category":"Vegetables","calories":31,"protein_g":1,"carbs_g":6,"fat_g":0.3,"fiber_g":2.1,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Broccoli","category":"Vegetables","calories":34,"protein_g":2.8,"carbs_g":7,"fat_g":0.4,"fiber_g":2.6,"rasa":["Bitter","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Fenugreek Leaves (Methi)","category":"Vegetables","calories":49,"protein_g":4.4,"carbs_g":6,"fat_g":0.9,"fiber_g":1.1,"rasa":["Bitter","Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"neutral","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Coriander Leaves (Dhania)","category":"Vegetables","calories":23,"protein_g":2.1,"carbs_g":3.7,"fat_g":0.5,"fiber_g":2.8,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Curry Leaves (Kari Patta)","category":"Vegetables","calories":108,"protein_g":6.1,"carbs_g":18.7,"fat_g":1,"fiber_g":6.4,"rasa":["Pungent","Bitter","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Mint (Pudina)","category":"Vegetables","calories":44,"protein_g":3.3,"carbs_g":8.4,"fat_g":0.7,"fiber_g":6.8,"rasa":["Pungent","Sweet"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Drumstick Leaves (Moringa Leaves)","category":"Vegetables","calories":64,"protein_g":9.4,"carbs_g":8.3,"fat_g":1.4,"fiber_g":2,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Banana Flower (Kele ka Phool)","category":"Vegetables","calories":51,"protein_g":1.6,"carbs_g":9.9,"fat_g":0.6,"fiber_g":5.7,"rasa":["Astringent","Bitter"],"virya":"Cold","vipaka":"Astringent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Turnip (Shalgam)","category":"Vegetables","calories":28,"protein_g":0.9,"carbs_g":6.4,"fat_g":0.1,"fiber_g":1.8,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Leek","category":"Vegetables","calories":61,"protein_g":1.5,"carbs_g":14.2,"fat_g":0.3,"fiber_g":1.8,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Spring Onion","category":"Vegetables","calories":32,"protein_g":1.8,"carbs_g":7.3,"fat_g":0.2,"fiber_g":2.6,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── FRUITS ───────────────────────────────────────────────────────────────
    {"name":"Banana","category":"Fruits","calories":89,"protein_g":1.1,"carbs_g":23,"fat_g":0.3,"fiber_g":2.6,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sour","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Apple","category":"Fruits","calories":52,"protein_g":0.3,"carbs_g":14,"fat_g":0.2,"fiber_g":2.4,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pomegranate","category":"Fruits","calories":83,"protein_g":1.7,"carbs_g":19,"fat_g":1.2,"fiber_g":4,"rasa":["Sweet","Astringent","Sour"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Mango (Ripe)","category":"Fruits","calories":60,"protein_g":0.8,"carbs_g":15,"fat_g":0.4,"fiber_g":1.6,"rasa":["Sweet","Sour"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Raw Mango (Aam)","category":"Fruits","calories":60,"protein_g":0.7,"carbs_g":15,"fat_g":0.4,"fiber_g":1.6,"rasa":["Sour","Astringent"],"virya":"Hot","vipaka":"Sour","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Papaya (Ripe)","category":"Fruits","calories":43,"protein_g":0.5,"carbs_g":11,"fat_g":0.3,"fiber_g":1.7,"rasa":["Sweet","Pungent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Guava","category":"Fruits","calories":68,"protein_g":2.6,"carbs_g":14,"fat_g":1,"fiber_g":5.4,"rasa":["Sweet","Astringent","Sour"],"virya":"Cold","vipaka":"Astringent","guna":["Heavy","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Grapes","category":"Fruits","calories":69,"protein_g":0.7,"carbs_g":18,"fat_g":0.2,"fiber_g":0.9,"rasa":["Sweet","Sour"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Watermelon","category":"Fruits","calories":30,"protein_g":0.6,"carbs_g":7.6,"fat_g":0.2,"fiber_g":0.4,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Muskmelon (Kharbooja)","category":"Fruits","calories":34,"protein_g":0.8,"carbs_g":8.2,"fat_g":0.2,"fiber_g":0.9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pineapple","category":"Fruits","calories":50,"protein_g":0.5,"carbs_g":13,"fat_g":0.1,"fiber_g":1.4,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Orange","category":"Fruits","calories":47,"protein_g":0.9,"carbs_g":12,"fat_g":0.1,"fiber_g":2.4,"rasa":["Sweet","Sour"],"virya":"Hot","vipaka":"Sour","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Lemon","category":"Fruits","calories":29,"protein_g":1.1,"carbs_g":9.3,"fat_g":0.3,"fiber_g":2.8,"rasa":["Sour"],"virya":"Hot","vipaka":"Sour","guna":["Light","Oily","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Coconut (Fresh)","category":"Fruits","calories":354,"protein_g":3.3,"carbs_g":15,"fat_g":33,"fiber_g":9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Jackfruit (Ripe)","category":"Fruits","calories":95,"protein_g":1.7,"carbs_g":23.2,"fat_g":0.6,"fiber_g":1.5,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Custard Apple (Sitaphal)","category":"Fruits","calories":94,"protein_g":2.1,"carbs_g":23.6,"fat_g":0.5,"fiber_g":4.4,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Dates (Fresh)","category":"Fruits","calories":282,"protein_g":2.5,"carbs_g":75,"fat_g":0.4,"fiber_g":8,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Tamarind (Imli)","category":"Fruits","calories":239,"protein_g":2.8,"carbs_g":62.5,"fat_g":0.6,"fiber_g":5.1,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Plum (Aloo Bukhara)","category":"Fruits","calories":46,"protein_g":0.7,"carbs_g":11.4,"fat_g":0.3,"fiber_g":1.4,"rasa":["Sweet","Sour"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pear (Nashpati)","category":"Fruits","calories":57,"protein_g":0.4,"carbs_g":15,"fat_g":0.1,"fiber_g":3.1,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ber (Indian Jujube)","category":"Fruits","calories":79,"protein_g":1.2,"carbs_g":20.2,"fat_g":0.2,"fiber_g":0,"rasa":["Sweet","Astringent","Sour"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Kokum","category":"Fruits","calories":61,"protein_g":0.5,"carbs_g":14.3,"fat_g":0.9,"fiber_g":0,"rasa":["Sour","Sweet"],"virya":"Cold","vipaka":"Sour","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── DAIRY ────────────────────────────────────────────────────────────────
    {"name":"Milk (Cow)","category":"Dairy","calories":61,"protein_g":3.2,"carbs_g":4.8,"fat_g":3.3,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Milk (Buffalo)","category":"Dairy","calories":97,"protein_g":3.7,"carbs_g":5.2,"fat_g":6.9,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Ghee","category":"Dairy","calories":900,"protein_g":0,"carbs_g":0,"fat_g":100,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Paneer","category":"Dairy","calories":265,"protein_g":18,"carbs_g":1.2,"fat_g":21,"fiber_g":0,"rasa":["Sweet","Sour"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Curd (Dahi)","category":"Dairy","calories":61,"protein_g":3.5,"carbs_g":4.7,"fat_g":3.3,"fiber_g":0,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Buttermilk (Chaas)","category":"Dairy","calories":40,"protein_g":3.3,"carbs_g":4.8,"fat_g":0.9,"fiber_g":0,"rasa":["Sour","Sweet","Astringent"],"virya":"Cold","vipaka":"Sour","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Cream (Malai)","category":"Dairy","calories":340,"protein_g":2.1,"carbs_g":2.8,"fat_g":36,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Butter","category":"Dairy","calories":717,"protein_g":0.9,"carbs_g":0.1,"fat_g":81,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Khoya (Mawa)","category":"Dairy","calories":421,"protein_g":20.5,"carbs_g":26,"fat_g":28,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Lassi","category":"Dairy","calories":75,"protein_g":4.3,"carbs_g":9.9,"fat_g":2.4,"fiber_g":0,"rasa":["Sour","Sweet"],"virya":"Cold","vipaka":"Sour","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},

    # ── SPICES ───────────────────────────────────────────────────────────────
    {"name":"Turmeric (Haldi)","category":"Spices","calories":312,"protein_g":10,"carbs_g":67,"fat_g":3.2,"fiber_g":22.7,"rasa":["Bitter","Pungent","Astringent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"neutral","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cumin (Jeera)","category":"Spices","calories":375,"protein_g":17.8,"carbs_g":44.2,"fat_g":22.3,"fiber_g":10.5,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Coriander Seeds (Dhania)","category":"Spices","calories":298,"protein_g":12.4,"carbs_g":55,"fat_g":17.8,"fiber_g":41.9,"rasa":["Pungent","Astringent","Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Mustard Seeds (Rai/Sarson)","category":"Spices","calories":508,"protein_g":26.1,"carbs_g":28.1,"fat_g":36.2,"fiber_g":12.2,"rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Fenugreek Seeds (Methi Dana)","category":"Spices","calories":323,"protein_g":23,"carbs_g":58,"fat_g":6.4,"fiber_g":24.6,"rasa":["Bitter","Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Asafoetida (Hing)","category":"Spices","calories":297,"protein_g":4,"carbs_g":67.8,"fat_g":1,"fiber_g":4.1,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Black Pepper (Kali Mirch)","category":"Spices","calories":251,"protein_g":10.4,"carbs_g":63.9,"fat_g":3.3,"fiber_g":25.3,"rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cardamom (Elaichi)","category":"Spices","calories":311,"protein_g":10.8,"carbs_g":68.5,"fat_g":6.7,"fiber_g":28,"rasa":["Sweet","Pungent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cloves (Laung)","category":"Spices","calories":274,"protein_g":6,"carbs_g":65.5,"fat_g":13,"fiber_g":33.9,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cinnamon (Dalchini)","category":"Spices","calories":247,"protein_g":4,"carbs_g":80.6,"fat_g":1.2,"fiber_g":53.1,"rasa":["Sweet","Pungent","Bitter"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Bay Leaf (Tej Patta)","category":"Spices","calories":313,"protein_g":7.6,"carbs_g":75,"fat_g":8.4,"fiber_g":26.3,"rasa":["Pungent","Bitter","Astringent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Red Chilli Powder (Lal Mirch)","category":"Spices","calories":282,"protein_g":12.1,"carbs_g":49.7,"fat_g":12.9,"fiber_g":27.2,"rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Dry Ginger Powder (Saunth)","category":"Spices","calories":335,"protein_g":8.9,"carbs_g":71.6,"fat_g":4.2,"fiber_g":14.1,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Carom Seeds (Ajwain)","category":"Spices","calories":305,"protein_g":17.1,"carbs_g":43.1,"fat_g":25.1,"fiber_g":21.2,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Black Cumin (Kala Jeera/Shah Jeera)","category":"Spices","calories":375,"protein_g":17.8,"carbs_g":44.2,"fat_g":22.3,"fiber_g":10.5,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Nigella Seeds (Kalonji)","category":"Spices","calories":345,"protein_g":20.8,"carbs_g":52.9,"fat_g":16.9,"fiber_g":0,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Star Anise (Chakra Phool)","category":"Spices","calories":337,"protein_g":17.6,"carbs_g":50.0,"fat_g":15.9,"fiber_g":14.6,"rasa":["Sweet","Pungent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Mace (Javitri)","category":"Spices","calories":475,"protein_g":6.7,"carbs_g":50.5,"fat_g":32.4,"fiber_g":20.2,"rasa":["Pungent","Sweet","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Nutmeg (Jaiphal)","category":"Spices","calories":525,"protein_g":5.8,"carbs_g":49.3,"fat_g":36.3,"fiber_g":20.8,"rasa":["Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Saffron (Kesar)","category":"Spices","calories":310,"protein_g":11.4,"carbs_g":65.4,"fat_g":5.9,"fiber_g":3.9,"rasa":["Pungent","Sweet","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Garam Masala","category":"Spices","calories":379,"protein_g":13.7,"carbs_g":50.4,"fat_g":15.1,"fiber_g":16.2,"rasa":["Pungent","Sweet","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Chat Masala","category":"Spices","calories":292,"protein_g":7,"carbs_g":46.8,"fat_g":7.4,"fiber_g":7,"rasa":["Sour","Pungent","Salty"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Amchur (Dry Mango Powder)","category":"Spices","calories":302,"protein_g":2.8,"carbs_g":77,"fat_g":1.7,"fiber_g":5.3,"rasa":["Sour","Astringent"],"virya":"Hot","vipaka":"Sour","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pomegranate Peel Powder (Anardana)","category":"Spices","calories":282,"protein_g":5.8,"carbs_g":65,"fat_g":2.7,"fiber_g":0,"rasa":["Sour","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Fennel Seeds (Saunf)","category":"Spices","calories":345,"protein_g":15.8,"carbs_g":52.3,"fat_g":14.9,"fiber_g":39.8,"rasa":["Sweet","Pungent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Peppercorn (White)","category":"Spices","calories":296,"protein_g":10.4,"carbs_g":68,"fat_g":2.1,"fiber_g":26.2,"rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── HERBS & MEDICINAL ────────────────────────────────────────────────────
    {"name":"Amla (Indian Gooseberry)","category":"Herbs","calories":44,"protein_g":0.9,"carbs_g":10.2,"fat_g":0.6,"fiber_g":4.3,"rasa":["Sour","Sweet","Pungent","Bitter","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Tulsi (Holy Basil)","category":"Herbs","calories":22,"protein_g":3.2,"carbs_g":2.7,"fat_g":0.6,"fiber_g":1.8,"rasa":["Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ashwagandha Root Powder","category":"Herbs","calories":245,"protein_g":3.9,"carbs_g":49.9,"fat_g":0.3,"fiber_g":32.3,"rasa":["Bitter","Astringent","Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Triphala Powder","category":"Herbs","calories":200,"protein_g":2.5,"carbs_g":45,"fat_g":1,"fiber_g":18,"rasa":["Sweet","Sour","Pungent","Bitter","Astringent"],"virya":"Neutral","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Neem Leaves","category":"Herbs","calories":140,"protein_g":7.1,"carbs_g":16,"fat_g":1.7,"fiber_g":4.1,"rasa":["Bitter","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Brahmi","category":"Herbs","calories":25,"protein_g":2.1,"carbs_g":3.6,"fat_g":0.1,"fiber_g":1.2,"rasa":["Bitter","Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Shatavari Powder","category":"Herbs","calories":216,"protein_g":3.2,"carbs_g":45,"fat_g":0.4,"fiber_g":3.5,"rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Guduchi (Giloy)","category":"Herbs","calories":88,"protein_g":1.5,"carbs_g":20,"fat_g":0.3,"fiber_g":1.8,"rasa":["Bitter","Astringent","Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Mulethi (Liquorice Root)","category":"Herbs","calories":375,"protein_g":5.6,"carbs_g":77.2,"fat_g":0.05,"fiber_g":7.8,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Shankhpushpi","category":"Herbs","calories":120,"protein_g":3.2,"carbs_g":22,"fat_g":0.6,"fiber_g":4.5,"rasa":["Bitter","Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── NUTS & SEEDS ─────────────────────────────────────────────────────────
    {"name":"Almonds (Badam)","category":"Nuts","calories":579,"protein_g":21,"carbs_g":22,"fat_g":50,"fiber_g":12.5,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Cashews (Kaju)","category":"Nuts","calories":553,"protein_g":18,"carbs_g":30,"fat_g":44,"fiber_g":3.3,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Walnuts (Akhrot)","category":"Nuts","calories":654,"protein_g":15.2,"carbs_g":14,"fat_g":65,"fiber_g":6.7,"rasa":["Astringent","Sweet","Bitter"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pistachios (Pista)","category":"Nuts","calories":562,"protein_g":20,"carbs_g":28,"fat_g":45,"fiber_g":10.3,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Peanuts (Moongphali)","category":"Nuts","calories":567,"protein_g":25.8,"carbs_g":16.1,"fat_g":49.2,"fiber_g":8.5,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sesame Seeds (Til)","category":"Seeds","calories":573,"protein_g":17.7,"carbs_g":23.5,"fat_g":49.7,"fiber_g":11.8,"rasa":["Sweet","Bitter","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Flaxseeds (Alsi)","category":"Seeds","calories":534,"protein_g":18.3,"carbs_g":28.9,"fat_g":42.2,"fiber_g":27.3,"rasa":["Sweet","Bitter"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sunflower Seeds","category":"Seeds","calories":584,"protein_g":20.8,"carbs_g":20,"fat_g":51.5,"fiber_g":8.6,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pumpkin Seeds (Kaddu Beej)","category":"Seeds","calories":559,"protein_g":30,"carbs_g":10.7,"fat_g":49,"fiber_g":6,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Chia Seeds","category":"Seeds","calories":486,"protein_g":16.5,"carbs_g":42.1,"fat_g":30.7,"fiber_g":34.4,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Melon Seeds (Magaz)","category":"Seeds","calories":557,"protein_g":28.8,"carbs_g":15.3,"fat_g":45.6,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Lotus Seeds (Makhana)","category":"Seeds","calories":362,"protein_g":9.7,"carbs_g":76.9,"fat_g":0.1,"fiber_g":14.5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Charoli (Chironji)","category":"Nuts","calories":544,"protein_g":21.6,"carbs_g":30.2,"fat_g":39.2,"fiber_g":3.8,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── OILS & FATS ──────────────────────────────────────────────────────────
    {"name":"Mustard Oil","category":"Oils","calories":884,"protein_g":0,"carbs_g":0,"fat_g":100,"fiber_g":0,"rasa":["Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Oily","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sesame Oil (Til Tel)","category":"Oils","calories":884,"protein_g":0,"carbs_g":0,"fat_g":100,"fiber_g":0,"rasa":["Sweet","Bitter"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Coconut Oil","category":"Oils","calories":892,"protein_g":0,"carbs_g":0,"fat_g":99.1,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Groundnut Oil","category":"Oils","calories":884,"protein_g":0,"carbs_g":0,"fat_g":100,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sunflower Oil","category":"Oils","calories":884,"protein_g":0,"carbs_g":0,"fat_g":100,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── SWEETENERS ───────────────────────────────────────────────────────────
    {"name":"Jaggery (Gur)","category":"Sweeteners","calories":383,"protein_g":0.4,"carbs_g":98,"fat_g":0.1,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Honey (Shahad)","category":"Sweeteners","calories":304,"protein_g":0.3,"carbs_g":82.4,"fat_g":0,"fiber_g":0.2,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Sugar (Chini)","category":"Sweeteners","calories":387,"protein_g":0,"carbs_g":99.8,"fat_g":0,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Palm Sugar (Tal Mishri)","category":"Sweeteners","calories":375,"protein_g":0,"carbs_g":96,"fat_g":0.1,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rock Sugar (Mishri/Khand)","category":"Sweeteners","calories":397,"protein_g":0,"carbs_g":99.9,"fat_g":0,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── BEVERAGES ────────────────────────────────────────────────────────────
    {"name":"Coconut Water","category":"Beverages","calories":19,"protein_g":0.7,"carbs_g":3.7,"fat_g":0.2,"fiber_g":1.1,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rose Water (Gulab Jal)","category":"Beverages","calories":2,"protein_g":0,"carbs_g":0.4,"fat_g":0,"fiber_g":0,"rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Smooth"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sugarcane Juice","category":"Beverages","calories":45,"protein_g":0.2,"carbs_g":11.2,"fat_g":0.1,"fiber_g":0,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Lassi (Sweet)","category":"Beverages","calories":99,"protein_g":4,"carbs_g":15,"fat_g":3.1,"fiber_g":0,"rasa":["Sweet","Sour"],"virya":"Cold","vipaka":"Sour","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Chaas (Spiced Buttermilk)","category":"Beverages","calories":40,"protein_g":3.3,"carbs_g":4.8,"fat_g":0.9,"fiber_g":0,"rasa":["Sour","Sweet","Pungent"],"virya":"Cold","vipaka":"Sour","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Thandai","category":"Beverages","calories":112,"protein_g":3.4,"carbs_g":14.8,"fat_g":5.1,"fiber_g":0.5,"rasa":["Sweet","Pungent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},

    # ── PROTEINS ─────────────────────────────────────────────────────────────
    {"name":"Chicken Breast","category":"Proteins","calories":165,"protein_g":31,"carbs_g":0,"fat_g":3.6,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":False,"is_vegan":False,"is_gluten_free":True},
    {"name":"Mutton (Goat Meat)","category":"Proteins","calories":258,"protein_g":26,"carbs_g":0,"fat_g":17,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":False,"is_vegan":False,"is_gluten_free":True},
    {"name":"Eggs","category":"Proteins","calories":155,"protein_g":13,"carbs_g":1.1,"fat_g":11,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":False,"is_vegan":False,"is_gluten_free":True},
    {"name":"Fish (Rohu)","category":"Proteins","calories":97,"protein_g":16.6,"carbs_g":0,"fat_g":3.4,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":False,"is_vegan":False,"is_gluten_free":True},
    {"name":"Prawns (Jhinga)","category":"Proteins","calories":99,"protein_g":24,"carbs_g":0.2,"fat_g":0.3,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"neutral"},"is_vegetarian":False,"is_vegan":False,"is_gluten_free":True},
    {"name":"Tofu","category":"Proteins","calories":76,"protein_g":8,"carbs_g":1.9,"fat_g":4.8,"fiber_g":0.3,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── FERMENTED / CONDIMENTS ───────────────────────────────────────────────
    {"name":"Idli (Fermented Rice Cake)","category":"Prepared Foods","calories":39,"protein_g":2,"carbs_g":8,"fat_g":0.1,"fiber_g":0.5,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Green Chutney (Coriander-Mint)","category":"Condiments","calories":40,"protein_g":2,"carbs_g":6.8,"fat_g":0.7,"fiber_g":2.3,"rasa":["Pungent","Sour","Astringent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Tamarind Chutney","category":"Condiments","calories":130,"protein_g":0.5,"carbs_g":34,"fat_g":0.2,"fiber_g":1.5,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Pickle (Achaar – Mixed)","category":"Condiments","calories":135,"protein_g":1.2,"carbs_g":15,"fat_g":8,"fiber_g":3,"rasa":["Sour","Pungent","Salty"],"virya":"Hot","vipaka":"Sour","guna":["Heavy","Oily","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── SALT & MINERALS ──────────────────────────────────────────────────────
    {"name":"Rock Salt (Sendha Namak)","category":"Minerals","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"rasa":["Salty"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Black Salt (Kala Namak)","category":"Minerals","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"rasa":["Salty","Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Penetrating"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sea Salt","category":"Minerals","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"rasa":["Salty"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── PREPARED / STAPLE FOODS ──────────────────────────────────────────────
    {"name":"Roti (Whole Wheat)","category":"Prepared Foods","calories":297,"protein_g":10.8,"carbs_g":60.3,"fat_g":2.4,"fiber_g":9.7,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Dal (Cooked Toor)","category":"Prepared Foods","calories":100,"protein_g":7,"carbs_g":18,"fat_g":0.5,"fiber_g":4.5,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Plain Rice (Cooked)","category":"Prepared Foods","calories":130,"protein_g":2.7,"carbs_g":28,"fat_g":0.3,"fiber_g":0.4,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Upma (Semolina Dish)","category":"Prepared Foods","calories":145,"protein_g":4,"carbs_g":25,"fat_g":4,"fiber_g":1.5,"rasa":["Sweet","Pungent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Poha (Cooked)","category":"Prepared Foods","calories":180,"protein_g":3.5,"carbs_g":33,"fat_g":4.5,"fiber_g":1.5,"rasa":["Sweet","Pungent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Khichdi (Rice-Dal Mix)","category":"Prepared Foods","calories":130,"protein_g":6,"carbs_g":23,"fat_g":1,"fiber_g":3,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Curd Rice","category":"Prepared Foods","calories":120,"protein_g":4.2,"carbs_g":21,"fat_g":2.8,"fiber_g":0.3,"rasa":["Sour","Sweet"],"virya":"Cold","vipaka":"Sour","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Sambar","category":"Prepared Foods","calories":55,"protein_g":3.2,"carbs_g":9,"fat_g":0.8,"fiber_g":2.8,"rasa":["Sour","Pungent","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rasam","category":"Prepared Foods","calories":27,"protein_g":1,"carbs_g":5.5,"fat_g":0.5,"fiber_g":0.8,"rasa":["Sour","Pungent","Bitter"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Chapati (Thin Roti)","category":"Prepared Foods","calories":104,"protein_g":3.1,"carbs_g":18,"fat_g":2.6,"fiber_g":3,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":False},
    {"name":"Paratha (Plain)","category":"Prepared Foods","calories":300,"protein_g":8,"carbs_g":48,"fat_g":9,"fiber_g":3.5,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":False},
    {"name":"Dosa (Plain)","category":"Prepared Foods","calories":133,"protein_g":3,"carbs_g":25.6,"fat_g":2.3,"fiber_g":0.9,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Dry"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Dhokla","category":"Prepared Foods","calories":160,"protein_g":5,"carbs_g":25,"fat_g":4.5,"fiber_g":1.8,"rasa":["Sour","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Halwa (Suji)","category":"Prepared Foods","calories":250,"protein_g":3.8,"carbs_g":38,"fat_g":9,"fiber_g":0.9,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":False},
    {"name":"Pongal (Rice-Moong)","category":"Prepared Foods","calories":145,"protein_g":5.5,"carbs_g":24,"fat_g":3.5,"fiber_g":2,"rasa":["Sweet","Pungent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── MISC / SPECIALTY ─────────────────────────────────────────────────────
    {"name":"Kokum Butter","category":"Oils","calories":870,"protein_g":0,"carbs_g":0,"fat_g":97,"fiber_g":0,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Coconut Milk","category":"Dairy","calories":230,"protein_g":2.3,"carbs_g":5.5,"fat_g":23.8,"fiber_g":2.2,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Betel Leaf (Paan Patta)","category":"Herbs","calories":44,"protein_g":3.1,"carbs_g":6.1,"fat_g":0.8,"fiber_g":2.3,"rasa":["Pungent","Bitter","Sweet"],"virya":"Hot","vipaka":"Pungent","guna":["Light","Sharp"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Roasted Chana (Bhuna Chana)","category":"Lentils","calories":390,"protein_g":22.5,"carbs_g":57,"fat_g":6,"fiber_g":17,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough","Dry"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Bael Fruit (Wood Apple)","category":"Fruits","calories":137,"protein_g":1.8,"carbs_g":31.8,"fat_g":0.3,"fiber_g":2.9,"rasa":["Sweet","Astringent","Bitter"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Karonda (Indian Cranberry)","category":"Fruits","calories":42,"protein_g":1.1,"carbs_g":7.9,"fat_g":2.9,"fiber_g":2.7,"rasa":["Sour","Astringent"],"virya":"Hot","vipaka":"Sour","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Kiwi","category":"Fruits","calories":61,"protein_g":1.1,"carbs_g":15,"fat_g":0.5,"fiber_g":3,"rasa":["Sour","Sweet"],"virya":"Cold","vipaka":"Sour","guna":["Light","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Strawberry","category":"Fruits","calories":32,"protein_g":0.7,"carbs_g":7.7,"fat_g":0.3,"fiber_g":2,"rasa":["Sweet","Sour","Astringent"],"virya":"Cold","vipaka":"Sour","guna":["Light","Rough"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Litchi (Lychee)","category":"Fruits","calories":66,"protein_g":0.8,"carbs_g":16.5,"fat_g":0.4,"fiber_g":1.3,"rasa":["Sweet","Sour"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Sapota (Chiku/Sapodilla)","category":"Fruits","calories":83,"protein_g":0.4,"carbs_g":20,"fat_g":1.1,"fiber_g":5.3,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Fig (Anjeer)","category":"Fruits","calories":74,"protein_g":0.8,"carbs_g":19.2,"fat_g":0.3,"fiber_g":2.9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Dry Figs (Anjeer Sukha)","category":"Fruits","calories":249,"protein_g":3.3,"carbs_g":63.9,"fat_g":0.9,"fiber_g":9.8,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Raisins (Kismis)","category":"Fruits","calories":299,"protein_g":3.1,"carbs_g":79.2,"fat_g":0.5,"fiber_g":3.7,"rasa":["Sweet","Sour"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Dry Dates (Chhuhara)","category":"Fruits","calories":282,"protein_g":2.5,"carbs_g":75,"fat_g":0.4,"fiber_g":8,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Apricot (Khubani)","category":"Fruits","calories":48,"protein_g":1.4,"carbs_g":11.1,"fat_g":0.4,"fiber_g":2,"rasa":["Sweet","Sour"],"virya":"Hot","vipaka":"Sour","guna":["Light","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},

    # ── ADDITIONAL VEGETABLES ────────────────────────────────────────────────
    {"name":"Courgette (Zucchini)","category":"Vegetables","calories":17,"protein_g":1.2,"carbs_g":3.1,"fat_g":0.3,"fiber_g":1,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Mushroom","category":"Vegetables","calories":22,"protein_g":3.1,"carbs_g":3.3,"fat_g":0.3,"fiber_g":1,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Baby Corn","category":"Vegetables","calories":26,"protein_g":1.9,"carbs_g":5.7,"fat_g":0.2,"fiber_g":1.9,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Water Chestnut (Singhara)","category":"Vegetables","calories":97,"protein_g":2,"carbs_g":23.9,"fat_g":0.1,"fiber_g":3,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Rough"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Ivy Gourd (Tindora/Kundru)","category":"Vegetables","calories":18,"protein_g":1.2,"carbs_g":3.9,"fat_g":0.1,"fiber_g":1.6,"rasa":["Sweet","Bitter"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"neutral","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Raw Jackfruit Seed","category":"Vegetables","calories":98,"protein_g":6.6,"carbs_g":21.5,"fat_g":0.4,"fiber_g":1.5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Heavy","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Banana Stem (Kele ka Tana)","category":"Vegetables","calories":30,"protein_g":0.6,"carbs_g":7.2,"fat_g":0.1,"fiber_g":5.1,"rasa":["Astringent","Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Surana (Elephant Foot Yam)","category":"Vegetables","calories":118,"protein_g":1.5,"carbs_g":28,"fat_g":0.2,"fiber_g":4.1,"rasa":["Astringent","Pungent"],"virya":"Hot","vipaka":"Pungent","guna":["Heavy","Rough"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Gondh (Edible Gum)","category":"Specialty","calories":360,"protein_g":0,"carbs_g":90,"fat_g":0,"fiber_g":0,"rasa":["Sweet"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Agar Agar","category":"Specialty","calories":26,"protein_g":0.5,"carbs_g":6.7,"fat_g":0,"fiber_g":6.3,"rasa":["Sweet"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Soft"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Til (Sesame) Chutney","category":"Condiments","calories":210,"protein_g":8,"carbs_g":12,"fat_g":16,"fiber_g":4.5,"rasa":["Sweet","Bitter","Astringent","Pungent"],"virya":"Hot","vipaka":"Sweet","guna":["Heavy","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"increases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Kadhi (Yogurt Curry)","category":"Prepared Foods","calories":85,"protein_g":3.5,"carbs_g":10.5,"fat_g":3.1,"fiber_g":0.5,"rasa":["Sour","Pungent","Sweet"],"virya":"Hot","vipaka":"Sour","guna":["Light","Oily"],"dosha_effect":{"vata":"decreases","pitta":"increases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},
    {"name":"Raita","category":"Prepared Foods","calories":58,"protein_g":3.1,"carbs_g":7,"fat_g":2.1,"fiber_g":0.5,"rasa":["Sour","Sweet","Pungent"],"virya":"Cold","vipaka":"Sour","guna":["Heavy","Smooth"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"increases"},"is_vegetarian":True,"is_vegan":False,"is_gluten_free":True},

    # ── ADDITIONAL GRAINS & FLOURS ────────────────────────────────────────────
    {"name":"Sattu (Roasted Gram Flour)","category":"Grains","calories":413,"protein_g":22.4,"carbs_g":65.2,"fat_g":6,"fiber_g":7.2,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Singhara Flour (Water Chestnut Flour)","category":"Grains","calories":345,"protein_g":4.6,"carbs_g":83.1,"fat_g":0.2,"fiber_g":5,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"decreases","kapha":"neutral"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Rajgira Flour (Amaranth Flour)","category":"Grains","calories":371,"protein_g":13.6,"carbs_g":65,"fat_g":7,"fiber_g":6.7,"rasa":["Sweet","Astringent"],"virya":"Hot","vipaka":"Sweet","guna":["Light","Rough"],"dosha_effect":{"vata":"decreases","pitta":"neutral","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
    {"name":"Kuttu Flour (Buckwheat Flour)","category":"Grains","calories":335,"protein_g":12.6,"carbs_g":70.6,"fat_g":3.1,"fiber_g":10,"rasa":["Sweet","Astringent"],"virya":"Cold","vipaka":"Pungent","guna":["Light","Rough"],"dosha_effect":{"vata":"increases","pitta":"decreases","kapha":"decreases"},"is_vegetarian":True,"is_vegan":True,"is_gluten_free":True},
]

    now=datetime.now(timezone.utc).isoformat()
    for f in foods:
        f["id"]=str(uuid.uuid4()); f["created_at"]=now
        for field in ["vitamin_a_mcg","vitamin_c_mg","vitamin_d_mcg","calcium_mg","iron_mg","potassium_mg","sodium_mg"]: f.setdefault(field,0)
        f.setdefault("serving_size_g",100); f.setdefault("season_best",[]); f.setdefault("description",None)
    await db.foods.insert_many(foods)
    return {"message":f"Seeded {len(foods)} foods","count":len(foods)}



@api_router.get("/health")
async def health(): return {"status":"healthy","ai":"gemini-1.5-flash","timestamp":datetime.now(timezone.utc).isoformat()}

# ← ADD THIS LINE
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client(): client.close()