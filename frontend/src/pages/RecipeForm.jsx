import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipesAPI, foodsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Plus, Trash2, Search, Loader2, Utensils, Clock, Users, Leaf, ChefHat, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES  = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const CUISINES    = ['Indian', 'South Indian', 'North Indian', 'Continental', 'Ayurvedic'];
const DOSHAS      = ['Vata', 'Pitta', 'Kapha'];

export default function RecipeForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [saving, setSaving]             = useState(false);
  const [foods, setFoods]               = useState([]);
  const [foodSearch, setFoodSearch]     = useState('');
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [form, setForm] = useState({
    name: '', name_hindi: '', description: '', category: 'Breakfast', cuisine: 'Indian',
    prep_time_mins: '', cook_time_mins: '', servings: '2',
    dosha_suitable: [], health_benefits: [], instructions: [''], ingredients: [],
  });
  const [benefitInput, setBenefitInput] = useState('');

  useEffect(() => { foodsAPI.getAll({ limit: 200 }).then(r => setFoods(r.data)).catch(() => {}); }, []);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));
  const addInstruction    = ()     => set('instructions', [...form.instructions, '']);
  const removeInstruction = (i)    => set('instructions', form.instructions.filter((_, idx) => idx !== i));
  const setInstruction    = (i, v) => set('instructions', form.instructions.map((s, idx) => idx === i ? v : s));
  const toggleDosha = (d) => set('dosha_suitable', form.dosha_suitable.includes(d) ? form.dosha_suitable.filter(x => x !== d) : [...form.dosha_suitable, d]);
  const addBenefit = () => { const v = benefitInput.trim(); if (v && !form.health_benefits.includes(v)) { set('health_benefits', [...form.health_benefits, v]); setBenefitInput(''); } };
  const removeBenefit = (b) => set('health_benefits', form.health_benefits.filter(x => x !== b));
  const addIngredient = (food) => {
    if (form.ingredients.find(i => i.food_id === food.id)) { toast.info(`${food.name} already added`); return; }
    set('ingredients', [...form.ingredients, { food_id: food.id, food_name: food.name, quantity_g: 100 }]);
    setShowFoodPicker(false); setFoodSearch('');
  };
  const removeIngredient = (fid)      => set('ingredients', form.ingredients.filter(i => i.food_id !== fid));
  const setIngredientQty = (fid, qty) => set('ingredients', form.ingredients.map(i => i.food_id === fid ? { ...i, quantity_g: Number(qty) } : i));
  const filteredFoods = foods.filter(f => !foodSearch || f.name.toLowerCase().includes(foodSearch.toLowerCase()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())             return toast.error(t('recipes.nameRequired', 'Recipe name is required'));
    if (form.ingredients.length === 0) return toast.error(t('recipes.ingredientRequired', 'Add at least one ingredient'));
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), name_hindi: form.name_hindi.trim() || null,
        description: form.description.trim() || null, category: form.category, cuisine: form.cuisine,
        prep_time_mins: Number(form.prep_time_mins) || 0, cook_time_mins: Number(form.cook_time_mins) || 0,
        servings: Number(form.servings) || 2, dosha_suitable: form.dosha_suitable,
        health_benefits: form.health_benefits, instructions: form.instructions.filter(s => s.trim()),
        ingredients: form.ingredients.map(({ food_id, quantity_g }) => ({ food_id, quantity_g })),
      };
      await recipesAPI.create(payload);
      toast.success(t('recipes.createSuccess'));
      navigate('/recipes');
    } catch (err) {
      toast.error(err.response?.data?.detail || t('recipes.createError'));
    } finally { setSaving(false); }
  };

  const getDoshaStyle = (d) => ({ Vata: 'bg-purple-100 text-purple-800 border-purple-300', Pitta: 'bg-orange-100 text-orange-800 border-orange-300', Kapha: 'bg-teal-100 text-teal-800 border-teal-300' }[d] || 'bg-stone-100 text-stone-700');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/recipes')}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('recipes.createTitle')}</h1>
          <p className="text-stone-600 mt-1">{t('recipes.createSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif flex items-center gap-2"><ChefHat className="w-5 h-5 text-primary-600" /> {t('recipes.basicInfo')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('recipes.recipeName')}</Label><Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Moong Dal Khichdi" /></div>
              <div className="space-y-2"><Label>{t('recipes.nameHindi')}</Label><Input value={form.name_hindi} onChange={e => set('name_hindi', e.target.value)} placeholder="e.g. मूंग दाल खिचड़ी" /></div>
            </div>
            <div className="space-y-2"><Label>{t('recipes.description')}</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('recipes.descriptionPlaceholder')} rows={2} /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>{t('recipes.category')}</Label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t('recipes.cuisine')}</Label>
                <Select value={form.cuisine} onValueChange={v => set('cuisine', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t('recipes.prepTime')}</Label><Input type="number" min="0" value={form.prep_time_mins} onChange={e => set('prep_time_mins', e.target.value)} placeholder="15" /></div>
              <div className="space-y-2"><Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t('recipes.cookTime')}</Label><Input type="number" min="0" value={form.cook_time_mins} onChange={e => set('cook_time_mins', e.target.value)} placeholder="30" /></div>
            </div>
            <div className="space-y-2 w-32"><Label className="flex items-center gap-1"><Users className="w-3 h-3" /> {t('recipes.servingsLabel')}</Label><Input type="number" min="1" value={form.servings} onChange={e => set('servings', e.target.value)} placeholder="2" /></div>
          </CardContent>
        </Card>

        {/* Ayurvedic Properties */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif flex items-center gap-2"><Leaf className="w-5 h-5 text-primary-600" /> {t('foods.ayurvedicProperties')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">{t('recipes.suitableForDoshas')}</Label>
              <div className="flex gap-3">
                {DOSHAS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDosha(d)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.dosha_suitable.includes(d) ? getDoshaStyle(d) + ' border-current' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">{t('recipes.healthBenefits')}</Label>
              <div className="flex gap-2 mb-2">
                <Input value={benefitInput} onChange={e => setBenefitInput(e.target.value)}
                  placeholder={t('recipes.benefitPlaceholder')} className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())} />
                <Button type="button" variant="outline" onClick={addBenefit}>{t('common.add')}</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.health_benefits.map(b => (
                  <Badge key={b} variant="secondary" className="gap-1 pr-1">
                    {b}<button type="button" onClick={() => removeBenefit(b)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif flex items-center gap-2"><Utensils className="w-5 h-5 text-primary-600" /> {t('recipes.ingredients')}<span className="text-xs font-normal text-stone-400 ml-1">({t('recipes.autoCalculated')})</span></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {form.ingredients.length > 0 && (
              <div className="space-y-2">
                {form.ingredients.map(ing => (
                  <div key={ing.food_id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100">
                    <div className="flex-1"><p className="text-sm font-medium text-stone-800">{ing.food_name}</p></div>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="1" value={ing.quantity_g} onChange={e => setIngredientQty(ing.food_id, e.target.value)} className="w-24 text-sm" />
                      <span className="text-xs text-stone-500">g</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(ing.food_id)} className="text-red-400 hover:text-red-600 h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showFoodPicker ? (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-stone-50 border-b flex items-center gap-2">
                  <Search className="w-4 h-4 text-stone-400" />
                  <Input value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                    placeholder={t('common.search') + ' foods...'} className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0" autoFocus />
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowFoodPicker(false); setFoodSearch(''); }}><X className="w-4 h-4" /></Button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-stone-100">
                  {filteredFoods.length > 0 ? filteredFoods.slice(0, 30).map(food => (
                    <button key={food.id} type="button" onClick={() => addIngredient(food)} className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium text-stone-800">{food.name}</p><p className="text-xs text-stone-400">{food.category} · {food.calories} kcal/100g</p></div>
                        <div className="flex gap-1">{food.rasa?.slice(0,2).map(r => <span key={r} className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">{r}</span>)}</div>
                      </div>
                    </button>
                  )) : <p className="text-sm text-stone-400 text-center py-6">{t('common.noData')}</p>}
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowFoodPicker(true)}>
                <Plus className="w-4 h-4 mr-2" /> {t('recipes.addIngredient')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">{t('recipes.cookingInstructions')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {form.instructions.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2">{i + 1}</span>
                <Textarea value={step} onChange={e => setInstruction(i, e.target.value)} placeholder={`Step ${i + 1}...`} rows={2} className="flex-1" />
                {form.instructions.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="mt-2 text-red-400 hover:text-red-600" onClick={() => removeInstruction(i)}><Trash2 className="w-4 h-4" /></Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={addInstruction}>
              <Plus className="w-4 h-4 mr-2" /> {t('recipes.addStep')}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/recipes')}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving} className="ayur-btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('recipes.saving')}</> : <><ChefHat className="w-4 h-4 mr-2" />{t('recipes.saveRecipe')}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}