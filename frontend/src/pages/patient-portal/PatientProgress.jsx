import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  Scale, Moon, Droplets, Zap, Plus,
  TrendingUp, TrendingDown, Minus, Loader2,
  CheckCircle2, ChevronDown, ChevronUp,
  Flame, Wind, Waves
} from 'lucide-react';
import { toast } from 'sonner';

const today = () => new Date().toISOString().split('T')[0];
const DOSHA_ICON  = { Vata: Wind, Pitta: Flame, Kapha: Waves };
const DOSHA_COLOR = {
  Vata:  'text-purple-600 bg-purple-50 border-purple-200',
  Pitta: 'text-orange-600 bg-orange-50 border-orange-200',
  Kapha: 'text-teal-600   bg-teal-50   border-teal-200',
};

const COMMON_SYMPTOMS = [
  'anxiety','constipation','dry skin','joint pain','insomnia',
  'bloating','fatigue','inflammation','acid reflux','irritability',
  'skin rash','fever','weight gain','lethargy','congestion',
  'headache','low appetite','water retention','depression',
];

function StarRating({ value, onChange, max = 5, color = 'text-yellow-400' }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-full border transition-all text-sm font-semibold
            ${n <= value ? `${color} bg-current bg-opacity-10 border-current` : 'border-stone-200 text-stone-300 hover:border-stone-400'}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function TrendChart({ data, label, color, unit = '', min, max }) {
  const { t } = useTranslation();
  if (!data || data.length < 2) return (
    <div className="h-28 flex items-center justify-center text-stone-400 text-sm">
      {t('patientProgress.notEnoughData')}
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fontSize: 9 }} domain={[min || 'auto', max || 'auto']} />
        <Tooltip labelFormatter={d => d} formatter={v => [`${v}${unit}`, label]} contentStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        {min !== undefined && <ReferenceLine y={min} stroke="#e5e7eb" strokeDasharray="3 3" />}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function PatientProgress() {
  const { t } = useTranslation();
  const [logs, setLogs]           = useState([]);
  const [trends, setTrends]       = useState({});
  const [imbalance, setImbalance] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [days, setDays]           = useState(30);

  const [form, setForm] = useState({
    date: today(), weight_kg: '', energy_level: 3, digestion_quality: 3,
    mood: 3, sleep_hours: '', water_intake_liters: '', bowel_movements: '', notes: '', symptoms: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/patient-portal/progress?days=${days}`);
      setLogs(res.data.logs || []);
      setTrends(res.data.trends || {});
      setImbalance(res.data.imbalance_analysis || null);
    } catch { toast.error(t('patientProgress.loadError')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  const addSymptom = (s) => {
    if (form.symptoms.find(x => x.symptom === s)) {
      setForm(f => ({ ...f, symptoms: f.symptoms.filter(x => x.symptom !== s) }));
    } else {
      setForm(f => ({ ...f, symptoms: [...f.symptoms, { symptom: s, severity: 1 }] }));
    }
  };
  const removeSymptom = (idx) => setForm(f => ({ ...f, symptoms: f.symptoms.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        weight_kg:           form.weight_kg           ? parseFloat(form.weight_kg)           : null,
        energy_level:        form.energy_level        || null,
        digestion_quality:   form.digestion_quality   || null,
        mood:                form.mood                || null,
        sleep_hours:         form.sleep_hours         ? parseFloat(form.sleep_hours)         : null,
        water_intake_liters: form.water_intake_liters ? parseFloat(form.water_intake_liters) : null,
        bowel_movements:     form.bowel_movements     || null,
        notes:               form.notes               || null,
        symptoms:            form.symptoms,
      };
      await api.post('/patient-portal/progress/log', payload);
      toast.success(t('patientProgress.logSuccess'));
      setShowForm(false);
      setForm({ date: today(), weight_kg: '', energy_level: 3, digestion_quality: 3, mood: 3, sleep_hours: '', water_intake_liters: '', bowel_movements: '', notes: '', symptoms: [] });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || t('patientProgress.logError')); }
    finally { setSaving(false); }
  };

  const latestLog = logs[logs.length - 1];
  const prevLog   = logs[logs.length - 2];
  const delta = (key) => { if (!latestLog?.[key] || !prevLog?.[key]) return null; return latestLog[key] - prevLog[key]; };
  const TrendIcon = ({ val }) => {
    if (val === null) return <Minus className="w-3 h-3 text-stone-400" />;
    if (val > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    return <TrendingDown className="w-3 h-3 text-red-400" />;
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">{t('patient_nav.progress')}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{t('patientProgress.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-stone-200 rounded-md px-3 py-1.5 bg-white text-stone-700">
            <option value={7}>{t('patientProgress.last7')}</option>
            <option value={14}>{t('patientProgress.last14')}</option>
            <option value={30}>{t('patientProgress.last30')}</option>
            <option value={90}>{t('patientProgress.last90')}</option>
          </select>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setShowForm(v => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            {showForm ? t('common.cancel') : t('patientProgress.logToday')}
          </Button>
        </div>
      </div>

      {/* Log Form */}
      {showForm && (
        <Card className="border-purple-200 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif text-purple-800">
              {t('patientProgress.dailyLog')} — {form.date}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-stone-500 mb-1 block">{t('progress.date')}</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} max={today()} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-stone-500 mb-1 block">{t('progress.weight')}</Label>
                <Input type="number" step="0.1" placeholder="65.5" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-stone-500 mb-1 block">{t('patientProgress.sleepHours')}</Label>
                <Input type="number" step="0.5" placeholder="7.5" value={form.sleep_hours} onChange={e => setForm(f => ({ ...f, sleep_hours: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs text-stone-500 mb-1 block">{t('patientProgress.waterIntakeL')}</Label>
                <Input type="number" step="0.1" placeholder="2.5" value={form.water_intake_liters} onChange={e => setForm(f => ({ ...f, water_intake_liters: e.target.value }))} className="text-sm" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs text-stone-500 mb-1 block">{t('patients.bowelMovements')}</Label>
                <select value={form.bowel_movements} onChange={e => setForm(f => ({ ...f, bowel_movements: e.target.value }))}
                  className="w-full text-sm border border-stone-200 rounded-md px-3 py-2 bg-white">
                  <option value="">{t('common.select')}…</option>
                  <option>Regular (1-2 times)</option>
                  <option>Irregular</option>
                  <option>Constipated</option>
                  <option>Loose</option>
                  <option>Very frequent</option>
                </select>
              </div>
            </div>

            {/* Rating scales */}
            <div className="space-y-3">
              {[
                { key: 'energy_level',      label: t('patientProgress.energyLevel'),      color: 'text-yellow-500' },
                { key: 'digestion_quality', label: t('patientProgress.digestionQuality'), color: 'text-green-500'  },
                { key: 'mood',              label: t('patientProgress.mood'),              color: 'text-blue-500'   },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label className="text-sm text-stone-600 w-36 shrink-0">{label}</Label>
                  <StarRating value={form[key]} onChange={v => setForm(f => ({ ...f, [key]: v }))} color={color} />
                  <span className="text-xs text-stone-400 w-12 text-right">{form[key]}/5</span>
                </div>
              ))}
            </div>

            {/* Symptoms */}
            <div>
              <Label className="text-xs text-stone-500 mb-2 block">{t('patientProgress.symptoms')}</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_SYMPTOMS.map(s => (
                  <button key={s} type="button" onClick={() => addSymptom(s)}
                    className={`text-xs px-2 py-1 rounded-full border transition-all
                      ${form.symptoms.find(x => x.symptom === s)
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
              {form.symptoms.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {form.symptoms.map((sym, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-red-600 font-medium w-36 capitalize">{sym.symptom}</span>
                      <select value={sym.severity}
                        onChange={e => { const u = [...form.symptoms]; u[i] = { ...sym, severity: Number(e.target.value) }; setForm(f => ({ ...f, symptoms: u })); }}
                        className="text-xs border border-stone-200 rounded px-2 py-1 bg-white">
                        <option value={1}>{t('patientProgress.mild')}</option>
                        <option value={2}>{t('patientProgress.moderate')}</option>
                        <option value={3}>{t('patientProgress.severe')}</option>
                      </select>
                      <button onClick={() => removeSymptom(i)} className="text-stone-400 hover:text-red-500 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-stone-500 mb-1 block">{t('progress.notes')}</Label>
              <Textarea placeholder={t('patientProgress.notesPlaceholder')} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm resize-none" />
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" />{t('patientProgress.saveLog')}</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dosha Imbalance Alerts */}
      {imbalance && imbalance.imbalances?.length > 0 && (
        <div className="space-y-3">
          {imbalance.imbalances.map(ib => {
            const Icon = DOSHA_ICON[ib.dosha] || Wind;
            return (
              <Card key={ib.dosha} className={`border ${DOSHA_COLOR[ib.dosha]}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{ib.dosha} {t('patientProgress.imbalanceDetected')}</span>
                        <Badge className={`text-xs ${ib.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ib.severity}</Badge>
                      </div>
                      <p className="text-xs opacity-75 mb-2">{t('patientProgress.basedOnLogs')} {imbalance.logs_analysed} {t('patientProgress.logEntries')}</p>
                      <ul className="space-y-0.5">
                        {ib.recommendations.slice(0, 3).map((r, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5"><span className="mt-0.5">•</span>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      {latestLog && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Scale,    label: t('patientProgress.weight'), val: latestLog.weight_kg           ? `${latestLog.weight_kg}kg`          : '—', dKey: 'weight_kg',           unit: 'kg' },
            { icon: Moon,     label: t('patientProgress.sleep'),  val: latestLog.sleep_hours         ? `${latestLog.sleep_hours}h`          : '—', dKey: 'sleep_hours',         unit: 'h'  },
            { icon: Droplets, label: t('patientProgress.water'),  val: latestLog.water_intake_liters ? `${latestLog.water_intake_liters}L` : '—', dKey: 'water_intake_liters', unit: 'L'  },
            { icon: Zap,      label: t('patientProgress.energy'), val: latestLog.energy_level        ? `${latestLog.energy_level}/5`        : '—', dKey: 'energy_level',        unit: ''   },
          ].map(({ icon: Icon, label, val, dKey, unit }) => {
            const d = delta(dKey);
            return (
              <Card key={label}>
                <CardContent className="p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto text-stone-400 mb-1" />
                  <p className="text-lg font-bold text-stone-800">{val}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs text-stone-500">{label}</p>
                    {d !== null && (
                      <span className={`text-xs flex items-center gap-0.5 ${d > 0 ? 'text-green-500' : 'text-red-400'}`}>
                        <TrendIcon val={d} />{Math.abs(d).toFixed(1)}{unit}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Trend Charts */}
      {logs.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'weight',    label: t('patientProgress.weight'),           color: '#8b5cf6', unit: 'kg' },
            { key: 'energy',    label: t('patientProgress.energyLevel'),      color: '#f59e0b', unit: '/5', min: 1, max: 5 },
            { key: 'sleep',     label: t('patientProgress.sleepHours'),       color: '#3b82f6', unit: 'h'  },
            { key: 'digestion', label: t('patientProgress.digestionQuality'), color: '#10b981', unit: '/5', min: 1, max: 5 },
          ].map(({ key, label, color, unit, min, max }) => (
            trends[key]?.length >= 2 && (
              <Card key={key}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium text-stone-700">{label}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3 pt-0">
                  <TrendChart data={trends[key]} label={label} color={color} unit={unit} min={min} max={max} />
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}

      {/* Log History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif text-stone-800">
            {t('patientProgress.logHistory')} ({logs.length} {t('patientProgress.entries')})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">{t('patientProgress.noLogs')}</p>
              <p className="text-xs text-stone-400 mt-1">{t('patientProgress.clickToAdd')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...logs].reverse().map(log => <LogRow key={log.id || log.date} log={log} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LogRow({ log }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors text-left">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-stone-700 w-24">{log.date}</span>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            {log.weight_kg           && <span className="flex items-center gap-1"><Scale    className="w-3 h-3" />{log.weight_kg}kg</span>}
            {log.sleep_hours         && <span className="flex items-center gap-1"><Moon      className="w-3 h-3" />{log.sleep_hours}h</span>}
            {log.water_intake_liters && <span className="flex items-center gap-1"><Droplets  className="w-3 h-3" />{log.water_intake_liters}L</span>}
            {log.energy_level        && <span className="flex items-center gap-1"><Zap       className="w-3 h-3" />{log.energy_level}/5</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {log.symptoms?.length > 0 && (
            <Badge className="text-xs bg-red-50 text-red-600 border border-red-200">
              {log.symptoms.length} {t('patientProgress.symptom')}{log.symptoms.length > 1 ? 's' : ''}
            </Badge>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 text-sm text-stone-600 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {log.digestion_quality && <span>{t('patientProgress.digestionQuality')}: {log.digestion_quality}/5</span>}
            {log.mood              && <span>{t('patientProgress.mood')}: {log.mood}/5</span>}
            {log.bowel_movements   && <span>{t('patients.bowelMovements')}: {log.bowel_movements}</span>}
          </div>
          {log.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {log.symptoms.map((s, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full border
                  ${s.severity === 3 ? 'bg-red-50 border-red-200 text-red-600' :
                    s.severity === 2 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                       'bg-stone-100 border-stone-200 text-stone-500'}`}>
                  {s.symptom} ({s.severity === 3 ? t('patientProgress.severe') : s.severity === 2 ? t('patientProgress.moderate') : t('patientProgress.mild')})
                </span>
              ))}
            </div>
          )}
          {log.notes && <p className="text-stone-500 italic">"{log.notes}"</p>}
        </div>
      )}
    </div>
  );
}