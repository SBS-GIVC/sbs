/**
 * AI Analytics Hub
 * Comprehensive dashboard for AI-powered claim analytics, predictions, and insights
 */

import React, { useState, useEffect } from 'react';
import {
  predictClaim,
  optimizeCost,
  detectFraud,
  checkCompliance,
  analyzeClaim,
  getFacilityAnalytics
} from '../services/aiPredictionService';

const AIAnalyticsHub = () => {
  const [activeTab, setActiveTab] = useState('predict');
  const [claimData, setClaimData] = useState({
    facility_id: 1,
    patient_age: 45,
    patient_gender: 'M',
    diagnosis_codes: ['I10', 'E11.9'],
    procedure_codes: ['1101001', '1201001'],
    service_date: '2026-01-31',
    total_amount: 5000,
    items: [
      { sbs_code: '1101001', quantity: 1, description: 'CT Scan' },
      { sbs_code: '1201001', quantity: 2, description: 'CBC Test' }
    ]
  });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facilityAnalytics, setFacilityAnalytics] = useState(null);

  // Load facility analytics on mount
  useEffect(() => {
    loadFacilityAnalytics();
  }, []);

  const loadFacilityAnalytics = async () => {
    try {
      const analytics = await getFacilityAnalytics(claimData.facility_id, 30);
      setFacilityAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeClaim(claimData.facility_id, claimData);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const result = await predictClaim(
        claimData.facility_id,
        claimData.patient_age,
        claimData.patient_gender,
        claimData.diagnosis_codes,
        claimData.procedure_codes,
        claimData.service_date,
        claimData.total_amount
      );
      setAnalysisResult({ prediction: result });
    } catch (error) {
      console.error("Prediction failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const result = await optimizeCost(claimData.facility_id, claimData.items);
      setAnalysisResult({ optimization: result });
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFraudDetection = async () => {
    setLoading(true);
    try {
      const result = await detectFraud(claimData.facility_id, claimData);
      setAnalysisResult({ fraud: result });
    } catch (error) {
      console.error("Fraud detection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplianceCheck = async () => {
    setLoading(true);
    try {
      const result = await checkCompliance(claimData.facility_id, claimData);
      setAnalysisResult({ compliance: result });
    } catch (error) {
      console.error("Compliance check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateClaimData = (field, value) => {
    setClaimData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setClaimData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setClaimData(prev => ({
      ...prev,
      items: [...prev.items, { sbs_code: '', quantity: 1, description: '' }]
    }));
  };

  const removeItem = (index) => {
    setClaimData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'REVIEW_REQUIRED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLIANCE_ISSUE': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'OPTIMIZATION_AVAILABLE': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600 font-bold';
    if (score >= 40) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            AI Analytics Hub
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Powered by DeepSeek AI • Real-time predictive analytics for healthcare claims
          </p>
        </div>

        {/* Facility Analytics Overview */}
        {facilityAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Claims</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {facilityAnalytics.total_claims || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">Approval Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {((facilityAnalytics.approved_claims / facilityAnalytics.total_claims) * 100 || 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Amount</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {facilityAnalytics.total_amount?.toFixed(0) || 0} SAR
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">Avg Claim</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {facilityAnalytics.average_amount?.toFixed(0) || 0} SAR
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'predict', label: 'Predict', icon: '🔮' },
            { id: 'optimize', label: 'Optimize', icon: '💰' },
            { id: 'fraud', label: 'Fraud Detection', icon: '🛡️' },
            { id: 'compliance', label: 'Compliance', icon: '📋' },
            { id: 'analyze', label: 'Full Analysis', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Claim Data Form */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Claim Data
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Facility ID
                  </label>
                  <input
                    type="number"
                    value={claimData.facility_id}
                    onChange={(e) => updateClaimData('facility_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Total Amount (SAR)
                  </label>
                  <input
                    type="number"
                    value={claimData.total_amount}
                    onChange={(e) => updateClaimData('total_amount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={claimData.patient_age}
                    onChange={(e) => updateClaimData('patient_age', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={claimData.patient_gender}
                    onChange={(e) => updateClaimData('patient_gender', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={claimData.service_date}
                    onChange={(e) => updateClaimData('service_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Diagnosis Codes (ICD-10)
                </label>
                <input
                  type="text"
                  value={claimData.diagnosis_codes.join(', ')}
                  onChange={(e) => updateClaimData('diagnosis_codes', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  placeholder="I10, E11.9, N18.3"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Procedure Codes (SBS)
                </label>
                <input
                  type="text"
                  value={claimData.procedure_codes.join(', ')}
                  onChange={(e) => updateClaimData('procedure_codes', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  placeholder="1101001, 1201001"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Claim Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Claim Items
                  </label>
                  <button
                    onClick={addItem}
                    className="text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {claimData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.sbs_code}
                        onChange={(e) => updateItem(index, 'sbs_code', e.target.value)}
                        placeholder="SBS Code"
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                        placeholder="Qty"
                        className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => removeItem(index)}
                        className="px-2 py-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              AI Analysis Results
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Analyzing with DeepSeek AI...</p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                {/* Overall Status */}
                {analysisResult.overall_status && (
                  <div className={`p-4 rounded-lg border ${getStatusColor(analysisResult.overall_status)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Overall Status</span>
                      <span className="text-lg font-bold">{analysisResult.overall_status}</span>
                    </div>
                    {analysisResult.overall_risk_score !== undefined && (
                      <div className="mt-2">
                        <div className="text-sm">Risk Score: <span className={getRiskColor(analysisResult.overall_risk_score)}>{analysisResult.overall_risk_score.toFixed(1)}/100</span></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Prediction Results */}
                {analysisResult.prediction && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">🔮 Prediction</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Confidence:</span>
                        <span className="ml-2 font-semibold text-primary">{(analysisResult.prediction.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Risk Score:</span>
                        <span className={`ml-2 font-semibold ${getRiskColor(analysisResult.prediction.risk_score)}`}>{analysisResult.prediction.risk_score.toFixed(1)}</span>
                      </div>
                    </div>
                    {analysisResult.prediction.recommendations?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recommendations:</div>
                        <ul className="text-sm space-y-1">
                          {analysisResult.prediction.recommendations.map((rec, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-400">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Optimization Results */}
                {analysisResult.optimization && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">💰 Cost Optimization</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Total Savings:</span>
                        <span className="ml-2 font-semibold text-green-600">{analysisResult.optimization.total_savings.toFixed(2)} SAR</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Savings %:</span>
                        <span className="ml-2 font-semibold text-green-600">{analysisResult.optimization.savings_percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    {analysisResult.optimization.recommendations?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Optimization Tips:</div>
                        <ul className="text-sm space-y-1">
                          {analysisResult.optimization.recommendations.map((rec, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-400">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Fraud Detection Results */}
                {analysisResult.fraud && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">🛡️ Fraud Detection</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Fraudulent:</span>
                        <span className={`ml-2 font-semibold ${analysisResult.fraud.is_fraudulent ? 'text-red-600' : 'text-green-600'}`}>
                          {analysisResult.fraud.is_fraudulent ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Fraud Score:</span>
                        <span className={`ml-2 font-semibold ${getRiskColor(analysisResult.fraud.fraud_score)}`}>{analysisResult.fraud.fraud_score.toFixed(1)}</span>
                      </div>
                    </div>
                    {analysisResult.fraud.risk_factors?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Risk Factors:</div>
                        <ul className="text-sm space-y-1">
                          {analysisResult.fraud.risk_factors.map((factor, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-400">• {factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Compliance Results */}
                {analysisResult.compliance && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">📋 Compliance Check</h3>
                    <div className="text-sm mb-2">
                      <span className="text-slate-500">Status:</span>
                      <span className={`ml-2 font-semibold ${analysisResult.compliance.is_compliant ? 'text-green-600' : 'text-red-600'}`}>
                        {analysisResult.compliance.is_compliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                    {analysisResult.compliance.violations?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-red-600 mb-1">Violations:</div>
                        <ul className="text-sm space-y-1">
                          {analysisResult.compliance.violations.map((violation, i) => (
                            <li key={i} className="text-red-600">• {violation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.compliance.warnings?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-yellow-600 mb-1">Warnings:</div>
                        <ul className="text-sm space-y-1">
                          {analysisResult.compliance.warnings.map((warning, i) => (
                            <li key={i} className="text-yellow-600">• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.compliance.suggestions?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Suggestions:</div>
                        <ul className="text-sm space-y-1">
                          {analysisResult.compliance.suggestions.map((suggestion, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-400">• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Comprehensive Recommendations */}
                {analysisResult.recommendations && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">💡 Comprehensive Recommendations</h3>
                    <ul className="text-sm space-y-1">
                      {analysisResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-slate-700 dark:text-slate-300">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Enter claim data and click "Analyze" to get AI-powered insights</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          {activeTab === 'predict' && (
            <button
              onClick={handlePredict}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              🔮 Predict Claim Approval
            </button>
          )}
          {activeTab === 'optimize' && (
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              💰 Optimize Costs
            </button>
          )}
          {activeTab === 'fraud' && (
            <button
              onClick={handleFraudDetection}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              🛡️ Detect Fraud
            </button>
          )}
          {activeTab === 'compliance' && (
            <button
              onClick={handleComplianceCheck}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              📋 Check Compliance
            </button>
          )}
          {activeTab === 'analyze' && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              📊 Full AI Analysis
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>Powered by DeepSeek AI • SBS V3.1 Compliant • Real-time Predictive Analytics</p>
          <p className="mt-1">All predictions are advisory - final decisions should be made by qualified professionals</p>
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsHub;
