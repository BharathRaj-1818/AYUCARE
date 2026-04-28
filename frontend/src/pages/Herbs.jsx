import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { herbsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Search, Loader2, Leaf, X, RefreshCw, AlertTriangle, CheckCircle2, Flame, Snowflake, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES  = ['Adaptogen','Digestive','Nervine','Rejuvenative','Anti-inflammatory','Immunomodulator','Blood purifier','Diuretic','Expectorant','Anti-microbial','Urinary'];
const DOSHA_OPTIONS = ['Vata','Pitta','Kapha'];
const DOSHA_COLOR = { Vata:'bg-purple-100 text-purple-800', Pitta:'bg-orange-100 text-orange-800', Kapha:'bg-teal-100 text-teal-800' };
const CATEGORY_COLOR = { 'Adaptogen':'bg-green-100 text-green-800','Digestive':'bg-yellow-100 text-yellow-800','Nervine':'bg-blue-100 text-blue-800','Rejuvenative':'bg-purple-100 text-purple-800','Anti-inflammatory':'bg-red-100 text-red-800','Immunomodulator':'bg-teal-100 text-teal-800','Blood purifier':'bg-pink-100 text-pink-800','Diuretic':'bg-cyan-100 text-cyan-800','Expectorant':'bg-amber-100 text-amber-800','Anti-microbial':'bg-lime-100 text-lime-800','Urinary':'bg-indigo-100 text-indigo-800' };
const getViryaIcon = (v) => { if (v==='Hot') return <Flame className="w-3 h-3 text-red-500" />; if (v==='Cold') return <Snowflake className="w-3 h-3 text-blue-500" />; return null; };

function HerbDetailModal({ herb, open, onClose }) {
  const { t } = useTranslation();
  if (!herb) return null;
  const primaryDosha = herb.primary_dosha_effect?.split('-')[0];
  const doshaColor = DOSHA_COLOR[primaryDosha] || 'bg-stone-100 text-stone-700';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>{herb.name}{herb.name_hindi && <span className="text-stone-500 font-normal text-base ml-2">({herb.name_hindi})</span>}</div>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge className={CATEGORY_COLOR[herb.category] || 'bg-stone-100 text-stone-700'}>{herb.category}</Badge>
              {herb.primary_dosha_effect && <Badge className={doshaColor}>{t('herbs.pacifies')} {herb.primary_dosha_effect}</Badge>}
              {herb.virya && <Badge variant="outline" className="flex items-center gap-1">{getViryaIcon(herb.virya)}{herb.virya}</Badge>}
              {herb.name_sanskrit && <Badge variant="outline" className="font-mono text-xs">{herb.name_sanskrit}</Badge>}
            </div>
            {herb.description && <p className="text-stone-600 leading-relaxed text-sm">{herb.description}</p>}
            {herb.modern_research && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> {t('herbs.modernResearch')}</p>
                <p className="text-sm text-blue-800">{herb.modern_research}</p>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-stone-800 text-sm mb-2">{t('herbs.dosage')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {herb.dosage_powder_g && <div className="p-3 bg-stone-50 rounded-lg"><p className="text-xs text-stone-400 mb-1">{t('herbs.powder')}</p><p className="text-sm font-medium text-stone-700">{herb.dosage_powder_g} daily</p></div>}
                {herb.dosage_capsule  && <div className="p-3 bg-stone-50 rounded-lg"><p className="text-xs text-stone-400 mb-1">{t('herbs.capsule')}</p><p className="text-sm font-medium text-stone-700">{herb.dosage_capsule}</p></div>}
                {herb.dosage_decoction_ml && <div className="p-3 bg-stone-50 rounded-lg"><p className="text-xs text-stone-400 mb-1">{t('herbs.decoction')}</p><p className="text-sm font-medium text-stone-700">{herb.dosage_decoction_ml}</p></div>}
              </div>
            </div>
            {herb.best_taken_with?.length > 0 && (
              <div>
                <h4 className="font-semibold text-stone-800 text-sm mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('herbs.bestTakenWith')}</h4>
                <div className="flex flex-wrap gap-2">{herb.best_taken_with.map(item => <span key={item} className="text-xs px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full">{item}</span>)}</div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {herb.indications?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-stone-800 text-sm mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('herbs.indications')}</h4>
                  <ul className="space-y-1">{herb.indications.map(ind => <li key={ind} className="flex items-center gap-2 text-xs text-stone-600"><div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />{ind}</li>)}</ul>
                </div>
              )}
              {herb.contraindications?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-stone-800 text-sm mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" /> {t('herbs.contraindications')}</h4>
                  <ul className="space-y-1">{herb.contraindications.map(ci => <li key={ci} className="flex items-center gap-2 text-xs text-stone-600"><div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />{ci}</li>)}</ul>
                </div>
              )}
            </div>
            {herb.avoid_with?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1">⚠️ {t('herbs.avoidWith')}</p>
                <p className="text-sm text-red-800">{herb.avoid_with.join(', ')}</p>
              </div>
            )}
            {(herb.rasa?.length > 0 || herb.virya || herb.vipaka) && (
              <div>
                <h4 className="font-semibold text-stone-800 text-sm mb-2">{t('herbs.ayurvedicProperties')}</h4>
                <div className="grid grid-cols-3 gap-3">
                  {herb.rasa?.length > 0 && <div className="p-3 bg-amber-50 rounded-lg"><p className="text-xs text-stone-400 mb-1">{t('foods.rasaTaste')}</p><div className="flex flex-wrap gap-1">{herb.rasa.map(r => <span key={r} className="text-xs font-medium text-amber-700">{r}</span>)}</div></div>}
                  {herb.virya && <div className="p-3 bg-amber-50 rounded-lg"><p className="text-xs text-stone-400 mb-1">{t('foods.viryaPotency')}</p><div className="flex items-center gap-1">{getViryaIcon(herb.virya)}<span className="text-xs font-medium text-stone-700">{herb.virya}</span></div></div>}
                  {herb.vipaka && <div className="p-3 bg-amber-50 rounded-lg"><p className="text-xs text-stone-400 mb-1">Vipaka</p><p className="text-xs font-medium text-stone-700">{herb.vipaka}</p></div>}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function Herbs() {
  const { t } = useTranslation();
  const [herbs, setHerbs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [dosha, setDosha]       = useState('');
  const [selected, setSelected] = useState(null);

  const loadHerbs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category && category !== 'all') params.category = category;
      if (dosha && dosha !== 'all') params.dosha = dosha;
      const res = await herbsAPI.getAll(params);
      setHerbs(res.data);
    } catch { toast.error(t('herbs.loadError', 'Failed to load herbs')); }
    finally { setLoading(false); }
  }, [search, category, dosha]);

  useEffect(() => { const t2 = setTimeout(loadHerbs, 300); return () => clearTimeout(t2); }, [loadHerbs]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await herbsAPI.seed();
      if (res.data.seeded !== false) { toast.success(`Seeded ${res.data.count} Ayurvedic herbs!`); loadHerbs(); }
      else toast.info(res.data.message);
    } catch { toast.error(t('herbs.seedError', 'Failed to seed herbs')); }
    finally { setSeeding(false); }
  };

  const clearFilters = () => { setSearch(''); setCategory(''); setDosha(''); };
  const hasFilters = search || category || dosha;

  return (
    <div className="space-y-6" data-testid="herbs-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary-800">{t('herbs.title')}</h1>
          <p className="text-stone-600 mt-1">{t('herbs.subtitle')}</p>
        </div>
        {herbs.length === 0 && !loading && (
          <Button onClick={handleSeed} disabled={seeding} className="ayur-btn-primary">
            {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {t('herbs.seedDb')}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input placeholder={t('herbs.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('recipes.category')} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t('recipes.allCategories')}</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={dosha} onValueChange={setDosha}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t('prakriti.dosha')} /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t('recipes.allDoshas')}</SelectItem>{DOSHA_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="icon" onClick={clearFilters}><X className="w-4 h-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>
      ) : herbs.length > 0 ? (
        <>
          <p className="text-sm text-stone-500">{herbs.length} {t('herbs.found')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {herbs.map(herb => (
              <Card key={herb.id} className="cursor-pointer hover:shadow-md hover:border-primary-300 transition-all" onClick={() => setSelected(herb)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5"><span className="text-lg">🌿</span><h3 className="font-serif font-semibold text-stone-800">{herb.name}</h3></div>
                      {herb.name_hindi && <p className="text-xs text-stone-500">{herb.name_hindi}</p>}
                      {herb.name_sanskrit && <p className="text-xs text-stone-400 font-mono">{herb.name_sanskrit}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">{getViryaIcon(herb.virya)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge className={`text-xs ${CATEGORY_COLOR[herb.category] || 'bg-stone-100 text-stone-700'}`}>{herb.category}</Badge>
                    {herb.primary_dosha_effect && <Badge variant="outline" className="text-xs">{herb.primary_dosha_effect.split(' ')[0]}</Badge>}
                  </div>
                  {herb.description && <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-3">{herb.description}</p>}
                  {herb.indications?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {herb.indications.slice(0, 3).map(ind => <span key={ind} className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">{ind}</span>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Leaf className="empty-state-icon" />
          <h3 className="text-lg font-medium text-stone-800">{t('herbs.noHerbs')}</h3>
          <p className="text-stone-500 mt-1">{hasFilters ? t('common.adjustFilters') : t('herbs.seedToStart')}</p>
          {!hasFilters && (
            <Button onClick={handleSeed} disabled={seeding} className="mt-4 ayur-btn-primary">
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {t('herbs.seedDb')}
            </Button>
          )}
        </div>
      )}
      <HerbDetailModal herb={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}