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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 text-white">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 animate-gradient"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
        
        <div className="relative flex items-center justify-between gap-8">
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-primary via-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-primary/30">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">AI-Powered Healthcare</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/70">Powered by</span>
                  <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md">DeepSeek AI</span>
                </div>
              </div>
            </div>
            <p className="text-lg text-white/80 mb-6 leading-relaxed">
              Leverage cutting-edge AI to streamline your healthcare billing workflow. 
              Get instant SBS code suggestions, validate claims against NPHIES standards, 
              and predict approvals with <span className="text-emerald-400 font-semibold">94%+ accuracy</span>.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setCopilotOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
              >
                <span className="material-symbols-outlined">psychology</span>
                Open AI Copilot
              </button>
              <button
                onClick={() => setAnalyzerOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined">analytics</span>
                Analyze Claim
              </button>
            </div>
          </div>
          
          {/* Decorative AI Visualization */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-purple-500 blur-xl opacity-50 animate-pulse"></div>
              
              {/* Main circle */}
              <div className="relative size-48 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="size-32 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-white/90 animate-float">smart_toy</span>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-2 -right-2 size-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>
                <span className="material-symbols-outlined text-white">check_circle</span>
              </div>
              <div className="absolute -bottom-2 -left-2 size-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.8s' }}>
                <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
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
