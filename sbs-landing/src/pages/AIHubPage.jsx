/**
 * AI Hub Page - Central dashboard for all AI-powered features
 * Showcases AI capabilities and provides quick access to AI tools
 */

import React, { useState } from 'react';
import { AICopilot } from '../components/AICopilot';
import { SmartClaimAnalyzer } from '../components/SmartClaimAnalyzer';

const AI_FEATURES = [
  {
    id: 'copilot',
    icon: 'psychology',
    title: 'SBS Copilot',
    description: 'Your AI healthcare billing assistant. Get instant answers about SBS codes, claim validation, and compliance.',
    color: 'from-primary to-blue-600',
    stats: { label: 'Queries Handled', value: '2,450+' },
    badge: 'POPULAR'
  },
  {
    id: 'analyzer',
    icon: 'analytics',
    title: 'Claim Analyzer',
    description: 'AI-powered claim analysis with predictive approval rates, risk assessment, and optimization suggestions.',
    color: 'from-purple-500 to-pink-500',
    stats: { label: 'Claims Analyzed', value: '12,800+' },
    badge: 'NEW'
  },
  {
    id: 'coder',
    icon: 'code',
    title: 'Smart Code Mapper',
    description: 'Automatically map internal hospital codes to official SBS V3.1 codes with AI-powered suggestions.',
    color: 'from-emerald-500 to-teal-500',
    stats: { label: 'Codes Mapped', value: '45,000+' }
  },
  {
    id: 'validator',
    icon: 'verified',
    title: 'Compliance Validator',
    description: 'Real-time CHI/NPHIES compliance checking with detailed recommendations for fixes.',
    color: 'from-amber-500 to-orange-500',
    stats: { label: 'Issues Detected', value: '8,900+' }
  },
  {
    id: 'predictor',
    icon: 'trending_up',
    title: 'Approval Predictor',
    description: 'ML-based prediction of claim approval probability based on historical data and claim attributes.',
    color: 'from-cyan-500 to-blue-500',
    stats: { label: 'Accuracy Rate', value: '94%' }
  },
  {
    id: 'pa-assistant',
    icon: 'approval',
    title: 'Prior Auth Assistant',
    description: 'AI-generated prior authorization justifications that maximize approval chances.',
    color: 'from-rose-500 to-red-500',
    stats: { label: 'PA Approved', value: '89%' }
  }
];

const QUICK_ACTIONS = [
  { icon: 'search', label: 'Find SBS Code', action: 'search' },
  { icon: 'verified_user', label: 'Check Eligibility', action: 'eligibility' },
  { icon: 'description', label: 'Analyze Claim', action: 'analyze' },
  { icon: 'code', label: 'Map Code', action: 'map' },
];

export function AIHubPage() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const handleFeatureClick = (featureId) => {
    switch (featureId) {
      case 'copilot':
        setCopilotOpen(true);
        break;
      case 'analyzer':
        setAnalyzerOpen(true);
        break;
      default:
        setSelectedFeature(featureId);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-purple-600 p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNC00di00aC0ydjRoMnptLTQgMHYtNGgtMnY0aDJ6bTQgMHYtNGgtMnY0aDJ6bTQgMHYtNGgtMnY0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">auto_awesome</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">AI-Powered Healthcare Billing</h1>
                <p className="text-white/80">Intelligent automation for NPHIES & SBS compliance</p>
              </div>
            </div>
            <p className="text-lg text-white/90 mb-6">
              Leverage cutting-edge AI to streamline your healthcare billing workflow. 
              Get instant code suggestions, validate claims, and predict approvals with over 94% accuracy.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCopilotOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl"
              >
                <span className="material-symbols-outlined">psychology</span>
                Open AI Copilot
              </button>
              <button
                onClick={() => setAnalyzerOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm font-semibold rounded-xl hover:bg-white/30 transition-all"
              >
                <span className="material-symbols-outlined">analytics</span>
                Analyze Claim
              </button>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <div className="relative">
              <div className="size-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <div className="size-36 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-7xl text-white/80">smart_toy</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            onClick={() => action.action === 'analyze' ? setAnalyzerOpen(true) : setCopilotOpen(true)}
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all group"
          >
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-primary group-hover:text-white">{action.icon}</span>
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
          </button>
        ))}
      </div>

      {/* AI Features Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">AI Capabilities</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_FEATURES.map((feature) => (
            <div
              key={feature.id}
              onClick={() => handleFeatureClick(feature.id)}
              className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-transparent hover:shadow-xl transition-all"
            >
              {/* Gradient border on hover */}
              <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              <div className="relative bg-white dark:bg-slate-800 m-[2px] rounded-[14px] p-5">
                {/* Badge */}
                {feature.badge && (
                  <span className={`absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    feature.badge === 'NEW' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {feature.badge}
                  </span>
                )}
                
                {/* Icon */}
                <div className={`size-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-white text-xl">{feature.icon}</span>
                </div>
                
                {/* Content */}
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{feature.description}</p>
                
                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-slate-500">{feature.stats.label}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{feature.stats.value}</p>
                  </div>
                  <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Performance Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">AI Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard 
            icon="speed" 
            label="Avg Response Time" 
            value="1.2s" 
            trend="+12%" 
            trendUp={false}
            color="blue"
          />
          <StatCard 
            icon="verified" 
            label="Accuracy Rate" 
            value="94.7%" 
            trend="+3.2%" 
            trendUp={true}
            color="emerald"
          />
          <StatCard 
            icon="description" 
            label="Claims Processed" 
            value="45.2K" 
            trend="+18%" 
            trendUp={true}
            color="purple"
          />
          <StatCard 
            icon="savings" 
            label="Cost Savings" 
            value="₴1.2M" 
            trend="+24%" 
            trendUp={true}
            color="amber"
          />
        </div>
      </div>

      {/* AI Copilot Modal */}
      <AICopilot 
        isOpen={copilotOpen} 
        onClose={() => setCopilotOpen(false)} 
      />

      {/* Claim Analyzer Modal */}
      <SmartClaimAnalyzer 
        isOpen={analyzerOpen}
        onClose={() => setAnalyzerOpen(false)}
        claimData={{
          patientId: 'P-12345',
          serviceDate: '2026-01-15',
          claimType: 'Professional',
          totalAmount: 15000,
          items: [
            { sbsCode: '90471-00-00', description: 'Immunization administration', quantity: 1, unitPrice: 500 },
            { sbsCode: '99213-00-00', description: 'Office visit, established patient', quantity: 1, unitPrice: 800 },
          ]
        }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, trend, trendUp, color }) {
  const colors = {
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
  };

  return (
    <div className="text-center">
      <div className={`size-12 mx-auto rounded-xl bg-gradient-to-r ${colors[color]} flex items-center justify-center mb-3 shadow-lg`}>
        <span className="material-symbols-outlined text-white">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <span className={`text-xs font-medium ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
        {trend} {trendUp ? '↑' : '↓'}
      </span>
    </div>
  );
}
