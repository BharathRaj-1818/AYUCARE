import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { prakritiAPI, patientsAPI } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const DOSHA_COLORS = {
  Vata:  { bg: "bg-purple-50", text: "text-purple-800", bar: "bg-purple-400", border: "border-purple-200" },
  Pitta: { bg: "bg-orange-50", text: "text-orange-800", bar: "bg-orange-400", border: "border-orange-200" },
  Kapha: { bg: "bg-teal-50",   text: "text-teal-800",   bar: "bg-teal-400",   border: "border-teal-200"   },
};

const CATEGORY_ICONS = {
  "Body Frame": "🧍", "Skin": "✋", "Hair": "💇", "Digestion": "🫁",
  "Sleep": "😴", "Energy": "⚡", "Temperature": "🌡️",
  "Mind": "🧠", "Emotions": "💭", "Habits": "📅",
};

export default function PrakritiQuiz() {
  const { t } = useTranslation();
  const { id: patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient]       = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [current, setCurrent]       = useState(0);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, qRes] = await Promise.all([patientsAPI.getOne(patientId), prakritiAPI.getQuestions()]);
        setPatient(pRes.data);
        setQuestions(qRes.data.questions);
      } catch (err) {
        toast.error(t('prakriti.loadError', 'Failed to load quiz'));
        navigate(`/patients/${patientId}`);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [patientId]);

  const selectOption = (questionId, optionIndex) =>
    setAnswers(prev => ({ ...prev, [String(questionId)]: optionIndex }));

  const goNext = () => { if (current < questions.length - 1) setCurrent(c => c + 1); };
  const goPrev = () => { if (current > 0) setCurrent(c => c - 1); };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => answers[String(q.id)] === undefined);
    if (unanswered.length > 0) {
      toast.error(`${unanswered.length} ${t('prakriti.unanswered', 'question(s) unanswered')}`);
      setCurrent(questions.findIndex(q => answers[String(q.id)] === undefined));
      return;
    }
    setSubmitting(true);
    try {
      const formattedAnswers = questions.map(q => ({
        question_id: q.id, selected_option_index: answers[String(q.id)],
      }));
      const res = await prakritiAPI.submitAssessment(patientId, formattedAnswers);
      setResult(res.data);
      toast.success(`${t('prakriti.assessed', 'Prakriti assessed')}: ${res.data.scores.dominant}`);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 401) { toast.error(t('auth.sessionExpired', 'Session expired')); navigate("/login"); }
      else if (status === 404) toast.error(t('patients.notFound', 'Patient not found'));
      else if (status === 422) toast.error(`${t('common.validationError', 'Validation error')}: ${detail || 'Invalid data format'}`);
      else if (!err.response) toast.error(t('common.serverUnreachable', 'Cannot reach server'));
      else toast.error(`${t('common.submitFailed', 'Submission failed')} (${status}): ${detail || err.message}`);
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary-700" /></div>;

  // Result screen
  if (result) {
    const { scores } = result;
    const primaryDosha = scores.dominant.split("-")[0];
    const colors = DOSHA_COLORS[primaryDosha] || DOSHA_COLORS["Vata"];
    const doshas = [
      { name: t('prakriti.vata'), value: scores.vata,  ...DOSHA_COLORS["Vata"]  },
      { name: t('prakriti.pitta'),value: scores.pitta, ...DOSHA_COLORS["Pitta"] },
      { name: t('prakriti.kapha'),value: scores.kapha, ...DOSHA_COLORS["Kapha"] },
    ];

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className={`border-2 ${colors.border}`}>
          <CardHeader className={`${colors.bg} rounded-t-lg text-center`}>
            <div className="text-5xl mb-3">🌿</div>
            <CardTitle className={`text-xl font-serif ${colors.text}`}>
              {patient?.name}'s {t('prakriti.title')}
            </CardTitle>
            <p className={`text-3xl font-bold mt-1 ${colors.text}`}>{scores.dominant}</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              {doshas.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-medium ${d.text}`}>{d.name}</span>
                    <span className="text-stone-500">{d.value}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-3">
                    <div className={`${d.bar} h-3 rounded-full transition-all duration-700`} style={{ width: `${d.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">✨ {t('prakriti.whatThisMeans', 'What this means')}: </span>
                {scores.description}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/patients/${patientId}`)}>
                ← {t('prakriti.backToProfile')}
              </Button>
              <Button className="flex-1 ayur-btn-primary" onClick={() => navigate(`/diet-charts/new?patient=${patientId}`)}>
                {t('prakriti.generateDiet')} →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz screen
  const q = questions[current];
  if (!q) return null;

  const totalAnswered = Object.keys(answers).length;
  const progress      = (totalAnswered / questions.length) * 100;
  const isAnswered    = answers[String(q.id)] !== undefined;
  const isLast        = current === questions.length - 1;
  const windowStart   = Math.max(0, current - 3);
  const windowEnd     = Math.min(questions.length, current + 4);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-serif font-bold text-primary-800">{t('prakriti.title')}</h1>
            <p className="text-sm text-stone-500">{patient?.name}</p>
          </div>
          <Badge variant="outline">{totalAnswered} / {questions.length}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span>{CATEGORY_ICONS[q.category] || "❓"}</span>
            <Badge variant="secondary" className="text-xs">{q.category}</Badge>
            <span className="text-xs text-stone-400 ml-auto">{current + 1} / {questions.length}</span>
          </div>
          <CardTitle className="text-base font-medium leading-relaxed text-stone-800">{q.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {q.options.map((option, idx) => {
              const selected = answers[String(q.id)] === idx;
              return (
                <button key={idx} onClick={() => selectOption(q.id, idx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-150 ${selected ? "border-primary-500 bg-primary-50 text-primary-800" : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-700"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${selected ? "border-primary-500 bg-primary-500" : "border-stone-300"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm leading-relaxed">{option.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={current === 0}>← {t('common.back')}</Button>

        <div className="flex gap-1 items-center">
          {questions.slice(windowStart, windowEnd).map((sq, i) => {
            const absIdx = windowStart + i;
            return (
              <button key={sq.id} onClick={() => setCurrent(absIdx)}
                className={`rounded-full transition-all ${absIdx === current ? "bg-primary-600 w-4 h-2.5" : answers[String(sq.id)] !== undefined ? "bg-primary-300 w-2.5 h-2.5" : "bg-stone-200 w-2.5 h-2.5"}`} />
            );
          })}
        </div>

        {isLast ? (
          <Button onClick={handleSubmit} disabled={submitting} className="ayur-btn-primary">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('prakriti.scoring', 'Scoring...')}</> : `${t('common.submit')} ✓`}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!isAnswered} className="ayur-btn-primary disabled:opacity-40">
            {t('prakriti.next', 'Next')} →
          </Button>
        )}
      </div>
    </div>
  );
}