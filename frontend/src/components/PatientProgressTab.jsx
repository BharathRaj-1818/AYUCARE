// PatientProgressTab.jsx — Enhanced version
// Enhancements: streak counter, bigger trend charts, richer dosha alerts, weight delta

import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Scale, Moon, Droplets, Zap, Loader2,
  Wind, Flame, Waves, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Flame as StreakIcon,
  CheckCircle2, AlertTriangle, Info, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const DOSHA_COLOR = {
  Vata:  { card: 'border-purple-200 bg-purple-50', title: 'text-purple-700', badge_high: 'bg-red-100 text-red-600', badge_mod: 'bg-purple-100 text-purple-600', bar: 'bg-purple-400' },
  Pitta: { card: 'border-orange-200 bg-orange-50', title: 'text-orange-700', badge_high: 'bg-red-100 text-red-600', badge_mod: 'bg-orange-100 text-orange-600', bar: 'bg-orange-400' },
  Kapha: { card: 'border-teal-200 bg-teal-50',     title: 'text-teal-700',   badge_high: 'bg-red-100 text-red-600', badge_mod: 'bg-teal-100 text-teal-600',   bar: 'bg-teal-400'   },
};
const DOSHA_ICON  = { Vata: Wind, Pitta: Flame, Kapha: Waves };
const DOSHA_DESC  = {
  Vata:  'Irregularity, dryness, anxiety patterns detected in recent logs.',
  Pitta: 'Heat, inflammation, irritability patterns detected in recent logs.',
  Kapha: 'Heaviness, lethargy, congestion patterns detected in recent logs.',
};

// ── Compute streak from sorted log dates ──────────────────────────────────────
function computeStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev - curr) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── Custom tooltip for charts ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-stone-400 mb-0.5">{label}</p>
      <p className="font-bold text-stone-800">{payload[0].value}{unit}</p>
    </div>
  );
}

// ── Full-size trend chart ─────────────────────────────────────────────────────
function TrendChart({ data, color, unit, label }) {
  // Guard: must be a non-empty array with at least 2 valid numeric entries
  const safeData = Array.isArray(data)
    ? data.filter(d => d && typeof d.value === 'number' && !isNaN(d.value))
    : [];
  if (safeData.length < 2) return (
    <div className="h-28 flex flex-col items-center justify-center text-xs text-stone-400 bg-stone-50 rounded-lg">
      <TrendingUp className="w-5 h-5 mb-1 text-stone-300" />
      Need at least 2 entries to show trend
    </div>
  );

  const values = safeData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = values[0];
  const last  = values[values.length - 1];
  const delta = (last - first).toFixed(1);
  const improved = (label === 'Weight') ? delta <= 0 : delta >= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-600">{label}</p>
        <div className={`flex items-center gap-1 text-xs font-medium ${improved ? 'text-green-600' : 'text-red-500'}`}>
          {improved
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />}
          {delta > 0 ? '+' : ''}{delta}{unit}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={128}>
        <LineChart data={safeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9 }} domain={[Math.floor(min * 0.97), Math.ceil(max * 1.03)]} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Line type="monotone" dataKey="value" stroke={color}
            strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Expandable log row ────────────────────────────────────────────────────────
function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-stone-600 w-20">{log.date}</span>
          <div className="flex gap-2 text-xs text-stone-400">
            {log.weight_kg    && <span>{log.weight_kg}kg</span>}
            {log.sleep_hours  && <span>{log.sleep_hours}h sleep</span>}
            {log.energy_level && <span>⚡{log.energy_level}/5</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {log.symptoms?.length > 0 && (
            <Badge className="text-xs bg-red-50 text-red-500 border-red-200 border">
              {log.symptoms.length} symptom{log.symptoms.length > 1 ? 's' : ''}
            </Badge>
          )}
          {open ? <ChevronUp className="w-3 h-3 text-stone-400" /> : <ChevronDown className="w-3 h-3 text-stone-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 py-2.5 border-t border-stone-100 bg-stone-50 text-xs text-stone-500 space-y-1.5">
          <div className="grid grid-cols-3 gap-1">
            {log.digestion_quality    && <span>Digestion: {log.digestion_quality}/5</span>}
            {log.mood                 && <span>Mood: {log.mood}/5</span>}
            {log.water_intake_liters  && <span>Water: {log.water_intake_liters}L</span>}
            {log.bowel_movements      && <span>Bowels: {log.bowel_movements}</span>}
          </div>
          {log.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {log.symptoms.map((s, i) => (
                <span key={i} className={`px-1.5 py-0.5 rounded-full border text-xs
                  ${s.severity === 3 ? 'bg-red-50 border-red-200 text-red-600' :
                    s.severity === 2 ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                       'bg-stone-100 border-stone-200 text-stone-500'}`}>
                  {s.symptom}
                </span>
              ))}
            </div>
          )}
          {log.notes && <p className="italic text-stone-400">"{log.notes}"</p>}
        </div>
      )}
    </div>
  );
}

// ── Dosha imbalance alert card ────────────────────────────────────────────────
function DoshaAlert({ ib }) {
  const [open, setOpen] = useState(false);
  const Icon   = DOSHA_ICON[ib.dosha] || Wind;
  const colors = DOSHA_COLOR[ib.dosha] || DOSHA_COLOR.Vata;
  const severityBadge = ib.severity === 'high' ? colors.badge_high : colors.badge_mod;

  // Score bar width capped at 100%
  const barWidth = Math.min((ib.score / 30) * 100, 100);

  return (
    <div className={`rounded-lg border p-3 ${colors.card}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${colors.title}`} />
        <span className={`text-sm font-bold ${colors.title}`}>{ib.dosha} Imbalance</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${severityBadge}`}>
          {ib.severity}
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full bg-white/60 rounded-full h-1.5 mb-2">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${barWidth}%` }} />
      </div>

      <p className="text-xs text-stone-500 mb-2">{DOSHA_DESC[ib.dosha]}</p>

      {/* Top 2 recommendations always visible */}
      <ul className="space-y-1 text-xs">
        {ib.recommendations.slice(0, 2).map((r, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <CheckCircle2 className={`w-3 h-3 mt-0.5 flex-shrink-0 ${colors.title}`} />
            <span className="text-stone-600">{r}</span>
          </li>
        ))}
      </ul>

      {/* Expand for remaining recs */}
      {ib.recommendations.length > 2 && (
        <>
          {open && (
            <ul className="space-y-1 text-xs mt-1">
              {ib.recommendations.slice(2).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className={`w-3 h-3 mt-0.5 flex-shrink-0 ${colors.title}`} />
                  <span className="text-stone-600">{r}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setOpen(v => !v)}
            className={`mt-2 text-xs font-medium flex items-center gap-1 ${colors.title}`}>
            {open ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> {ib.recommendations.length - 2} more tips</>}
          </button>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientProgressTab({ patientId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    api.get(`/progress/${patientId}?days=${days}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false));
  }, [patientId, days]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
    </div>
  );

  const { logs = [], trends: rawTrends = {}, imbalance_analysis: imbalance, streak: serverStreak, last_logged: lastLogged } = data || {};

  // Always guarantee arrays regardless of what the API returns
  const trends = {
    weight:    Array.isArray(rawTrends?.weight)    ? rawTrends.weight    : [],
    energy:    Array.isArray(rawTrends?.energy)    ? rawTrends.energy    : [],
    sleep:     Array.isArray(rawTrends?.sleep)     ? rawTrends.sleep     : [],
    digestion: Array.isArray(rawTrends?.digestion) ? rawTrends.digestion : [],
    water:     Array.isArray(rawTrends?.water)     ? rawTrends.water : [],
  };
  const latest  = logs[logs.length - 1];
  const streak  = typeof serverStreak === 'number' ? serverStreak : computeStreak(logs);
  const overall = imbalance?.overall_status || 'stable';
  const lastLogDate = lastLogged || latest?.date;

  // Weight delta vs first log
  const weightLogs = trends?.weight || [];
  const weightDelta = weightLogs.length >= 2
    ? (weightLogs[weightLogs.length - 1].value - weightLogs[0].value).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-stone-700">{logs.length} entries</p>

          {lastLogDate && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-3 h-3" />
              Last logged {Math.floor((new Date() - new Date(lastLogDate)) / 86400000) || 0} days ago
            </span>
          )}

          {/* Streak badge */}
          {streak > 0 && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full
              ${streak >= 7 ? 'bg-orange-100 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>
              <StreakIcon className="w-3 h-3" />
              {streak} day streak
            </span>
          )}
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-xs border border-stone-200 rounded px-2 py-1 bg-white">
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {/* ── Overall status banner ── */}
      {logs.length > 0 && (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-3 rounded-lg text-xs font-medium
          ${overall === 'stable'           ? 'bg-green-50  text-green-700  border border-green-200' :
            overall === 'mild_imbalance'   ? 'bg-amber-50  text-amber-700  border border-amber-200' :
                                             'bg-red-50    text-red-700    border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {overall === 'stable'
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> No significant dosha drift detected</>
              : overall === 'mild_imbalance'
              ? <><Info className="w-3.5 h-3.5" /> Mild dosha drift detected — follow the top recommendations</>
              : <><AlertTriangle className="w-3.5 h-3.5" /> Strong dosha drift detected — address the top imbalance urgently</>}
          </div>
          {imbalance?.imbalances?.length > 0 && (
            <div className="text-slate-600 text-xs sm:ml-auto">
              Top drift: {imbalance.imbalances[0].dosha} — {imbalance.imbalances[0].severity}
            </div>
          )}
        </div>
      )}

      {/* ── Dosha imbalance alerts ── */}
      {imbalance?.imbalances?.length > 0 && (
        <div className="space-y-2">
          {imbalance.imbalances.map(ib => <DoshaAlert key={ib.dosha} ib={ib} />)}
        </div>
      )}

      {/* ── Latest vitals ── */}
      {latest && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Scale,    label: 'Weight',  val: latest.weight_kg           ? `${latest.weight_kg}kg`          : '—', color: 'text-purple-600', sub: weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta}kg vs first` : null },
            { icon: Moon,     label: 'Sleep',   val: latest.sleep_hours         ? `${latest.sleep_hours}h`          : '—', color: 'text-blue-600'   },
            { icon: Droplets, label: 'Water',   val: latest.water_intake_liters ? `${latest.water_intake_liters}L` : '—', color: 'text-cyan-600'   },
            { icon: Zap,      label: 'Energy',  val: latest.energy_level        ? `${latest.energy_level}/5`        : '—', color: 'text-amber-600'  },
          ].map(({ icon: Icon, label, val, color, sub }) => (
            <div key={label} className="p-2.5 bg-stone-50 rounded-lg">
              <Icon className={`w-3.5 h-3.5 ${color} mb-1`} />
              <p className="text-base font-bold text-stone-800">{val}</p>
              <p className="text-xs text-stone-400">{label}</p>
              {sub && (
                <p className={`text-xs mt-0.5 font-medium ${parseFloat(weightDelta) <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {sub}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Trend charts ── */}
      {logs.length >= 2 && (
        <div className="space-y-4 pt-1">
          {[
            { key: 'weight', label: 'Weight',        color: '#8b5cf6', unit: 'kg'  },
            { key: 'energy', label: 'Energy Level',  color: '#f59e0b', unit: '/5'  },
            { key: 'sleep',  label: 'Sleep Hours',   color: '#3b82f6', unit: 'hrs' },
          ].map(({ key, label, color, unit }) =>
            trends[key]?.length >= 2 && (
              <div key={key} className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                <TrendChart data={trends[key]} color={color} unit={unit} label={label} />
              </div>
            )
          )}
        </div>
      )}

      {/* ── Log history ── */}
      {logs.length === 0 ? (
        <div className="text-center py-8">
          <TrendingUp className="w-8 h-8 mx-auto text-stone-300 mb-2" />
          <p className="text-xs text-stone-400">No progress logs yet</p>
          <p className="text-xs text-stone-300 mt-0.5">Patient can log via their portal</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Log History</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {[...logs].reverse().map(log => (
              <LogRow key={log.id || log.date} log={log} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}