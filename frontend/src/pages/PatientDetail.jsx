import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsAPI, dietChartsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  ArrowLeft, 
  Edit2, 
  Utensils, 
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  Scale,
  Ruler,
  Activity,
  Heart,
  Pill,
  AlertCircle,
  Droplets,
  Moon,
  Sparkles,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [dietCharts, setDietCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatient();
    loadDietCharts();
  }, [id]);

  const loadPatient = async () => {
    try {
      const response = await patientsAPI.getOne(id);
      setPatient(response.data);
    } catch (error) {
      toast.error('Failed to load patient');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const loadDietCharts = async () => {
    try {
      const response = await dietChartsAPI.getAll({ patient_id: id });
      setDietCharts(response.data);
    } catch (error) {
      console.error('Failed to load diet charts:', error);
    }
  };

  const getDoshaColor = (dosha) => {
    if (!dosha) return 'bg-stone-100 text-stone-700';
    if (dosha.includes('Vata')) return 'dosha-vata';
    if (dosha.includes('Pitta')) return 'dosha-pitta';
    if (dosha.includes('Kapha')) return 'dosha-kapha';
    return 'bg-stone-100 text-stone-700';
  };

  const getBMIStatus = (bmi) => {
    if (!bmi) return { label: 'Unknown', color: 'text-stone-500' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-600' };
    return { label: 'Obese', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (!patient) return null;

  const bmiStatus = getBMIStatus(patient.bmi);

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="patient-detail">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/patients')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">
                {patient.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary-800">{patient.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-stone-600">{patient.age} yrs • {patient.gender}</span>
                {patient.prakriti && (
                  <Badge className={getDoshaColor(patient.prakriti)}>
                    {patient.prakriti}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate(`/patients/${id}/edit`)}
            data-testid="edit-btn"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            className="ayur-btn-primary"
            onClick={() => navigate(`/diet-charts/new?patient=${id}`)}
            data-testid="create-diet-btn"
          >
            <Utensils className="w-4 h-4 mr-2" />
            Create Diet Chart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-stone-400" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-stone-400" />
                  <span>{patient.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-stone-400" />
                <span>Added {new Date(patient.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Physical Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" />
                Physical Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Ruler className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className="text-2xl font-bold text-stone-800">
                    {patient.height_cm || '-'}
                  </p>
                  <p className="text-sm text-stone-500">Height (cm)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Scale className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className="text-2xl font-bold text-stone-800">
                    {patient.weight_kg || '-'}
                  </p>
                  <p className="text-sm text-stone-500">Weight (kg)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Activity className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className={`text-2xl font-bold ${bmiStatus.color}`}>
                    {patient.bmi || '-'}
                  </p>
                  <p className="text-sm text-stone-500">BMI ({bmiStatus.label})</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-stone-50">
                  <Utensils className="w-5 h-5 mx-auto text-stone-400 mb-2" />
                  <p className="text-2xl font-bold text-stone-800">
                    {patient.meal_frequency || 3}
                  </p>
                  <p className="text-sm text-stone-500">Meals/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifestyle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-600" />
                Lifestyle & Habits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <Droplets className="w-5 h-5 text-blue-500 mb-2" />
                  <p className="text-lg font-semibold text-blue-800">
                    {patient.water_intake_liters || '-'} L
                  </p>
                  <p className="text-sm text-blue-600">Water Intake/Day</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <Moon className="w-5 h-5 text-purple-500 mb-2" />
                  <p className="text-lg font-semibold text-purple-800">
                    {patient.sleep_hours || '-'} hrs
                  </p>
                  <p className="text-sm text-purple-600">Sleep/Night</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <Utensils className="w-5 h-5 text-green-500 mb-2" />
                  <p className="text-lg font-semibold text-green-800">
                    {patient.dietary_habits || 'Not specified'}
                  </p>
                  <p className="text-sm text-green-600">Dietary Habit</p>
                </div>
              </div>
              {patient.bowel_movements && (
                <div className="pt-2">
                  <p className="text-sm text-stone-500">Bowel Movements</p>
                  <p className="text-stone-700">{patient.bowel_movements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif flex items-center gap-2">
                <Pill className="w-5 h-5 text-primary-600" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.allergies?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Allergies
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="destructive" className="bg-red-100 text-red-700">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {patient.health_conditions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2">Health Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.health_conditions.map((condition, idx) => (
                      <Badge key={idx} variant="secondary">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {patient.medications?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2">Current Medications</p>
                  <div className="flex flex-wrap gap-2">
                    {patient.medications.map((med, idx) => (
                      <Badge key={idx} className="bg-blue-100 text-blue-700">
                        {med}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {patient.notes && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-stone-500 mb-2">Notes</p>
                  <p className="text-stone-700 whitespace-pre-wrap">{patient.notes}</p>
                </div>
              )}
              {!patient.allergies?.length && !patient.health_conditions?.length && 
               !patient.medications?.length && !patient.notes && (
                <p className="text-stone-500 text-center py-4">
                  No medical information recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ayurvedic Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Ayurvedic Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-stone-500">Prakriti (Constitution)</p>
                <p className="text-lg font-medium text-stone-800">
                  {patient.prakriti || 'Not assessed'}
                </p>
                {patient.prakriti && (
                  <Badge className={`mt-2 ${getDoshaColor(patient.prakriti)}`}>
                    {patient.prakriti}
                  </Badge>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-sm text-stone-500">Vikriti (Current Imbalance)</p>
                <p className="text-lg font-medium text-stone-800">
                  {patient.vikriti || 'Not assessed'}
                </p>
                {patient.vikriti && (
                  <Badge className={`mt-2 ${getDoshaColor(patient.vikriti)}`}>
                    {patient.vikriti}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Diet Charts */}
          <Card data-testid="diet-charts-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-serif">Diet Charts</CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => navigate(`/diet-charts/new?patient=${id}`)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {dietCharts.length > 0 ? (
                <div className="space-y-3">
                  {dietCharts.slice(0, 5).map((chart) => (
                    <div 
                      key={chart.id}
                      className="p-3 rounded-lg bg-stone-50 hover:bg-stone-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/diet-charts/${chart.id}`)}
                      data-testid={`diet-chart-${chart.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-stone-800 truncate">{chart.title}</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {chart.start_date} - {chart.end_date}
                          </p>
                        </div>
                        <Sparkles className="w-4 h-4 text-secondary-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Utensils className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                  <p className="text-sm text-stone-500">No diet charts yet</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => navigate(`/diet-charts/new?patient=${id}`)}
                    className="text-primary-700 mt-1"
                  >
                    Create first chart
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
