import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { patientsAPI, dietChartsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2,
  Utensils,
  Calendar,
  Target,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function DietChartForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatient = searchParams.get('patient');
  
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: preselectedPatient || '',
    duration_days: '7',
    target_calories: '',
    specific_requirements: '',
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      setPatients(response.data);
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      toast.error('Please select a patient');
      return;
    }

    setGenerating(true);
    try {
      const data = {
        patient_id: formData.patient_id,
        duration_days: parseInt(formData.duration_days),
        target_calories: formData.target_calories ? parseInt(formData.target_calories) : null,
        specific_requirements: formData.specific_requirements || null,
      };

      const response = await dietChartsAPI.generateWithAI(data);
      toast.success('Diet chart generated successfully!');
      navigate(`/diet-charts/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to generate diet chart';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="diet-chart-form">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/diet-charts')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">
            Create Diet Chart
          </h1>
          <p className="text-stone-600 mt-1">
            Generate an AI-powered Ayurvedic diet plan
          </p>
        </div>
      </div>

      {/* AI Info Banner */}
      <Card className="bg-gradient-to-r from-secondary-50 to-primary-50 border-secondary-200">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-secondary-600" />
          </div>
          <div>
            <h3 className="font-medium text-stone-800">AI-Powered Generation</h3>
            <p className="text-sm text-stone-600 mt-1">
              Our AI will analyze the patient's profile, prakriti, health conditions, and 
              dietary preferences to create a personalized Ayurvedic diet plan following 
              traditional principles.
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary-600" />
              Patient Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Select Patient *</Label>
              <Select 
                value={formData.patient_id} 
                onValueChange={(v) => handleChange('patient_id', v)}
              >
                <SelectTrigger data-testid="patient-select">
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.length > 0 ? (
                    patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - {patient.age} yrs, {patient.gender}
                        {patient.prakriti && ` (${patient.prakriti})`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No patients found. Add a patient first.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPatient && (
              <div className="p-4 rounded-lg bg-stone-50 space-y-2">
                <p className="text-sm text-stone-500">Selected Patient Profile</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-stone-500">Prakriti:</span>{' '}
                    <span className="font-medium">{selectedPatient.prakriti || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">BMI:</span>{' '}
                    <span className="font-medium">{selectedPatient.bmi || 'Not calculated'}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Diet:</span>{' '}
                    <span className="font-medium">{selectedPatient.dietary_habits || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Meals/Day:</span>{' '}
                    <span className="font-medium">{selectedPatient.meal_frequency || 3}</span>
                  </div>
                </div>
                {selectedPatient.health_conditions?.length > 0 && (
                  <div className="text-sm">
                    <span className="text-stone-500">Conditions:</span>{' '}
                    <span className="font-medium">{selectedPatient.health_conditions.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diet Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              Diet Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  Duration (Days)
                </Label>
                <Select 
                  value={formData.duration_days} 
                  onValueChange={(v) => handleChange('duration_days', v)}
                >
                  <SelectTrigger data-testid="duration-select">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 14, 21, 30].map(d => (
                      <SelectItem key={d} value={d.toString()}>
                        {d} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="calories">Target Calories (optional)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.target_calories}
                  onChange={(e) => handleChange('target_calories', e.target.value)}
                  placeholder="Auto-calculated based on profile"
                  data-testid="calories-input"
                />
                <p className="text-xs text-stone-500">
                  Leave empty for AI to calculate based on patient profile
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements" className="flex items-center gap-2">
                <Info className="w-4 h-4 text-stone-400" />
                Special Requirements (optional)
              </Label>
              <Textarea
                id="requirements"
                value={formData.specific_requirements}
                onChange={(e) => handleChange('specific_requirements', e.target.value)}
                placeholder="E.g., Weight loss focus, high protein diet, avoid certain foods, diabetic-friendly meals..."
                rows={4}
                data-testid="requirements-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/diet-charts')}
            data-testid="cancel-btn"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="ayur-btn-primary"
            disabled={generating || !formData.patient_id}
            data-testid="generate-btn"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Diet Chart
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Generation Notice */}
      {generating && (
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary-600 mb-4" />
            <h3 className="font-medium text-primary-800">Generating Your Ayurvedic Diet Plan</h3>
            <p className="text-sm text-primary-600 mt-2">
              Our AI is analyzing the patient profile and creating a personalized diet chart 
              following Ayurvedic principles. This may take a moment...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
