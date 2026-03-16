import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { foodsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Search, 
  Filter,
  Apple,
  Loader2,
  Flame,
  Snowflake,
  RefreshCw,
  X,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  'Grains', 'Lentils', 'Vegetables', 'Fruits', 'Dairy', 
  'Spices', 'Oils', 'Nuts', 'Seeds', 'Sweeteners', 
  'Beverages', 'Proteins', 'Herbs'
];

const RASAS = ['Sweet', 'Sour', 'Salty', 'Pungent', 'Bitter', 'Astringent'];

const VIRYAS = ['Hot', 'Cold', 'Neutral'];

const getRasaClass = (rasa) => {
  const classes = {
    'Sweet': 'rasa-sweet',
    'Sour': 'rasa-sour',
    'Salty': 'rasa-salty',
    'Pungent': 'rasa-pungent',
    'Bitter': 'rasa-bitter',
    'Astringent': 'rasa-astringent',
  };
  return classes[rasa] || 'bg-stone-100 text-stone-700';
};

const getViryaIcon = (virya) => {
  if (virya === 'Hot') return <Flame className="w-3 h-3 text-red-500" />;
  if (virya === 'Cold') return <Snowflake className="w-3 h-3 text-blue-500" />;
  return null;
};

export default function Foods() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [rasa, setRasa] = useState('');
  const [virya, setVirya] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const navigate = useNavigate();

  const loadFoods = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (search) params.search = search;
      if (category && category !== 'all') params.category = category;
      if (rasa && rasa !== 'all') params.rasa = rasa;
      if (virya && virya !== 'all') params.virya = virya;
      
      const response = await foodsAPI.getAll(params);
      setFoods(response.data);
    } catch (error) {
      console.error('Failed to load foods:', error);
      toast.error('Failed to load foods');
    } finally {
      setLoading(false);
    }
  }, [search, category, rasa, virya]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadFoods();
    }, 300);
    return () => clearTimeout(debounce);
  }, [loadFoods]);

  const handleSeedFoods = async () => {
    setSeeding(true);
    try {
      const response = await foodsAPI.seed();
      if (response.data.seeded !== false) {
        toast.success(`Seeded ${response.data.count} Ayurvedic foods!`);
        loadFoods();
      } else {
        toast.info(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to seed foods');
    } finally {
      setSeeding(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setRasa('');
    setVirya('');
  };

  const hasFilters = search || category || rasa || virya;

  return (
    <div className="space-y-6" data-testid="foods-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">Food Database</h1>
          <p className="text-stone-600 mt-1">
            Ayurvedic food properties and nutritional information
          </p>
        </div>
        {foods.length === 0 && !loading && (
          <Button 
            onClick={handleSeedFoods} 
            disabled={seeding}
            className="ayur-btn-primary"
            data-testid="seed-foods-btn"
          >
            {seeding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Seed Database
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input
                placeholder="Search foods by name (English or Hindi)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40" data-testid="category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rasa} onValueChange={setRasa}>
                <SelectTrigger className="w-36" data-testid="rasa-filter">
                  <SelectValue placeholder="Rasa (Taste)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rasas</SelectItem>
                  {RASAS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={virya} onValueChange={setVirya}>
                <SelectTrigger className="w-36" data-testid="virya-filter">
                  <SelectValue placeholder="Virya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Viryas</SelectItem>
                  {VIRYAS.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} data-testid="clear-filters-btn">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foods Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-700" />
        </div>
      ) : foods.length > 0 ? (
        <>
          <p className="text-sm text-stone-500">{foods.length} foods found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {foods.map((food) => (
              <Card 
                key={food.id}
                className="food-card hover:shadow-md transition-shadow"
                onClick={() => setSelectedFood(food)}
                data-testid={`food-card-${food.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="food-name">{food.name}</h3>
                      {food.name_hindi && (
                        <p className="food-hindi">{food.name_hindi}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {food.category}
                    </Badge>
                  </div>
                  
                  {/* Calories */}
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <span className="font-medium text-primary-700">{food.calories}</span>
                    <span className="text-stone-500">kcal/100g</span>
                  </div>
                  
                  {/* Rasa badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {food.rasa?.slice(0, 3).map((r, idx) => (
                      <Badge key={idx} className={`text-xs ${getRasaClass(r)}`}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Virya & properties */}
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    {getViryaIcon(food.virya)}
                    <span>{food.virya}</span>
                    {food.is_vegetarian && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Veg
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Apple className="empty-state-icon" />
          <h3 className="text-lg font-medium text-stone-800">No foods found</h3>
          <p className="text-stone-500 mt-1">
            {hasFilters 
              ? 'Try adjusting your filters'
              : 'Seed the database to get started'}
          </p>
          {!hasFilters && (
            <Button 
              onClick={handleSeedFoods}
              disabled={seeding}
              className="mt-4 ayur-btn-primary"
            >
              {seeding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Seed Food Database
            </Button>
          )}
        </div>
      )}

      {/* Food Detail Dialog */}
      <Dialog open={!!selectedFood} onOpenChange={() => setSelectedFood(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-3">
              {selectedFood?.name}
              {selectedFood?.name_hindi && (
                <span className="text-stone-500 font-normal text-base">
                  ({selectedFood.name_hindi})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedFood && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedFood.category}</Badge>
                  {selectedFood.is_vegetarian && (
                    <Badge className="bg-green-100 text-green-700">Vegetarian</Badge>
                  )}
                  {selectedFood.is_vegan && (
                    <Badge className="bg-green-100 text-green-700">Vegan</Badge>
                  )}
                  {selectedFood.is_gluten_free && (
                    <Badge className="bg-yellow-100 text-yellow-700">Gluten-Free</Badge>
                  )}
                </div>

                {/* Nutrition */}
                <div>
                  <h4 className="font-medium text-stone-800 mb-3">Nutritional Information (per 100g)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-orange-50 text-center">
                      <p className="text-2xl font-bold text-orange-700">{selectedFood.calories}</p>
                      <p className="text-xs text-orange-600">Calories</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 text-center">
                      <p className="text-2xl font-bold text-green-700">{selectedFood.protein_g}g</p>
                      <p className="text-xs text-green-600">Protein</p>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-50 text-center">
                      <p className="text-2xl font-bold text-yellow-700">{selectedFood.carbs_g}g</p>
                      <p className="text-xs text-yellow-600">Carbs</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 text-center">
                      <p className="text-2xl font-bold text-red-700">{selectedFood.fat_g}g</p>
                      <p className="text-xs text-red-600">Fat</p>
                    </div>
                  </div>
                </div>

                {/* Ayurvedic Properties */}
                <div>
                  <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary-600" />
                    Ayurvedic Properties
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-stone-50">
                      <p className="text-sm text-stone-500 mb-2">Rasa (Taste)</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFood.rasa?.map((r, idx) => (
                          <Badge key={idx} className={getRasaClass(r)}>
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-stone-50">
                      <p className="text-sm text-stone-500 mb-2">Virya (Potency)</p>
                      <div className="flex items-center gap-2">
                        {getViryaIcon(selectedFood.virya)}
                        <span className="font-medium">{selectedFood.virya}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-stone-50">
                      <p className="text-sm text-stone-500 mb-2">Vipaka (Post-digestive effect)</p>
                      <span className="font-medium">{selectedFood.vipaka}</span>
                    </div>
                    <div className="p-4 rounded-lg bg-stone-50">
                      <p className="text-sm text-stone-500 mb-2">Guna (Qualities)</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFood.guna?.map((g, idx) => (
                          <Badge key={idx} variant="outline">{g}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dosha Effect */}
                {selectedFood.dosha_effect && Object.keys(selectedFood.dosha_effect).length > 0 && (
                  <div>
                    <h4 className="font-medium text-stone-800 mb-3">Dosha Effect</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {['vata', 'pitta', 'kapha'].map(dosha => {
                        const effect = selectedFood.dosha_effect[dosha];
                        const bgColor = effect === 'decreases' || effect === 'balances' 
                          ? 'bg-green-50 border-green-200' 
                          : effect === 'increases' 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-stone-50 border-stone-200';
                        return (
                          <div key={dosha} className={`p-3 rounded-lg border ${bgColor}`}>
                            <p className="font-medium capitalize">{dosha}</p>
                            <p className="text-sm text-stone-600 capitalize">{effect || 'Neutral'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedFood.description && (
                  <div>
                    <h4 className="font-medium text-stone-800 mb-2">Description</h4>
                    <p className="text-stone-600">{selectedFood.description}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
