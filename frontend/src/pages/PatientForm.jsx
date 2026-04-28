import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PRAKRITI_OPTIONS = [
  { value: 'Vata', label: 'Vata' }, { value: 'Pitta', label: 'Pitta' },
  { value: 'Kapha', label: 'Kapha' }, { value: 'Vata-Pitta', label: 'Vata-Pitta' },
  { value: 'Pitta-Kapha', label: 'Pitta-Kapha' }, { value: 'Vata-Kapha', label: 'Vata-Kapha' },
  { value: 'Tridosha', label: 'Tridosha (Balanced)' },
];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BOWEL_OPTIONS  = ['Regular (once daily)', 'Irregular', 'Constipation', 'Loose stools', 'Multiple times daily'];
const DIETARY_HABITS = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Pescatarian'];

export default function PatientForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', phone: '', email: '',
    height_cm: '', weight_kg: '', prakriti: '', vikriti: '',
    dietary_habits: '', meal_frequency: '3', bowel_movements: '',
    water_intake_liters: '', sleep_hours: '', allergies: '',
    health_conditions: '', medications: '', notes: '',
  });

  useEffect(() => { if (isEdit) loadPatient(); }, [id]);

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
    } catch {
      toast.error(t('patients.loadError'));
      navigate('/patients');
    } finally { setLoading(false); }
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.age || !formData.gender) {
      toast.error(t('patients.requiredFields', 'Please fill in required fields'));
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
        toast.success(t('patients.updateSuccess'));
      } else {
        await patientsAPI.create(data);
        toast.success(t('patients.createSuccess'));
      }
      navigate('/patients');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('patients.saveError'));
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="patient-form">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">
            {isEdit ? t('patients.editPatient') : t('patients.newPatient')}
          </h1>
          <p className="text-stone-600 mt-1">{isEdit ? t('patients.updateInfo') : t('patients.addNew')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('patients.basicInfo')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t('patients.fullName')} *</Label>
              <Input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder={t('patients.enterName')} data-testid="name-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.age')} *</Label>
              <Input type="number" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} placeholder={t('patients.enterAge')} data-testid="age-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.gender')} *</Label>
              <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger data-testid="gender-select"><SelectValue placeholder={t('patients.selectGender')} /></SelectTrigger>
                <SelectContent>{GENDER_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('patients.phone')}</Label>
              <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" data-testid="phone-input" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('auth.email')}</Label>
              <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="patient@email.com" data-testid="email-input" />
            </div>
          </CardContent>
        </Card>

        {/* Physical Metrics */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('patients.physicalMetrics')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t('patients.heightCm')}</Label>
              <Input type="number" step="0.1" value={formData.height_cm} onChange={(e) => handleChange('height_cm', e.target.value)} placeholder="170" data-testid="height-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.weightKg')}</Label>
              <Input type="number" step="0.1" value={formData.weight_kg} onChange={(e) => handleChange('weight_kg', e.target.value)} placeholder="65" data-testid="weight-input" />
            </div>
          </CardContent>
        </Card>

        {/* Ayurvedic Profile */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('patients.ayurvedicProfile')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t('patients.prakritiConstitution')}</Label>
              <Select value={formData.prakriti} onValueChange={(v) => handleChange('prakriti', v)}>
                <SelectTrigger data-testid="prakriti-select"><SelectValue placeholder={t('patients.selectPrakriti')} /></SelectTrigger>
                <SelectContent>{PRAKRITI_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('patients.vikritiImbalance')}</Label>
              <Select value={formData.vikriti} onValueChange={(v) => handleChange('vikriti', v)}>
                <SelectTrigger data-testid="vikriti-select"><SelectValue placeholder={t('patients.selectVikriti')} /></SelectTrigger>
                <SelectContent>{PRAKRITI_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('patients.lifestyleHabits')}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t('patients.dietaryHabits')}</Label>
              <Select value={formData.dietary_habits} onValueChange={(v) => handleChange('dietary_habits', v)}>
                <SelectTrigger data-testid="dietary-habits-select"><SelectValue placeholder={t('patients.selectDietary')} /></SelectTrigger>
                <SelectContent>{DIETARY_HABITS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('patients.mealsPerDay')}</Label>
              <Select value={formData.meal_frequency} onValueChange={(v) => handleChange('meal_frequency', v)}>
                <SelectTrigger data-testid="meal-frequency-select"><SelectValue placeholder={t('patients.selectFrequency')} /></SelectTrigger>
                <SelectContent>{[2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={n.toString()}>{n} {t('common.meals')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('patients.bowelMovements')}</Label>
              <Select value={formData.bowel_movements} onValueChange={(v) => handleChange('bowel_movements', v)}>
                <SelectTrigger data-testid="bowel-select"><SelectValue placeholder={t('patients.selectPattern')} /></SelectTrigger>
                <SelectContent>{BOWEL_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('patients.waterIntake')}</Label>
              <Input type="number" step="0.1" value={formData.water_intake_liters} onChange={(e) => handleChange('water_intake_liters', e.target.value)} placeholder="2.5" data-testid="water-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.sleepHours')}</Label>
              <Input type="number" step="0.5" value={formData.sleep_hours} onChange={(e) => handleChange('sleep_hours', e.target.value)} placeholder="7" data-testid="sleep-input" />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('patients.medicalInfo')}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t('patients.allergies')}</Label>
              <Input value={formData.allergies} onChange={(e) => handleChange('allergies', e.target.value)} placeholder="Peanuts, Dairy, Gluten" data-testid="allergies-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.healthConditions')}</Label>
              <Input value={formData.health_conditions} onChange={(e) => handleChange('health_conditions', e.target.value)} placeholder="Diabetes, Hypertension" data-testid="conditions-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.medications')}</Label>
              <Input value={formData.medications} onChange={(e) => handleChange('medications', e.target.value)} placeholder="Metformin, Amlodipine" data-testid="medications-input" />
            </div>
            <div className="space-y-2">
              <Label>{t('patients.notes')}</Label>
              <Textarea value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder={t('patients.notesPlaceholder')} rows={4} data-testid="notes-input" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/patients')} data-testid="cancel-btn">{t('common.cancel')}</Button>
          <Button type="submit" className="ayur-btn-primary" disabled={saving} data-testid="save-btn">
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('patients.saving')}</>
              : <><Save className="w-4 h-4 mr-2" />{isEdit ? t('patients.updatePatient') : t('patients.createPatient')}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}