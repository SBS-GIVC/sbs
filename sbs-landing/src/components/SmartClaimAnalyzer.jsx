/**
 * Smart Claim Analyzer - AI-Powered Real-time Claim Analysis
 * Provides predictive approval rates, optimization suggestions, and compliance checks
 */

import React, { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';

const ANALYSIS_CATEGORIES = [
  { id: 'compliance', icon: 'verified', label: 'Compliance', color: 'emerald' },
  { id: 'optimization', icon: 'lightbulb', label: 'Optimization', color: 'amber' },
  { id: 'risk', icon: 'warning', label: 'Risk Factors', color: 'red' },
  { id: 'prediction', icon: 'analytics', label: 'Prediction', color: 'blue' },
];

export function SmartClaimAnalyzer({ claimData, isOpen, onClose, onApplySuggestion }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('compliance');
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());

  useEffect(() => {
    if (isOpen && claimData) {
      runAnalysis();
    }
  }, [isOpen, claimData]);

  const runAnalysis = async () => {
    if (!claimData) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const prompt = `You are an expert Saudi healthcare claims analyst. Analyze this claim comprehensively.

CLAIM DATA:
${JSON.stringify(claimData, null, 2)}

Provide a detailed analysis including:

1. COMPLIANCE ANALYSIS:
- CHI (Council of Health Insurance) compliance status
- NPHIES submission readiness
- Missing required fields or documentation
- Regulatory concerns

2. OPTIMIZATION OPPORTUNITIES:
- Bundle opportunities to reduce costs
- Alternative codes that might be more appropriate
- Documentation improvements for faster processing
- Pricing optimization suggestions

3. RISK ASSESSMENT:
- Likelihood of rejection (percentage)
- Common rejection reasons for similar claims
- Prior authorization requirements
- Audit risk factors

4. PREDICTIVE ANALYTICS:
- Estimated approval probability
- Expected processing time
- Suggested resubmission strategy if rejected
- Historical comparison with similar claims

Return JSON format:
{
  "approvalProbability": 85,
  "estimatedProcessingDays": 3,
  "overallScore": 78,
  "compliance": {
    "status": "passing/warning/failing",
    "score": 90,
    "items": [
      {"status": "pass/warn/fail", "title": "Title", "description": "Details", "fix": "How to fix if applicable"}
    ]
  },
  "optimization": {
    "potentialSavings": 500,
    "items": [
      {"type": "bundle/code/documentation/pricing", "title": "Title", "description": "Details", "impact": "high/medium/low", "action": "What to do"}
    ]
  },
  "risk": {
    "rejectionProbability": 15,
    "items": [
      {"severity": "high/medium/low", "title": "Title", "description": "Details", "mitigation": "How to mitigate"}
    ]
  },
  "prediction": {
    "summary": "Brief summary of claim outlook",
    "recommendations": ["Key recommendation 1", "Key recommendation 2"],
    "similarClaimsApprovalRate": 87,
    "priorAuthRequired": true/false,
    "priorAuthItems": ["Procedure requiring PA"]
  }
}`;

      const response = await callGemini(prompt, 
        "You are a Saudi healthcare claims expert with deep knowledge of CHI regulations, NPHIES, and SBS V3.1. Return only valid JSON."
      );

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAnalysis(parsed);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis({
        error: true,
        message: 'Unable to analyze claim. Please try again.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = (suggestion, index) => {
    setAppliedSuggestions(prev => new Set([...prev, index]));
    onApplySuggestion?.(suggestion);
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
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-xl">analytics</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Smart Claim Analyzer</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI-powered comprehensive analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Re-analyze
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Score Cards */}
          {analysis && !analysis.error && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              <ScoreCard 
                icon="verified_user" 
                label="Approval Rate" 
                value={`${analysis.approvalProbability}%`}
                color={analysis.approvalProbability >= 80 ? 'emerald' : analysis.approvalProbability >= 60 ? 'amber' : 'red'}
              />
              <ScoreCard 
                icon="schedule" 
                label="Est. Processing" 
                value={`${analysis.estimatedProcessingDays} days`}
                color="blue"
              />
              <ScoreCard 
                icon="score" 
                label="Overall Score" 
                value={`${analysis.overallScore}/100`}
                color={analysis.overallScore >= 80 ? 'emerald' : analysis.overallScore >= 60 ? 'amber' : 'red'}
              />
              <ScoreCard 
                icon="savings" 
                label="Potential Savings" 
                value={`${analysis.optimization?.potentialSavings || 0} SAR`}
                color="purple"
              />
            </div>
          )}
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl animate-pulse">smart_toy</span>
              </div>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Analyzing your claim with AI...</p>
            <p className="text-sm text-slate-400 mt-1">Checking compliance, risks, and optimization opportunities</p>
          </div>
        )}

        {/* Error State */}
        {analysis?.error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-2xl">error</span>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">{analysis.message}</p>
            <button
              onClick={runAnalysis}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Analysis Content */}
        {analysis && !analysis.error && !isAnalyzing && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
              {ANALYSIS_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === cat.id
                      ? `border-${cat.color}-500 text-${cat.color}-600 dark:text-${cat.color}-400`
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[400px]">
              {/* Compliance Tab */}
              {activeTab === 'compliance' && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-4 rounded-xl ${
                    analysis.compliance?.status === 'passing' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                      : analysis.compliance?.status === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <span className={`material-symbols-outlined text-2xl ${
                      analysis.compliance?.status === 'passing' ? 'text-emerald-500' :
                      analysis.compliance?.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {analysis.compliance?.status === 'passing' ? 'check_circle' : 
                       analysis.compliance?.status === 'warning' ? 'warning' : 'error'}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Compliance Score: {analysis.compliance?.score}%
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {analysis.compliance?.status === 'passing' 
                          ? 'Your claim meets all CHI/NPHIES requirements'
                          : 'Some issues need attention before submission'}
                      </p>
                    </div>
                  </div>

                  {analysis.compliance?.items?.map((item, idx) => (
                    <ComplianceItem key={idx} item={item} />
                  ))}
                </div>
              )}

              {/* Optimization Tab */}
              {activeTab === 'optimization' && (
                <div className="space-y-4">
                  {analysis.optimization?.items?.map((item, idx) => (
                    <OptimizationCard 
                      key={idx} 
                      item={item} 
                      applied={appliedSuggestions.has(`opt-${idx}`)}
                      onApply={() => handleApplySuggestion(item, `opt-${idx}`)}
                    />
                  ))}
                </div>
              )}

              {/* Risk Tab */}
              {activeTab === 'risk' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Rejection Probability</span>
                      <span className={`text-lg font-bold ${
                        analysis.risk?.rejectionProbability <= 20 ? 'text-emerald-500' :
                        analysis.risk?.rejectionProbability <= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {analysis.risk?.rejectionProbability}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          analysis.risk?.rejectionProbability <= 20 ? 'bg-emerald-500' :
                          analysis.risk?.rejectionProbability <= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${analysis.risk?.rejectionProbability}%` }}
                      />
                    </div>
                  </div>

                  {analysis.risk?.items?.map((item, idx) => (
                    <RiskCard key={idx} item={item} />
                  ))}
                </div>
              )}

              {/* Prediction Tab */}
              {activeTab === 'prediction' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-blue-500/10">
                    <p className="text-slate-700 dark:text-slate-300">{analysis.prediction?.summary}</p>
                  </div>

                  {analysis.prediction?.priorAuthRequired && (
                    <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-amber-500">approval</span>
                        <p className="font-semibold text-slate-900 dark:text-white">Prior Authorization Required</p>
                      </div>
                      <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {analysis.prediction?.priorAuthItems?.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">AI Recommendations</h4>
                    <div className="space-y-2">
                      {analysis.prediction?.recommendations?.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <span className="material-symbols-outlined text-primary text-lg mt-0.5">lightbulb</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Similar Claims Approval Rate</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-primary">{analysis.prediction?.similarClaimsApprovalRate}%</span>
                      <span className="text-sm text-slate-500 mb-1">based on historical data</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper Components
function ScoreCard({ icon, label, value, color }) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-teal-500 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'from-amber-500 to-orange-500 bg-amber-50 dark:bg-amber-900/20',
    red: 'from-red-500 to-rose-500 bg-red-50 dark:bg-red-900/20',
    blue: 'from-blue-500 to-cyan-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'from-purple-500 to-pink-500 bg-purple-50 dark:bg-purple-900/20',
  };

  return (
    <div className={`p-3 rounded-xl ${colorClasses[color].split(' ').slice(2).join(' ')}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`size-6 rounded-lg bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-white text-sm">{icon}</span>
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ComplianceItem({ item }) {
  const statusStyles = {
    pass: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'check', iconColor: 'text-emerald-500' },
    warn: { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'warning', iconColor: 'text-amber-500' },
    fail: { bg: 'bg-red-100 dark:bg-red-900/30', icon: 'close', iconColor: 'text-red-500' },
  };

  const style = statusStyles[item.status] || statusStyles.warn;

  return (
    <div className={`p-4 rounded-xl ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`size-8 rounded-lg ${style.bg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${style.iconColor}`}>{style.icon}</span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
          {item.fix && (
            <div className="mt-2 p-2 rounded bg-white/50 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-500 mb-1">How to fix:</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.fix}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptimizationCard({ item, applied, onApply }) {
  const typeIcons = {
    bundle: 'inventory_2',
    code: 'tag',
    documentation: 'description',
    pricing: 'payments',
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      applied 
        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
        : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500">{typeIcons[item.type] || 'lightbulb'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                item.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                item.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {item.impact?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
          </div>
        </div>
        <button
          onClick={onApply}
          disabled={applied}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            applied 
              ? 'bg-emerald-500 text-white cursor-default' 
              : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
          }`}
        >
          {applied ? (
            <>
              <span className="material-symbols-outlined text-sm">check</span>
              Applied
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">add</span>
              Apply
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function RiskCard({ item }) {
  const severityStyles = {
    high: { bg: 'border-red-300 bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-500' },
    medium: { bg: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-500' },
    low: { bg: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-500' },
  };

  const style = severityStyles[item.severity] || severityStyles.medium;

  return (
    <div className={`p-4 rounded-xl border-2 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined ${style.iconColor} text-xl`}>warning</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
              item.severity === 'high' ? 'bg-red-500 text-white' :
              item.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              {item.severity}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
          {item.mitigation && (
            <div className="mt-2 flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5">tips_and_updates</span>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.mitigation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
