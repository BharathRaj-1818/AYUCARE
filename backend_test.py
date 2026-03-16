#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import uuid

class AyuCareAPITester:
    def __init__(self, base_url="https://ayur-nutrition-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@ayucare.com"
        self.test_patient_id = None
        self.test_diet_chart_id = None

    def log_result(self, test_name, success, details="", error_msg=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {error_msg}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "error": error_msg
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = {}
            try:
                response_data = response.json()
            except:
                pass

            return success, response.status_code, response_data

        except requests.exceptions.RequestException as e:
            return False, 0, {"error": str(e)}

    def test_user_registration(self):
        """Test user registration"""
        data = {
            "email": self.test_user_email,
            "password": "TestPass123!",
            "name": "Test Dietitian",
            "role": "dietitian"
        }
        
        success, status, response = self.make_request('POST', 'auth/register', data, 200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("User Registration", True, f"User ID: {self.user_id}")
            return True
        else:
            self.log_result("User Registration", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_user_login(self):
        """Test user login"""
        data = {
            "email": self.test_user_email,
            "password": "TestPass123!"
        }
        
        success, status, response = self.make_request('POST', 'auth/login', data, 200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_result("User Login", True, f"Token received")
            return True
        else:
            self.log_result("User Login", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, status, response = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'email' in response:
            self.log_result("Get User Profile", True, f"Email: {response['email']}")
            return True
        else:
            self.log_result("Get User Profile", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, status, response = self.make_request('GET', 'dashboard/stats', expected_status=200)
        
        if success and 'patient_count' in response:
            self.log_result("Dashboard Stats", True, f"Patient count: {response['patient_count']}")
            return True
        else:
            self.log_result("Dashboard Stats", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_seed_foods(self):
        """Test seeding food database"""
        success, status, response = self.make_request('POST', 'seed/foods', expected_status=200)
        
        if success:
            self.log_result("Seed Foods Database", True, f"Response: {response.get('message', 'Seeded successfully')}")
            return True
        else:
            self.log_result("Seed Foods Database", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_foods(self):
        """Test getting foods list"""
        success, status, response = self.make_request('GET', 'foods?limit=50', expected_status=200)
        
        if success and isinstance(response, list):
            food_count = len(response)
            self.log_result("Get Foods List", True, f"Found {food_count} foods")
            return True
        else:
            self.log_result("Get Foods List", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_food_categories(self):
        """Test getting food categories"""
        success, status, response = self.make_request('GET', 'foods/categories/list', expected_status=200)
        
        if success and 'categories' in response:
            categories = response['categories']
            self.log_result("Get Food Categories", True, f"Found {len(categories)} categories")
            return True
        else:
            self.log_result("Get Food Categories", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_create_patient(self):
        """Test creating a patient"""
        data = {
            "name": "Test Patient",
            "age": 35,
            "gender": "Female",
            "phone": "+91 9876543210",
            "email": "patient@test.com",
            "height_cm": 165.0,
            "weight_kg": 60.0,
            "prakriti": "Vata-Pitta",
            "vikriti": "Pitta",
            "dietary_habits": "Vegetarian",
            "meal_frequency": 3,
            "bowel_movements": "Regular (once daily)",
            "water_intake_liters": 2.5,
            "sleep_hours": 7.0,
            "allergies": ["Dairy"],
            "health_conditions": ["Diabetes"],
            "medications": ["Metformin"],
            "notes": "Test patient for API testing"
        }
        
        success, status, response = self.make_request('POST', 'patients', data, 200)
        
        if success and 'id' in response:
            self.test_patient_id = response['id']
            bmi = response.get('bmi')
            self.log_result("Create Patient", True, f"Patient ID: {self.test_patient_id}, BMI: {bmi}")
            return True
        else:
            self.log_result("Create Patient", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_patients(self):
        """Test getting patients list"""
        success, status, response = self.make_request('GET', 'patients', expected_status=200)
        
        if success and isinstance(response, list):
            patient_count = len(response)
            self.log_result("Get Patients List", True, f"Found {patient_count} patients")
            return True
        else:
            self.log_result("Get Patients List", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_patient_detail(self):
        """Test getting patient details"""
        if not self.test_patient_id:
            self.log_result("Get Patient Detail", False, "", "No patient ID available")
            return False
            
        success, status, response = self.make_request('GET', f'patients/{self.test_patient_id}', expected_status=200)
        
        if success and response.get('id') == self.test_patient_id:
            self.log_result("Get Patient Detail", True, f"Patient: {response.get('name')}")
            return True
        else:
            self.log_result("Get Patient Detail", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_update_patient(self):
        """Test updating patient"""
        if not self.test_patient_id:
            self.log_result("Update Patient", False, "", "No patient ID available")
            return False
            
        data = {
            "name": "Updated Test Patient",
            "age": 36,
            "gender": "Female",
            "phone": "+91 9876543210",
            "email": "updated_patient@test.com",
            "height_cm": 165.0,
            "weight_kg": 58.0,
            "prakriti": "Vata-Pitta",
            "vikriti": "Vata",
            "dietary_habits": "Vegetarian",
            "meal_frequency": 4,
            "bowel_movements": "Regular (once daily)",
            "water_intake_liters": 3.0,
            "sleep_hours": 8.0,
            "allergies": ["Dairy", "Nuts"],
            "health_conditions": ["Diabetes"],
            "medications": ["Metformin"],
            "notes": "Updated test patient"
        }
        
        success, status, response = self.make_request('PUT', f'patients/{self.test_patient_id}', data, 200)
        
        if success and response.get('name') == "Updated Test Patient":
            self.log_result("Update Patient", True, f"Updated patient name and weight")
            return True
        else:
            self.log_result("Update Patient", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_ai_diet_generation(self):
        """Test AI diet chart generation"""
        if not self.test_patient_id:
            self.log_result("AI Diet Generation", False, "", "No patient ID available")
            return False
            
        data = {
            "patient_id": self.test_patient_id,
            "duration_days": 7,
            "target_calories": 1800,
            "specific_requirements": "Weight management, diabetic-friendly meals"
        }
        
        print("🔄 Generating AI diet chart (this may take 30-60 seconds)...")
        success, status, response = self.make_request('POST', 'ai/generate-diet', data, 200)
        
        if success and 'id' in response:
            self.test_diet_chart_id = response['id']
            meals_count = len(response.get('meals', []))
            self.log_result("AI Diet Generation", True, f"Chart ID: {self.test_diet_chart_id}, {meals_count} meal plans")
            return True
        else:
            self.log_result("AI Diet Generation", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_diet_charts(self):
        """Test getting diet charts list"""
        success, status, response = self.make_request('GET', 'diet-charts', expected_status=200)
        
        if success and isinstance(response, list):
            chart_count = len(response)
            self.log_result("Get Diet Charts List", True, f"Found {chart_count} diet charts")
            return True
        else:
            self.log_result("Get Diet Charts List", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_get_diet_chart_detail(self):
        """Test getting diet chart details"""
        if not self.test_diet_chart_id:
            self.log_result("Get Diet Chart Detail", False, "", "No diet chart ID available")
            return False
            
        success, status, response = self.make_request('GET', f'diet-charts/{self.test_diet_chart_id}', expected_status=200)
        
        if success and response.get('id') == self.test_diet_chart_id:
            title = response.get('title', 'Unknown')
            self.log_result("Get Diet Chart Detail", True, f"Chart: {title}")
            return True
        else:
            self.log_result("Get Diet Chart Detail", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_pdf_generation(self):
        """Test PDF generation for diet chart"""
        if not self.test_diet_chart_id:
            self.log_result("PDF Generation", False, "", "No diet chart ID available")
            return False
            
        url = f"{self.base_url}/api/diet-charts/{self.test_diet_chart_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                pdf_size = len(response.content)
                self.log_result("PDF Generation", True, f"PDF size: {pdf_size} bytes")
                return True
            else:
                self.log_result("PDF Generation", False, "", f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("PDF Generation", False, "", f"Error: {str(e)}")
            return False

    def test_search_foods(self):
        """Test food search functionality"""
        success, status, response = self.make_request('GET', 'foods?search=rice&limit=10', expected_status=200)
        
        if success and isinstance(response, list):
            rice_foods = [f for f in response if 'rice' in f.get('name', '').lower()]
            self.log_result("Search Foods", True, f"Found {len(rice_foods)} rice items out of {len(response)} results")
            return True
        else:
            self.log_result("Search Foods", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_filter_foods_by_category(self):
        """Test filtering foods by category"""
        success, status, response = self.make_request('GET', 'foods?category=Grains&limit=20', expected_status=200)
        
        if success and isinstance(response, list):
            grain_count = len(response)
            self.log_result("Filter Foods by Category", True, f"Found {grain_count} grain items")
            return True
        else:
            self.log_result("Filter Foods by Category", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_filter_foods_by_rasa(self):
        """Test filtering foods by rasa (taste)"""
        success, status, response = self.make_request('GET', 'foods?rasa=Sweet&limit=20', expected_status=200)
        
        if success and isinstance(response, list):
            sweet_count = len(response)
            self.log_result("Filter Foods by Rasa", True, f"Found {sweet_count} sweet foods")
            return True
        else:
            self.log_result("Filter Foods by Rasa", False, "", f"Status: {status}, Response: {response}")
            return False

    def test_cleanup(self):
        """Clean up test data"""
        cleanup_success = True
        
        # Delete diet chart
        if self.test_diet_chart_id:
            success, status, response = self.make_request('DELETE', f'diet-charts/{self.test_diet_chart_id}', expected_status=200)
            if not success:
                cleanup_success = False
                
        # Delete patient
        if self.test_patient_id:
            success, status, response = self.make_request('DELETE', f'patients/{self.test_patient_id}', expected_status=200)
            if not success:
                cleanup_success = False
        
        self.log_result("Cleanup Test Data", cleanup_success, "Removed test patient and diet chart")
        return cleanup_success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AyuCare API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_user_login():
            print("❌ Login failed, stopping tests")
            return False
            
        self.test_get_user_profile()
        
        # Dashboard and basic functionality
        self.test_dashboard_stats()
        
        # Food database tests
        self.test_seed_foods()
        self.test_get_foods()
        self.test_get_food_categories()
        self.test_search_foods()
        self.test_filter_foods_by_category()
        self.test_filter_foods_by_rasa()
        
        # Patient management tests
        if self.test_create_patient():
            self.test_get_patients()
            self.test_get_patient_detail()
            self.test_update_patient()
            
            # AI diet chart tests (requires patient)
            if self.test_ai_diet_generation():
                self.test_get_diet_charts()
                self.test_get_diet_chart_detail()
                self.test_pdf_generation()
        
        # Cleanup
        self.test_cleanup()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            failed_tests = [r for r in self.test_results if not r['success']]
            print(f"❌ {len(failed_tests)} tests failed:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['error']}")
            return False

def main():
    tester = AyuCareAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_results": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())