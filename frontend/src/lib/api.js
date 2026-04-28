import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth token interceptor ──
api.interceptors.request.use((config) => {
  const url = config.url || '';
  // Patient routes use patient token, EXCEPT the invite route (dietitian uses that)
  const isPatientRoute = url.includes('/patient-portal/') && !url.includes('/patient-portal/invite');
  const token = isPatientRoute
    ? localStorage.getItem('ayucare_patient_token')
    : localStorage.getItem('ayucare_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth error handler ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isPatientRoute = error.config?.url?.includes('/patient-portal/');
      if (isPatientRoute) {
        localStorage.removeItem('ayucare_patient_token');
        localStorage.removeItem('ayucare_patient_user');
        window.location.href = '/patient/login';
      } else {
        localStorage.removeItem('ayucare_token');
        localStorage.removeItem('ayucare_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API ──
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
};

// ── Patients API ──
export const patientsAPI = {
  getAll:  (params)   => api.get('/patients', { params }),
  getOne:  (id)       => api.get(`/patients/${id}`),
  create:  (data)     => api.post('/patients', data),
  update:  (id, data) => api.put(`/patients/${id}`, data),
  delete:  (id)       => api.delete(`/patients/${id}`),
};

// ── Foods API ──
export const foodsAPI = {
  getAll:        (params) => api.get('/foods', { params }),
  getOne:        (id)     => api.get(`/foods/${id}`),
  create:        (data)   => api.post('/foods', data),
  getCategories: ()       => api.get('/foods/categories/list'),
  seed:          ()       => api.post('/seed/foods'),
};

// ── Recipes API ──
export const recipesAPI = {
  getAll:  (params) => api.get('/recipes', { params }),
  getOne:  (id)     => api.get(`/recipes/${id}`),
  create:  (data)   => api.post('/recipes', data),
  delete:  (id)     => api.delete(`/recipes/${id}`),
};

// ── Diet Charts API ──
export const dietChartsAPI = {
  getAll:           (params) => api.get('/diet-charts', { params }),
  getOne:           (id)     => api.get(`/diet-charts/${id}`),
  create:           (data)   => api.post('/diet-charts', data),
  delete:           (id)     => api.delete(`/diet-charts/${id}`),
  generateWithAI:   (data)   => api.post('/ai/generate-diet', data),
  downloadPDF:      (id)     => `${API_BASE}/diet-charts/${id}/pdf`,
  analyzeNutrients: (id)     => api.post(`/diet-charts/${id}/analyze-nutrients`),
  getNutrientReport:(id)     => api.get(`/diet-charts/${id}/nutrient-report`),
};

// ── Dashboard API ──
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// ── Prakriti API ──
export const prakritiAPI = {
  getQuestions:     ()                   => api.get('/prakriti/questions'),
  submitAssessment: (patientId, answers) => api.post('/prakriti/assess', { patient_id: patientId, answers }),
  getHistory:       (patientId)          => api.get(`/prakriti/history/${patientId}`),
};

// ── Ritucharya API ──
export const ritucharyaAPI = {
  getCurrent: ()      => api.get('/ritucharya/current'),
  getAll:     ()      => api.get('/ritucharya/all'),
  getByMonth: (month) => api.get(`/ritucharya/${month}`),
};

// ── Patient Portal API ──
export const patientPortalAPI = {
  register:          (data)      => api.post('/patient-portal/register', data),
  login:             (data)      => api.post('/patient-portal/login', data),
  getMe:             ()          => api.get('/patient-portal/me'),
  getDashboard:      ()          => api.get('/patient-portal/dashboard'),
  getDietCharts:     ()          => api.get('/patient-portal/diet-charts'),
  getDietChart:      (id)        => api.get(`/patient-portal/diet-charts/${id}`),
  getPrakriti:       ()          => api.get('/patient-portal/prakriti'),
  logProgress:       (data)      => api.post('/patient-portal/progress/log', data),
  getProgress:       (days = 30) => api.get(`/patient-portal/progress?days=${days}`),
  getAppointments:   ()          => api.get('/patient-portal/appointments'),
  requestAppointment:(data)      => api.post('/patient-portal/appointments/request', data),
  cancelAppointment: (id)        => api.delete(`/patient-portal/appointments/${id}/cancel`),
  createInvite:      (data)      => api.post('/patient-portal/invite', data),
};

// ── Appointments API (dietitian side) ──
export const appointmentsAPI = {
  getAll:   (params)    => api.get('/appointments', { params }),
  getOne:   (id)        => api.get(`/appointments/${id}`),
  create:   (data)      => api.post('/appointments', data),
  update:   (id, data)  => api.put(`/appointments/${id}`, data),
  delete:   (id)        => api.delete(`/appointments/${id}`),
  getSlots: (date)      => api.get(`/appointments/slots/${date}`),
};

// ── Herbs API ──
export const herbsAPI = {
  getAll:    (params)           => api.get('/herbs', { params }),
  getOne:    (id)               => api.get(`/herbs/${id}`),
  seed:      ()                 => api.post('/herbs/seed'),
  prescribe: (chartId, herbIds) => api.post(`/diet-charts/${chartId}/prescribe-herbs`, { herb_ids: herbIds }),
};

export default api;