/**
 * Predictive Analytics Dashboard - AI-powered healthcare billing insights
 * Provides ML-based predictions, trends, and actionable recommendations
 */

import React, { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';

// Mock historical data for visualization
const MOCK_MONTHLY_DATA = [
  { month: 'Aug', claims: 1240, approved: 1085, denied: 155, pending: 0 },
  { month: 'Sep', claims: 1380, approved: 1242, denied: 138, pending: 0 },
  { month: 'Oct', claims: 1520, approved: 1368, denied: 152, pending: 0 },
  { month: 'Nov', claims: 1450, approved: 1334, denied: 116, pending: 0 },
  { month: 'Dec', claims: 1680, approved: 1512, denied: 168, pending: 0 },
  { month: 'Jan', claims: 1820, approved: 1638, denied: 145, pending: 37 },
];

const DENIAL_REASONS = [
  { reason: 'Missing Documentation', count: 234, percentage: 32, trend: 'down' },
  { reason: 'Invalid SBS Code', count: 189, percentage: 26, trend: 'down' },
  { reason: 'Prior Auth Required', count: 145, percentage: 20, trend: 'up' },
  { reason: 'Coverage Expired', count: 98, percentage: 13, trend: 'stable' },
  { reason: 'Duplicate Claim', count: 65, percentage: 9, trend: 'down' },
];

const PAYER_PERFORMANCE = [
  { payer: 'Tawuniya', approvalRate: 94, avgDays: 2.3, color: 'emerald' },
  { payer: 'Bupa Arabia', approvalRate: 91, avgDays: 3.1, color: 'blue' },
  { payer: 'Medgulf', approvalRate: 88, avgDays: 3.8, color: 'amber' },
  { payer: 'CCHI', approvalRate: 85, avgDays: 4.2, color: 'purple' },
  { payer: 'AXA', approvalRate: 82, avgDays: 4.5, color: 'rose' },
];

export function PredictiveAnalyticsDashboard() {
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    // Simulate loading predictions
    setTimeout(() => {
      setPredictions({
        nextMonthClaims: 1950,
        expectedApprovalRate: 91.2,
        predictedDenials: 171,
        revenueProjection: 2850000,
        riskScore: 23,
        optimizationPotential: 125000,
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const generateAIInsights = async () => {
    setIsGeneratingInsights(true);
    
    const prompt = `You are a healthcare billing analytics expert. Analyze this data and provide insights:

Historical Data:
${JSON.stringify(MOCK_MONTHLY_DATA, null, 2)}

Denial Reasons:
${JSON.stringify(DENIAL_REASONS, null, 2)}

Payer Performance:
${JSON.stringify(PAYER_PERFORMANCE, null, 2)}

Predictions:
${JSON.stringify(predictions, null, 2)}

Provide strategic insights:
1. Key trends and patterns
2. Areas of concern
3. Optimization opportunities
4. Specific actionable recommendations for Saudi healthcare context

Return JSON:
{
  "summary": "Executive summary paragraph",
  "keyInsights": [
    {"title": "Insight title", "description": "Details", "impact": "high/medium/low", "icon": "material-icon-name"}
  ],
  "recommendations": [
    {"priority": 1, "action": "What to do", "expectedImpact": "Expected outcome", "effort": "low/medium/high"}
  ],
  "alerts": [
    {"type": "warning/info/success", "message": "Alert message"}
  ]
}`;

    try {
      const response = await callGemini(prompt, 
        "You are a Saudi healthcare billing analytics expert. Return only valid JSON."
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setAiInsights(JSON.parse(jsonMatch[0]));
      }
    } catch (error) {
      console.error('AI insights error:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Predictive Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">AI-powered insights and forecasting</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {['7d', '30d', '90d', '1y'].map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-white dark:bg-slate-700 text-primary shadow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={generateAIInsights}
            disabled={isGeneratingInsights}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isGeneratingInsights ? (
              <>
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                AI Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PredictionCard
          icon="trending_up"
          label="Predicted Claims"
          value={predictions.nextMonthClaims.toLocaleString()}
          subtitle="Next 30 days"
          trend="+7.1%"
          trendUp={true}
          color="blue"
        />
        <PredictionCard
          icon="verified"
          label="Expected Approval"
          value={`${predictions.expectedApprovalRate}%`}
          subtitle="Based on current trends"
          trend="+1.2%"
          trendUp={true}
          color="emerald"
        />
        <PredictionCard
          icon="payments"
          label="Revenue Projection"
          value={`₴${(predictions.revenueProjection / 1000000).toFixed(2)}M`}
          subtitle="Estimated collections"
          trend="+12%"
          trendUp={true}
          color="purple"
        />
        <PredictionCard
          icon="savings"
          label="Optimization Potential"
          value={`₴${(predictions.optimizationPotential / 1000).toFixed(0)}K`}
          subtitle="Recoverable denials"
          trend="Available"
          trendUp={true}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Claims Trend Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Claims Trend & Predictions</h3>
          <div className="h-64 flex items-end gap-2">
            {MOCK_MONTHLY_DATA.map((data, idx) => {
              const maxClaims = Math.max(...MOCK_MONTHLY_DATA.map(d => d.claims));
              const height = (data.claims / maxClaims) * 100;
              const approvedHeight = (data.approved / data.claims) * height;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse" style={{ height: `${height}%` }}>
                    <div 
                      className="w-full bg-emerald-500 rounded-t-sm transition-all hover:opacity-80"
                      style={{ height: `${approvedHeight}%` }}
                      title={`Approved: ${data.approved}`}
                    />
                    <div 
                      className="w-full bg-red-400 transition-all hover:opacity-80"
                      style={{ height: `${100 - (approvedHeight / height * 100)}%` }}
                      title={`Denied: ${data.denied}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{data.month}</span>
                </div>
              );
            })}
            {/* Prediction bars */}
            <div className="flex-1 flex flex-col items-center gap-1 opacity-60">
              <div className="w-full flex flex-col-reverse h-[95%] border-2 border-dashed border-primary rounded-t-sm">
                <div className="w-full bg-primary/20 h-[91%] rounded-t-sm" />
              </div>
              <span className="text-xs text-primary font-medium">Feb*</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded bg-emerald-500"></div>
              <span className="text-slate-500">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded bg-red-400"></div>
              <span className="text-slate-500">Denied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded border-2 border-dashed border-primary"></div>
              <span className="text-slate-500">Predicted</span>
            </div>
          </div>
        </div>

        {/* Denial Reasons */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Top Denial Reasons</h3>
          <div className="space-y-4">
            {DENIAL_REASONS.map((reason, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{reason.reason}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{reason.count}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      reason.trend === 'down' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      reason.trend === 'up' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {reason.trend === 'down' ? '↓' : reason.trend === 'up' ? '↑' : '→'}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full transition-all"
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payer Performance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Payer Performance Analysis</h3>
        <div className="grid md:grid-cols-5 gap-4">
          {PAYER_PERFORMANCE.map((payer, idx) => {
            const colors = {
              emerald: 'from-emerald-500 to-teal-500',
              blue: 'from-blue-500 to-cyan-500',
              amber: 'from-amber-500 to-orange-500',
              purple: 'from-purple-500 to-pink-500',
              rose: 'from-rose-500 to-red-500',
            };
            
            return (
              <div key={idx} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="relative size-20 mx-auto mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${payer.approvalRate * 2.26} 226`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" className="text-primary" stopColor="currentColor" />
                        <stop offset="100%" className="text-blue-400" stopColor="currentColor" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{payer.approvalRate}%</span>
                  </div>
                </div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">{payer.payer}</p>
                <p className="text-xs text-slate-500 mt-1">Avg {payer.avgDays} days</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiInsights && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-white">psychology</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">AI-Generated Insights</h3>
              <p className="text-xs text-slate-500">Based on your data patterns</p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl">
            {aiInsights.summary}
          </p>

          {/* Key Insights */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {aiInsights.keyInsights?.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl">
                <div className={`size-10 rounded-lg flex items-center justify-center ${
                  insight.impact === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                  insight.impact === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' :
                  'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                }`}>
                  <span className="material-symbols-outlined">{insight.icon || 'insights'}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{insight.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-white">Recommendations</h4>
            {aiInsights.recommendations?.map((rec, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{rec.priority}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{rec.action}</p>
                  <p className="text-xs text-slate-500">{rec.expectedImpact}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  rec.effort === 'low' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  rec.effort === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {rec.effort} effort
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Score */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Portfolio Risk Assessment</h3>
            <p className="text-sm text-slate-500">ML-based risk scoring for pending claims</p>
          </div>
          <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
            predictions.riskScore <= 30 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            predictions.riskScore <= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            Risk Score: {predictions.riskScore}/100
          </div>
        </div>
        
        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              predictions.riskScore <= 30 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
              predictions.riskScore <= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
              'bg-gradient-to-r from-red-400 to-rose-500'
            }`}
            style={{ width: `${predictions.riskScore}%` }}
          />
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Low Risk</span>
          <span>Medium Risk</span>
          <span>High Risk</span>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function PredictionCard({ icon, label, value, subtitle, trend, trendUp, color }) {
  const colors = {
    blue: 'from-blue-500 to-cyan-500 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'from-emerald-500 to-teal-500 bg-emerald-50 dark:bg-emerald-900/20',
    purple: 'from-purple-500 to-pink-500 bg-purple-50 dark:bg-purple-900/20',
    amber: 'from-amber-500 to-orange-500 bg-amber-50 dark:bg-amber-900/20',
  };

  return (
    <div className={`p-5 rounded-2xl ${colors[color].split(' ').slice(2).join(' ')} border border-slate-200 dark:border-slate-700`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`size-10 rounded-xl bg-gradient-to-r ${colors[color].split(' ').slice(0, 2).join(' ')} flex items-center justify-center shadow-lg`}>
          <span className="material-symbols-outlined text-white">{icon}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-[10px] text-slate-400">{subtitle}</p>
    </div>
  );
}
