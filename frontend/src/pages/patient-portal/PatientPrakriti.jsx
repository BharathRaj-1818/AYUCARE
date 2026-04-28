import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Leaf } from 'lucide-react';
import { toast } from 'sonner';

const DOSHA_COLORS = {
  Vata:  { bg: 'bg-purple-50', text: 'text-purple-800', bar: 'bg-purple-400', border: 'border-purple-200' },
  Pitta: { bg: 'bg-orange-50', text: 'text-orange-800', bar: 'bg-orange-400', border: 'border-orange-200' },
  Kapha: { bg: 'bg-teal-50',   text: 'text-teal-800',   bar: 'bg-teal-400',   border: 'border-teal-200'   },
};

const DOSHA_TIPS = {
  Vata:  ['Prefer warm, oily, and heavy foods','Eat at regular times every day','Avoid cold, dry, and raw foods','Stay warm and avoid excessive wind','Prioritise rest and consistent sleep schedule'],
  Pitta: ['Favour cool, sweet, and bitter foods','Avoid spicy, sour, and fermented foods','Do not skip meals — pitta types get irritable when hungry','Exercise in the cool hours of morning','Include coconut water, coriander, and fennel in diet'],
  Kapha: ['Favour light, dry, and warm foods','Avoid heavy dairy, fried foods, and excess sweets','Eat smaller portions and avoid overeating','Exercise vigorously every day','Include ginger, black pepper, and honey regularly'],
};

export default function PatientPrakriti() {
  const { t } = useTranslation();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/patient-portal/prakriti')
      .then(r => setData(r.data))
      .catch(() => toast.error(t('prakriti.loadError', 'Failed to load Prakriti data')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600 mt-20" />
    </div>
  );

  const { prakriti, prakriti_score, last_assessed_at } = data || {};
  const primaryDosha = prakriti?.split('-')[0];
  const colors = DOSHA_COLORS[primaryDosha] || DOSHA_COLORS['Vata'];
  const tips   = DOSHA_TIPS[primaryDosha]   || DOSHA_TIPS['Vata'];

  const doshas = [
    { name: t('prakriti.vata'),  value: prakriti_score?.vata,  ...DOSHA_COLORS['Vata']  },
    { name: t('prakriti.pitta'), value: prakriti_score?.pitta, ...DOSHA_COLORS['Pitta'] },
    { name: t('prakriti.kapha'), value: prakriti_score?.kapha, ...DOSHA_COLORS['Kapha'] },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-stone-800">{t('patient_nav.prakriti')}</h1>
        <p className="text-stone-500 mt-1">{t('patientPrakriti.subtitle')}</p>
      </div>

      {prakriti && prakriti_score ? (
        <>
          <Card className={`border-2 ${colors.border}`}>
            <CardHeader className={`${colors.bg} rounded-t-lg text-center py-8`}>
              <div className="text-5xl mb-3">🌿</div>
              <div className={`text-2xl font-serif font-bold ${colors.text}`}>{t('prakriti.result')}</div>
              <p className={`text-4xl font-bold mt-2 ${colors.text}`}>{prakriti}</p>
              {prakriti_score.description && (
                <p className="text-sm text-stone-600 mt-3 max-w-md mx-auto leading-relaxed">
                  {prakriti_score.description}
                </p>
              )}
              {last_assessed_at && (
                <p className="text-xs text-stone-400 mt-2">
                  {t('patientPrakriti.assessedOn')} {new Date(last_assessed_at).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                {doshas.map(d => d.value != null && (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium ${d.text}`}>{d.name}</span>
                      <span className="text-stone-500">{d.value}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3">
                      <div className={`${d.bar} h-3 rounded-full transition-all duration-700`}
                        style={{ width: `${d.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-600" />
                {t('patientPrakriti.dietTipsFor')} {primaryDosha}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-stone-700">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h3 className="text-lg font-semibold text-stone-700 mb-2">{t('prakriti.notAssessed')}</h3>
            <p className="text-stone-500 text-sm max-w-sm mx-auto">{t('patientPrakriti.notAssessedDesc')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}