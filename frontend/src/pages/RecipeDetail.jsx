import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipesAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { ArrowLeft, Clock, Users, Leaf, Trash2, Loader2, CheckCircle2, Utensils } from 'lucide-react';
import { toast } from 'sonner';

const NUTRIENT_BARS = [
  { key: 'calories',  label: 'calories',  unit: 'kcal', max: 800,  color: 'bg-orange-400' },
  { key: 'protein_g', label: 'protein',   unit: 'g',    max: 50,   color: 'bg-blue-400'   },
  { key: 'carbs_g',   label: 'carbs',     unit: 'g',    max: 100,  color: 'bg-yellow-400' },
  { key: 'fat_g',     label: 'fat',       unit: 'g',    max: 40,   color: 'bg-red-400'    },
  { key: 'fiber_g',   label: 'fiber',     unit: 'g',    max: 20,   color: 'bg-green-400'  },
];

const getDoshaStyle = (d) => ({
  Vata:  'bg-purple-100 text-purple-800',
  Pitta: 'bg-orange-100 text-orange-800',
  Kapha: 'bg-teal-100   text-teal-800',
}[d] || 'bg-stone-100 text-stone-700');

export default function RecipeDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    recipesAPI.getOne(id)
      .then(r => setRecipe(r.data))
      .catch(() => { toast.error(t('recipes.loadError', 'Failed to load recipe')); navigate('/recipes'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await recipesAPI.delete(id);
      toast.success(t('recipes.deleteSuccess'));
      navigate('/recipes');
    } catch { toast.error(t('recipes.deleteError')); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>;
  if (!recipe) return null;

  const totalTime = (recipe.prep_time_mins || 0) + (recipe.cook_time_mins || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/recipes')}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary-800">{recipe.name}</h1>
            {recipe.name_hindi && <p className="text-stone-500 text-lg mt-0.5">{recipe.name_hindi}</p>}
            {recipe.description && <p className="text-stone-600 mt-2 leading-relaxed">{recipe.description}</p>}
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="flex items-center gap-1 text-sm text-stone-500">
                <Clock className="w-4 h-4" /> {totalTime} {t('recipes.min')} total
              </span>
              <span className="flex items-center gap-1 text-sm text-stone-500">
                <Users className="w-4 h-4" /> {recipe.servings} {t('recipes.servings')}
              </span>
              <Badge variant="outline">{recipe.category}</Badge>
              <Badge variant="outline">{recipe.cuisine}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowDelete(true)}>
          <Trash2 className="w-4 h-4 mr-1" /> {t('common.delete')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {(recipe.dosha_suitable?.length > 0 || recipe.health_benefits?.length > 0) && (
            <Card>
              <CardHeader><CardTitle className="text-lg font-serif flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary-600" /> {t('foods.ayurvedicProperties')}
              </CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {recipe.dosha_suitable?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-stone-500 mb-2">{t('recipes.suitableFor')}</p>
                    <div className="flex gap-2">
                      {recipe.dosha_suitable.map(d => <Badge key={d} className={getDoshaStyle(d)}>{d}</Badge>)}
                    </div>
                  </div>
                )}
                {recipe.health_benefits?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-stone-500 mb-2">{t('recipes.healthBenefits')}</p>
                    <div className="space-y-1">
                      {recipe.health_benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-stone-700">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />{b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {recipe.ingredients?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg font-serif flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary-600" /> {t('recipes.ingredients')}
              </CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                      <span className="text-stone-700">{ing.food_name || ing.food_id}</span>
                      <span className="text-sm font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded">{ing.quantity_g}g</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recipe.instructions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg font-serif">{t('recipes.cookingInstructions')}</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-stone-700 leading-relaxed pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: nutrition */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg font-serif">{t('recipes.nutritionPerServing')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {recipe.total_nutrients && (() => {
                const perServing = Object.fromEntries(
                  Object.entries(recipe.total_nutrients).map(([k, v]) => [k, v / (recipe.servings || 1)])
                );
                return NUTRIENT_BARS.map(n => (
                  <div key={n.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-stone-600">{t(`nutrients.${n.label}`, n.label)}</span>
                      <span className="font-medium text-stone-800">{Math.round(perServing[n.key] || 0)}{n.unit}</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className={`${n.color} h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min(100, ((perServing[n.key] || 0) / n.max) * 100)}%` }} />
                    </div>
                  </div>
                ));
              })()}
              <div className="pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-400">{t('recipes.totalRecipe')} ({recipe.servings} {t('recipes.servings')})</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['calories','protein_g','carbs_g','fat_g'].map(k => (
                    <div key={k} className="text-center p-2 bg-stone-50 rounded">
                      <p className="font-semibold text-stone-800">{Math.round(recipe.total_nutrients?.[k] || 0)}</p>
                      <p className="text-xs text-stone-500">{k.replace('_g','').replace('_',' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">{t('recipes.prepTimeLabel')}</span><span className="font-medium">{recipe.prep_time_mins || 0} {t('recipes.min')}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('recipes.cookTimeLabel')}</span><span className="font-medium">{recipe.cook_time_mins || 0} {t('recipes.min')}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('recipes.totalTime')}</span><span className="font-medium">{totalTime} {t('recipes.min')}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">{t('recipes.servingsLabel')}</span><span className="font-medium">{recipe.servings}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recipes.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('recipes.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}