import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ayucare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ayucare_token');
      localStorage.removeItem('ayucare_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Patients API
export const patientsAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getOne: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
};

// Foods API
export const foodsAPI = {
  getAll: (params) => api.get('/foods', { params }),
  getOne: (id) => api.get(`/foods/${id}`),
  create: (data) => api.post('/foods', data),
  getCategories: () => api.get('/foods/categories/list'),
  seed: () => api.post('/seed/foods'),
};

// Recipes API
export const recipesAPI = {
  getAll: (params) => api.get('/recipes', { params }),
  getOne: (id) => api.get(`/recipes/${id}`),
  create: (data) => api.post('/recipes', data),
  delete: (id) => api.delete(`/recipes/${id}`),
};

// Diet Charts API
export const dietChartsAPI = {
  getAll: (params) => api.get('/diet-charts', { params }),
  getOne: (id) => api.get(`/diet-charts/${id}`),
  create: (data) => api.post('/diet-charts', data),
  delete: (id) => api.delete(`/diet-charts/${id}`),
  generateWithAI: (data) => api.post('/ai/generate-diet', data),
  downloadPDF: (id) => `${API_BASE}/diet-charts/${id}/pdf`,
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
