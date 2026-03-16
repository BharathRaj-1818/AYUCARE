import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsAPI } from '../lib/api';
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
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PRAKRITI_OPTIONS = [
  { value: 'Vata', label: 'Vata' },
  { value: 'Pitta', label: 'Pitta' },
  { value: 'Kapha', label: 'Kapha' },
  { value: 'Vata-Pitta', label: 'Vata-Pitta' },
  { value: 'Pitta-Kapha', label: 'Pitta-Kapha' },
  { value: 'Vata-Kapha', label: 'Vata-Kapha' },
  { value: 'Tridosha', label: 'Tridosha (Balanced)' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const BOWEL_OPTIONS = [
  'Regular (once daily)',
  'Irregular',
  'Constipation',
  'Loose stools',
  'Multiple times daily',
];

const DIETARY_HABITS = [
  'Vegetarian',
  'Non-Vegetarian',
  'Vegan',
  'Eggetarian',
  'Pescatarian',
];

export default function PatientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    height_cm: '',
    weight_kg: '',
    prakriti: '',
    vikriti: '',
    dietary_habits: '',
    meal_frequency: '3',
    bowel_movements: '',
    water_intake_liters: '',
    sleep_hours: '',
    allergies: '',
    health_conditions: '',
    medications: '',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const response = await patientsAPI.getOne(id);
      const patient = response.data;
      setFormData({
        ...patient,
        allergies: patient.allergies?.join(', ') || '',
        health_conditions: patient.health_conditions?.join(', ') || '',
        medications: patient.medications?.join(', ') || '',
        height_cm: patient.height_cm?.toString() || '',
        weight_kg: patient.weight_kg?.toString() || '',
        meal_frequency: patient.meal_frequency?.toString() || '3',
        water_intake_liters: patient.water_intake_liters?.toString() || '',
        sleep_hours: patient.sleep_hours?.toString() || '',
        age: patient.age?.toString() || '',
      });
    } catch (error) {
      toast.error('Failed to load patient');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.age || !formData.gender) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        age: parseInt(formData.age),
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        meal_frequency: parseInt(formData.meal_frequency) || 3,
        water_intake_liters: formData.water_intake_liters ? parseFloat(formData.water_intake_liters) : null,
        sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : null,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        health_conditions: formData.health_conditions ? formData.health_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: formData.medications ? formData.medications.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (isEdit) {
        await patientsAPI.update(id, data);
        toast.success('Patient updated successfully');
      } else {
        await patientsAPI.create(data);
        toast.success('Patient created successfully');
      }
      navigate('/patients');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to save patient';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="patient-form">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/patients')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">
            {isEdit ? 'Edit Patient' : 'New Patient'}
          </h1>
          <p className="text-stone-600 mt-1">
            {isEdit ? 'Update patient information' : 'Add a new patient profile'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter patient name"
                data-testid="name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Enter age"
                data-testid="age-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger data-testid="gender-select">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                data-testid="phone-input"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="patient@email.com"
                data-testid="email-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Physical Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Physical Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={formData.height_cm}
                onChange={(e) => handleChange('height_cm', e.target.value)}
                placeholder="170"
                data-testid="height-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => handleChange('weight_kg', e.target.value)}
                placeholder="65"
                data-testid="weight-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ayurvedic Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Ayurvedic Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="prakriti">Prakriti (Constitution)</Label>
              <Select value={formData.prakriti} onValueChange={(v) => handleChange('prakriti', v)}>
                <SelectTrigger data-testid="prakriti-select">
                  <SelectValue placeholder="Select prakriti" />
                </SelectTrigger>
                <SelectContent>
                  {PRAKRITI_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vikriti">Vikriti (Current Imbalance)</Label>
              <Select value={formData.vikriti} onValueChange={(v) => handleChange('vikriti', v)}>
                <SelectTrigger data-testid="vikriti-select">
                  <SelectValue placeholder="Select vikriti" />
                </SelectTrigger>
                <SelectContent>
                  {PRAKRITI_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle & Habits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Lifestyle & Habits</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dietary_habits">Dietary Habits</Label>
              <Select value={formData.dietary_habits} onValueChange={(v) => handleChange('dietary_habits', v)}>
                <SelectTrigger data-testid="dietary-habits-select">
                  <SelectValue placeholder="Select dietary preference" />
                </SelectTrigger>
                <SelectContent>
                  {DIETARY_HABITS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal_frequency">Meals per Day</Label>
              <Select value={formData.meal_frequency} onValueChange={(v) => handleChange('meal_frequency', v)}>
                <SelectTrigger data-testid="meal-frequency-select">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} meals</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bowel">Bowel Movements</Label>
              <Select value={formData.bowel_movements} onValueChange={(v) => handleChange('bowel_movements', v)}>
                <SelectTrigger data-testid="bowel-select">
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  {BOWEL_OPTIONS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="water">Water Intake (liters/day)</Label>
              <Input
                id="water"
                type="number"
                step="0.1"
                value={formData.water_intake_liters}
                onChange={(e) => handleChange('water_intake_liters', e.target.value)}
                placeholder="2.5"
                data-testid="water-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep">Sleep Hours</Label>
              <Input
                id="sleep"
                type="number"
                step="0.5"
                value={formData.sleep_hours}
                onChange={(e) => handleChange('sleep_hours', e.target.value)}
                placeholder="7"
                data-testid="sleep-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (comma-separated)</Label>
              <Input
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleChange('allergies', e.target.value)}
                placeholder="Peanuts, Dairy, Gluten"
                data-testid="allergies-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conditions">Health Conditions (comma-separated)</Label>
              <Input
                id="conditions"
                value={formData.health_conditions}
                onChange={(e) => handleChange('health_conditions', e.target.value)}
                placeholder="Diabetes, Hypertension"
                data-testid="conditions-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medications">Current Medications (comma-separated)</Label>
              <Input
                id="medications"
                value={formData.medications}
                onChange={(e) => handleChange('medications', e.target.value)}
                placeholder="Metformin, Amlodipine"
                data-testid="medications-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any additional information about the patient..."
                rows={4}
                data-testid="notes-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/patients')}
            data-testid="cancel-btn"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="ayur-btn-primary"
            disabled={saving}
            data-testid="save-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Update Patient' : 'Create Patient'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
