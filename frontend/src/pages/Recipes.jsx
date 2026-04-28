import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recipesAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Plus, Search, MoreVertical, Eye, Trash2, FileText, Loader2, Clock, Users, Filter } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const DOSHAS = ['Vata', 'Pitta', 'Kapha'];

export default function Recipes() {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dosha, setDosha] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadRecipes(); }, [category, dosha]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category && category !== 'all') params.category = category;
      if (dosha && dosha !== 'all') params.dosha = dosha;
      const response = await recipesAPI.getAll(params);
      setRecipes(response.data);
    } catch {
      toast.error(t('recipes.loadError', 'Failed to load recipes'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await recipesAPI.delete(deleteId);
      toast.success(t('recipes.deleteSuccess', 'Recipe deleted successfully'));
      loadRecipes();
    } catch {
      toast.error(t('recipes.deleteError', 'Failed to delete recipe'));
    } finally {
      setDeleteId(null);
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    !search || recipe.name.toLowerCase().includes(search.toLowerCase())
  );

  const getDoshaColor = (d) => {
    if (d === 'Vata') return 'dosha-vata';
    if (d === 'Pitta') return 'dosha-pitta';
    if (d === 'Kapha') return 'dosha-kapha';
    return 'bg-stone-100 text-stone-700';
  };

  return (
    <div className="space-y-6" data-testid="recipes-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('nav.recipes')}</h1>
          <p className="text-stone-600 mt-1">{t('recipes.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/recipes/new')} className="ayur-btn-primary" data-testid="create-recipe-btn">
          <Plus className="w-4 h-4 mr-2" />{t('recipes.create')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input placeholder={t('recipes.searchPlaceholder')} value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="search-input" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40" data-testid="category-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('recipes.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('recipes.allCategories')}</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dosha} onValueChange={setDosha}>
              <SelectTrigger className="w-40" data-testid="dosha-filter">
                <SelectValue placeholder={t('prakriti.dosha')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('recipes.allDoshas')}</SelectItem>
                {DOSHAS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
        </div>
      ) : filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
              onClick={() => navigate(`/recipes/${recipe.id}`)} data-testid={`recipe-card-${recipe.id}`}>
              {recipe.image_url && (
                <div className="h-40 bg-stone-100">
                  <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-serif font-semibold text-lg text-stone-800">{recipe.name}</h3>
                    {recipe.name_hindi && <p className="text-sm text-stone-500">{recipe.name_hindi}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/recipes/${recipe.id}`); }}>
                        <Eye className="w-4 h-4 mr-2" />{t('common.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(recipe.id); }} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 text-sm text-stone-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />{(recipe.prep_time_mins || 0) + (recipe.cook_time_mins || 0)} {t('recipes.min')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />{recipe.servings} {t('recipes.servings')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{recipe.category}</Badge>
                  <Badge variant="outline">{recipe.cuisine}</Badge>
                </div>
                {recipe.dosha_suitable?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.dosha_suitable.map((d, idx) => (
                      <Badge key={idx} className={`text-xs ${getDoshaColor(d)}`}>{d}</Badge>
                    ))}
                  </div>
                )}
                {recipe.total_nutrients && (
                  <div className="mt-3 pt-3 border-t border-stone-100 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="font-semibold text-stone-800">{Math.round(recipe.total_nutrients.calories)}</p>
                      <p className="text-stone-500">kcal</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-800">{Math.round(recipe.total_nutrients.protein_g)}g</p>
                      <p className="text-stone-500">{t('nutrients.protein')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-800">{Math.round(recipe.total_nutrients.carbs_g)}g</p>
                      <p className="text-stone-500">{t('nutrients.carbs')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-800">{Math.round(recipe.total_nutrients.fat_g)}g</p>
                      <p className="text-stone-500">{t('nutrients.fat')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="text-lg font-medium text-stone-800">{t('recipes.noRecipes')}</h3>
          <p className="text-stone-500 mt-1">
            {search || category || dosha ? t('common.adjustFilters') : t('recipes.createFirst')}
          </p>
          {!search && !category && !dosha && (
            <Button onClick={() => navigate('/recipes/new')} className="mt-4 ayur-btn-primary">
              <Plus className="w-4 h-4 mr-2" />{t('recipes.create')}
            </Button>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recipes.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('recipes.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-btn">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}