import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { i18n } from './utils/i18n';
import { normalizeCode, buildFHIRAndApplyRules } from './utils/middleware';
import { callGemini } from './services/geminiService';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ClinicianTab } from './components/ClinicianTab';
import { CoderTab } from './components/CoderTab';
import { ValidatorTab } from './components/ValidatorTab';

export default function App() {
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('doctor');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [medicalNote, setMedicalNote] = useState("");
  const [clinicalInsights, setClinicalInsights] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('idle');
  const [submissionData, setSubmissionData] = useState(null);
  const [denialRisk, setDenialRisk] = useState(null);
  const [appealText, setAppealText] = useState("");
  const [error, setError] = useState(null);

  const t = i18n[lang];
  const isRTL = lang === 'ar';

  const handleGetInsights = async () => {
    if (!transcript) return;
    setIsThinking(true);
    try {
      const insight = await callGemini(
        `Provide 1 diagnosis and 1 test for: ${transcript}. Language: ${lang === 'ar' ? 'Arabic' : 'English'}`
      );
      setClinicalInsights(insight);
    } catch (e) {
      console.error(e);
      setError('Failed to get clinical insights');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSummarize = async () => {
    if (!transcript) return;
    setIsSummarizing(true);
    try {
      const summary = await callGemini(
        `Summarize as SOAP note in ${lang === 'ar' ? 'Arabic' : 'English'}: ${transcript}`
      );
      setMedicalNote(summary);
    } catch (e) {
      console.error(e);
      setError('Failed to generate medical note');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDraftAppeal = async () => {
    if (!denialRisk) return;
    setIsThinking(true);
    try {
      const draft = await callGemini(
        `Draft justification in ${lang === 'ar' ? 'Arabic' : 'English'} for: ${denialRisk}. Use documentation: ${medicalNote}`
      );
      setAppealText(draft);
    } catch (e) {
      console.error(e);
      setError('Failed to draft appeal');
    } finally {
      setIsThinking(false);
    }
  };

  const startPipeline = async () => {
    setError(null);
    setPipelineStatus('normalizing');
    setActiveTab('coder');

    try {
      // Execute normalization in sequence
      const item1 = await normalizeCode("CONS_99", "Primary Care Consult", lang);
      const item2 = await normalizeCode("LAB_001", "Blood Analysis", lang);
      const item3 = await normalizeCode("GIVC_V_01", "Virtual Cardiology Monitoring", lang);

      const items = [item1, item2, item3];

      setPipelineStatus('fhir');
      await new Promise(r => setTimeout(r, 800));
      const finalClaim = buildFHIRAndApplyRules(items);

      if (finalClaim) {
        setSubmissionData(finalClaim);
      }

      setPipelineStatus('signing');
      const risk = await callGemini(
        `Predict denial risk for: ${JSON.stringify(finalClaim)}. Language: ${lang === 'ar' ? 'Arabic' : 'English'}`
      );
      setDenialRisk(risk);
      setPipelineStatus('submitted');
    } catch (e) {
      console.error("Pipeline Failure:", e);
      setError(t.errorPipeline);
      setPipelineStatus('idle');
    }
  };

  // Simulated ambient listening effect
  useEffect(() => {
    if (isListening) {
      const parts = lang === 'ar' ? [
        "الطبيب: مرحباً، تفضل بشرح الأعراض. ",
        "المريض: أشعر بضيق تنفس منذ يومين. ",
        "الطبيب: سنقوم بعمل فحص دم وتخطيط قلب عاجل."
      ] : [
        "Doctor: Hello, please describe your symptoms. ",
        "Patient: I've had shortness of breath for two days. ",
        "Doctor: We will order blood tests and an urgent ECG."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setTranscript(prev => prev + (prev ? " " : "") + parts[i]);
        i++;
        if (i >= parts.length) setIsListening(false);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isListening, lang]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      <Header
        lang={lang}
        setLang={setLang}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        t={t}
        isRTL={isRTL}
      />

      {error && (
        <div className="bg-rose-600 text-white py-2 px-4 text-center text-xs font-black animate-pulse flex justify-center items-center gap-2">
          <AlertCircle size={14}/> {error}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {activeTab === 'doctor' && (
          <ClinicianTab
            t={t}
            isRTL={isRTL}
            isListening={isListening}
            setIsListening={setIsListening}
            transcript={transcript}
            clinicalInsights={clinicalInsights}
            medicalNote={medicalNote}
            isThinking={isThinking}
            isSummarizing={isSummarizing}
            handleGetInsights={handleGetInsights}
            handleSummarize={handleSummarize}
            startPipeline={startPipeline}
          />
        )}

        {activeTab === 'coder' && (
          <CoderTab
            t={t}
            isRTL={isRTL}
            pipelineStatus={pipelineStatus}
            submissionData={submissionData}
          />
        )}

        {activeTab === 'validator' && (
          <ValidatorTab
            t={t}
            isRTL={isRTL}
            denialRisk={denialRisk}
            appealText={appealText}
            isThinking={isThinking}
            handleDraftAppeal={handleDraftAppeal}
          />
        )}
      </main>

      <Footer t={t} isRTL={isRTL} />
    </div>
  );
}
