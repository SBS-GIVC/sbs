/**
 * Voice Clinical Documentation - AI-powered voice-to-text for clinical notes
 * Provides real-time speech recognition with medical terminology support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { callGemini } from '../services/geminiService';

const DOCUMENTATION_TEMPLATES = [
  { id: 'soap', label: 'SOAP Note', icon: 'note_alt' },
  { id: 'progress', label: 'Progress Note', icon: 'trending_up' },
  { id: 'discharge', label: 'Discharge Summary', icon: 'exit_to_app' },
  { id: 'procedure', label: 'Procedure Note', icon: 'medical_services' },
  { id: 'consult', label: 'Consultation', icon: 'forum' },
];

const SPEECH_COMMANDS = {
  'new paragraph': '\n\n',
  'period': '.',
  'comma': ',',
  'colon': ':',
  'semicolon': ';',
  'question mark': '?',
  'exclamation mark': '!',
  'new line': '\n',
  'hyphen': '-',
};

export function VoiceClinicalDocumentation({ isOpen, onClose, onSave }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [enhancedNote, setEnhancedNote] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('soap');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [suggestedCodes, setSuggestedCodes] = useState([]);
  
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          let text = result[0].transcript;
          // Apply speech commands
          Object.entries(SPEECH_COMMANDS).forEach(([command, replacement]) => {
            text = text.replace(new RegExp(command, 'gi'), replacement);
          });
          finalTranscript += text;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please enable it in your browser settings.');
      }
    };
    
    recognition.onend = () => {
      if (isRecording && !isPaused) {
        recognition.start();
      }
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, isPaused]);

  // Audio level visualization
  useEffect(() => {
    if (!isRecording) return;
    
    const getAudioLevel = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        
        const updateLevel = () => {
          if (!analyserRef.current || !isRecording) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.error('Error accessing microphone:', err);
      }
    };
    
    getAudioLevel();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRecording]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    recognitionRef.current?.start();
  };

  const pauseRecording = () => {
    setIsPaused(true);
    recognitionRef.current?.stop();
  };

  const resumeRecording = () => {
    setIsPaused(false);
    recognitionRef.current?.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    recognitionRef.current?.stop();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // AI Enhancement
  const enhanceWithAI = async () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    
    const templateInstructions = {
      soap: 'Format this into a SOAP note with Subjective, Objective, Assessment, and Plan sections.',
      progress: 'Format this as a structured progress note with current status and updates.',
      discharge: 'Format this as a discharge summary with diagnosis, treatment summary, and follow-up instructions.',
      procedure: 'Format this as a procedure note with indication, procedure performed, findings, and complications.',
      consult: 'Format this as a consultation note with reason for consult, history, findings, and recommendations.',
    };
    
    const prompt = `You are a medical documentation specialist. ${templateInstructions[selectedTemplate]}

Raw dictation transcript:
"${transcript}"

Requirements:
1. Correct any medical terminology spelling
2. Add appropriate punctuation and formatting
3. Organize into clear sections
4. Maintain clinical accuracy
5. Keep the original clinical intent
6. Suggest relevant ICD-10/SBS codes based on the content

Return JSON:
{
  "enhancedNote": "The formatted clinical note with sections",
  "suggestedCodes": [
    {"code": "CODE", "type": "ICD-10/SBS", "description": "Description", "relevance": "high/medium"}
  ],
  "warnings": ["Any clinical concerns or missing information"]
}`;

    try {
      const response = await callGemini(prompt, 
        "You are an expert medical transcriptionist and coder. Return only valid JSON."
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setEnhancedNote(result.enhancedNote || transcript);
        setSuggestedCodes(result.suggestedCodes || []);
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
      setEnhancedNote(transcript);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onSave?.({
      rawTranscript: transcript,
      enhancedNote: enhancedNote || transcript,
      template: selectedTemplate,
      suggestedCodes,
      recordingDuration: recordingTime,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  const clearAll = () => {
    setTranscript('');
    setEnhancedNote('');
    setSuggestedCodes([]);
    setRecordingTime(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-xl">mic</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Voice Clinical Documentation</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">AI-powered medical transcription</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <div className="size-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Template Selection */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">Template:</span>
            {DOCUMENTATION_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedTemplate === template.id
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{template.icon}</span>
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Recording & Raw Transcript */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
            {/* Recording Controls */}
            <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
              {/* Audio Visualizer */}
              <div className="relative mb-6">
                <div 
                  className={`size-32 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-xl shadow-rose-500/30' 
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  style={{
                    transform: isRecording ? `scale(${1 + audioLevel * 0.2})` : 'scale(1)',
                  }}
                >
                  <span className={`material-symbols-outlined text-5xl ${isRecording ? 'text-white' : 'text-slate-400'}`}>
                    {isRecording ? (isPaused ? 'pause' : 'mic') : 'mic_none'}
                  </span>
                </div>
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-rose-500 animate-ping opacity-30"></div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    <span className="material-symbols-outlined">mic</span>
                    Start Recording
                  </button>
                ) : (
                  <>
                    <button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium rounded-lg hover:bg-amber-200 transition-all"
                    >
                      <span className="material-symbols-outlined">{isPaused ? 'play_arrow' : 'pause'}</span>
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 transition-all"
                    >
                      <span className="material-symbols-outlined">stop</span>
                      Stop
                    </button>
                  </>
                )}
              </div>
              
              <p className="text-xs text-slate-400 mt-3">
                Say "new paragraph", "period", "comma" for punctuation
              </p>
            </div>

            {/* Raw Transcript */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Raw Transcript</h3>
                {transcript && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your dictation will appear here..."
                className="w-full h-full min-h-[200px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Right Panel - Enhanced Note */}
          <div className="flex-1 flex flex-col">
            {/* AI Enhancement Button */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={enhanceWithAI}
                disabled={!transcript.trim() || isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Enhance with AI
                  </>
                )}
              </button>
            </div>

            {/* Enhanced Note */}
            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Enhanced Clinical Note</h3>
              <textarea
                value={enhancedNote}
                onChange={(e) => setEnhancedNote(e.target.value)}
                placeholder="AI-enhanced note will appear here after processing..."
                className="w-full h-full min-h-[200px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Suggested Codes */}
            {suggestedCodes.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Suggested Codes</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestedCodes.map((code, idx) => (
                    <div 
                      key={idx}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        code.relevance === 'high' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      <span className="font-bold">{code.code}</span>
                      <span className="ml-1 opacity-75">({code.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400">
            Powered by AI • {transcript.split(' ').filter(w => w).length} words
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!transcript.trim() && !enhancedNote.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
