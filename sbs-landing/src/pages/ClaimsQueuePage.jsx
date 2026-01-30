import React, { useState } from 'react';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function ClaimsQueuePage() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const handleAction = (action) => {
    toast.info(`${action} functionality is ready for integration.`);
  };

  const claims = [
    {
      id: 'CLM-2024-001',
      patient: 'Ahmed Al-Rashid',
      facility: 'Mercy General Hospital',
      type: 'Inpatient',
      submittedAt: '2024-01-28 10:30',
      status: 'pending',
      priority: 'high',
      amount: '12,500 SAR'
    },
    {
      id: 'CLM-2024-002',
      patient: 'Sarah Hassan',
      facility: 'Central Health Clinic',
      type: 'Outpatient',
      submittedAt: '2024-01-28 09:15',
      status: 'processing',
      priority: 'normal',
      amount: '850 SAR'
    },
    {
      id: 'CLM-2024-003',
      patient: 'Mohammed Ali',
      facility: 'St. Jude Medical Center',
      type: 'Emergency',
      submittedAt: '2024-01-28 08:45',
      status: 'approved',
      priority: 'urgent',
      amount: '6,200 SAR'
    },
    {
      id: 'CLM-2024-004',
      patient: 'Fatima Khalid',
      facility: 'Valley Heights Medical',
      type: 'Outpatient',
      submittedAt: '2024-01-27 16:20',
      status: 'rejected',
      priority: 'normal',
      amount: '1,800 SAR'
    },
    {
      id: 'CLM-2024-005',
      patient: 'Omar Youssef',
      facility: 'Mercy General Hospital',
      type: 'Inpatient',
      submittedAt: '2024-01-27 14:00',
      status: 'pending',
      priority: 'normal',
      amount: '4,500 SAR'
    }
  ];

  const statusCounts = {
    all: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    processing: claims.filter(c => c.status === 'processing').length,
    approved: claims.filter(c => c.status === 'approved').length,
    rejected: claims.filter(c => c.status === 'rejected').length
  };

  const filteredClaims = claims.filter(claim => {
    const matchesFilter = filter === 'all' || claim.status === filter;
    const matchesSearch = searchQuery === '' || 
      claim.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.patient.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Claims Queue</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Prioritize, triage, and resolve claims with smart filters.</p>
          </div>
          <Button icon="add" onClick={() => handleAction('New Claim')}>
            New Claim
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard label="All Claims" count={statusCounts.all} active={filter === 'all'} onClick={() => setFilter('all')} color="primary" />
          <StatCard label="Pending" count={statusCounts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} color="yellow" />
          <StatCard label="Processing" count={statusCounts.processing} active={filter === 'processing'} onClick={() => setFilter('processing')} color="blue" />
          <StatCard label="Approved" count={statusCounts.approved} active={filter === 'approved'} onClick={() => setFilter('approved')} color="green" />
          <StatCard label="Rejected" count={statusCounts.rejected} active={filter === 'rejected'} onClick={() => setFilter('rejected')} color="red" />
        </div>

        <Card className="mb-6">
          <CardBody className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Input
              icon="search"
              placeholder="Search by claim ID or patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="secondary" icon="filter_list" onClick={() => handleAction('Filters')}>
              Filters
            </Button>
            <Button variant="secondary" icon="download" onClick={() => handleAction('Export')}>
              Export
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Claims Overview"
            subtitle="Status, priority, and billing details for incoming requests"
          />
          <div className="w-full overflow-hidden">
            <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#111a22] border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Claim ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Facility</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredClaims.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} />
              ))}
            </tbody>
          </table>

          {filteredClaims.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-slate-400 text-4xl mb-2">inbox</span>
              <p className="text-slate-500 dark:text-slate-400">No claims found matching your criteria</p>
            </div>
          )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, count, active, onClick, color }) {
  const colors = {
    primary: 'border-primary bg-primary/5 text-primary',
    yellow: 'border-yellow-500 bg-yellow-500/5 text-yellow-600',
    blue: 'border-blue-500 bg-blue-500/5 text-blue-600',
    green: 'border-green-500 bg-green-500/5 text-green-600',
    red: 'border-red-500 bg-red-500/5 text-red-600'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all hover:shadow-soft ${
        active 
          ? colors[color]
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </button>
  );
}

function ClaimRow({ claim }) {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
  };

  const priorityDot = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    normal: 'bg-slate-400'
  };

  return (
    <tr className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800/50 dark:hover:to-transparent transition-all">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${priorityDot[claim.priority]}`} />
          <span className="font-mono text-sm text-primary">{claim.id}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm font-medium text-slate-900 dark:text-white">{claim.patient}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-slate-600 dark:text-slate-300">{claim.facility}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-slate-600 dark:text-slate-300">{claim.type}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm font-medium text-slate-900 dark:text-white">{claim.amount}</span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[claim.status]}`}>
          {claim.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
          <span className="material-symbols-outlined text-[20px]">more_vert</span>
        </button>
      </td>
    </tr>
  );
}
