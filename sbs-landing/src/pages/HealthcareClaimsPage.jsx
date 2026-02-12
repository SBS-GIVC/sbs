import React, { useState, useEffect } from 'react';
import { Icons, motion, AnimatePresence, Badge, Button, Card, Input, Modal, Table, Tabs, Tab, SearchBox, FilterPanel, LoadingOverlay } from '../components/ui';
import { healthcareApiService } from '../services/healthcareApiService';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

export const HealthcareClaimsPage = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('claimsQueue');
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: 'all',
        type: 'all'
    });

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);

    // Tab definitions
    const tabs = [
        { id: 'claimsQueue', label: t('claimsQueue'), icon: 'ClipboardList' },
        { id: 'priorAuth', label: t('priorAuth'), icon: 'Shield' },
        { id: 'eligibility', label: t('eligibility'), icon: 'CreditCard' },
        { id: 'analytics', label: t('analytics'), icon: 'BarChart' },
        { id: 'settings', label: t('settings'), icon: 'Settings' }
    ];

    // Fetch claims data
    useEffect(() => {
        const fetchClaims = async () => {
            setLoading(true);
            try {
                const response = await healthcareApiService.getClaims({
                    search: searchQuery,
                    status: filters.status,
                    type: filters.type
                });
                setClaims(response.data);
            } catch (err) {
                setError(err.message);
                addToast('error', t('failedToLoadClaims'));
            } finally {
                setLoading(false);
            }
        };

        fetchClaims();
    }, [searchQuery, filters]);

    // Handle form submission
    const handleSubmitClaim = async (formData) => {
        try {
            const response = await healthcareApiService.submitClaim(formData);
            addToast('success', t('claimSubmittedSuccessfully'));
            setShowSubmitModal(false);
            // Refresh claims list
            const updatedClaims = await healthcareApiService.getClaims({});
            setClaims(updatedClaims.data);
        } catch (err) {
            addToast('error', err.message);
        }
    };

    // Handle status update
    const handleStatusUpdate = async (claimId, newStatus) => {
        try {
            await healthcareApiService.updateClaimStatus(claimId, newStatus);
            addToast('success', t('statusUpdated'));
            // Refresh claims list
            const updatedClaims = await healthcareApiService.getClaims({});
            setClaims(updatedClaims.data);
        } catch (err) {
            addToast('error', err.message);
        }
    };

    // Handle view details
    const handleViewDetails = (claim) => {
        setSelectedClaim(claim);
        setShowViewModal(true);
    };

    // Claims Queue Tab
    const ClaimsQueueTab = () => {
        const columns = [
            { key: 'claim_number', label: t('claimNumber'), sortable: true },
            { key: 'patient_name', label: t('patient'), sortable: true },
            { key: 'provider_name', label: t('provider'), sortable: true },
            { key: 'claim_type', label: t('type'), sortable: true },
            { key: 'billed_amount', label: t('amount'), sortable: true, format: (v) => formatCurrency(v) },
            { key: 'claim_status', label: t('status'), sortable: true },
            { key: 'submitted_at', label: t('submitted'), sortable: true, format: (v) => formatDate(v) }
        ];

        const statusOptions = [
            { value: 'all', label: t('all') },
            { value: 'submitted', label: t('submitted') },
            { value: 'approved', label: t('approved') },
            { value: 'denied', label: t('denied') },
            { value: 'paid', label: t('paid') }
        ];

        const statusColors = {
            submitted: 'warning',
            approved: 'success',
            denied: 'danger',
            paid: 'success'
        };

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-4">
                        <SearchBox
                            placeholder={t('searchClaims')}
                            value={searchQuery}
                            onChange={setSearchQuery}
                        />
                        <select
                            className="form-select"
                            value={filters.status}
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => setShowSubmitModal(true)}
                        icon="Plus"
                    >
                        {t('submitNewClaim')}
                    </Button>
                </div>

                <Card className="overflow-hidden">
                    <Table
                        columns={columns}
                        data={claims}
                        loading={loading}
                        emptyMessage={t('noClaimsFound')}
                        rowActions={(claim) => (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleViewDetails(claim)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title={t('viewDetails')}
                                >
                                    <Icons.Eye size={16} />
                                </button>
                                {['pending', 'submitted'].includes(claim.claim_status) && (
                                    <button
                                        onClick={() => handleStatusUpdate(claim.id, 'approved')}
                                        className="text-green-600 hover:text-green-800"
                                        title={t('approve')}
                                    >
                                        <Icons.Check size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                        onRowClick={(claim) => handleViewDetails(claim)}
                    />
                </Card>
            </div>
        );
    };

    // Prior Authorization Tab
    const PriorAuthTab = () => {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('priorAuthorization')}</h2>
                    <Button
                        variant="primary"
                        onClick={() => setShowSubmitModal(true)}
                        icon="Plus"
                    >
                        {t('newPriorAuth')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {claims.filter(c => c.request_type === 'prior_auth').map(claim => (
                        <Card
                            key={claim.id}
                            className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => handleViewDetails(claim)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium">{claim.claim_number}</h3>
                                <Badge variant={statusColors[claim.claim_status] || 'default'}>
                                    {t(claim.claim_status)}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{claim.patient_name}</p>
                            <p className="text-sm text-gray-600 mb-2">{claim.provider_name}</p>
                            <div className="text-sm">
                                <span className="font-medium">Service:</span> {claim.service_name}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // Eligibility Tab
    const EligibilityTab = () => {
        const [eligibilityForm, setEligibilityForm] = useState({
            patientId: '',
            serviceCodes: [],
            checkType: 'real_time'
        });

        const checkEligibility = async () => {
            try {
                const result = await healthcareApiService.checkEligibility(eligibilityForm);
                addToast('success', t('eligibilityChecked'));
                return result;
            } catch (err) {
                addToast('error', err.message);
            }
        };

        return (
            <div className="space-y-4">
                <Card>
                    <h3 className="text-lg font-semibold mb-4">{t('eligibilityCheck')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('patientId')}</label>
                            <Input
                                type="text"
                                placeholder={t('enterPatientId')}
                                value={eligibilityForm.patientId}
                                onChange={(e) => setEligibilityForm({...eligibilityForm, patientId: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('serviceCode')}</label>
                            <Input
                                type="text"
                                placeholder={t('enterServiceCode')}
                                value={eligibilityForm.serviceCodes[0] || ''}
                                onChange={(e) => setEligibilityForm({
                                    ...eligibilityForm,
                                    serviceCodes: [e.target.value]
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('checkType')}</label>
                            <select
                                className="form-select"
                                value={eligibilityForm.checkType}
                                onChange={(e) => setEligibilityForm({...eligibilityForm, checkType: e.target.value})}
                            >
                                <option value="real_time">{t('realTime')}</option>
                                <option value="pre_auth">{t('preAuth')}</option>
                                <option value="retroactive">{t('retroactive')}</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="primary"
                                onClick={checkEligibility}
                                icon="Search"
                            >
                                {t('checkEligibility')}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    // Analytics Tab
    const AnalyticsTab = () => {
        const [analytics, setAnalytics] = useState(null);
        const [loadingAnalytics, setLoadingAnalytics] = useState(false);

        useEffect(() => {
            const fetchAnalytics = async () => {
                setLoadingAnalytics(true);
                try {
                    const result = await healthcareApiService.getAnalytics();
                    setAnalytics(result);
                } catch (err) {
                    addToast('error', t('failedToLoadAnalytics'));
                } finally {
                    setLoadingAnalytics(false);
                }
            };
            fetchAnalytics();
        }, []);

        return (
            <div className="space-y-6">
                <h2 className="text-xl font-semibold">{t('healthcareAnalytics')}</h2>

                {loadingAnalytics ? (
                    <LoadingOverlay />
                ) : analytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <div className="text-sm text-gray-600 mb-1">{t('totalClaims')}</div>
                            <div className="text-3xl font-bold text-blue-600">
                                {analytics.metrics?.total_transactions || 0}
                            </div>
                        </Card>
                        <Card>
                            <div className="text-sm text-gray-600 mb-1">{t('approved')}</div>
                            <div className="text-3xl font-bold text-green-600">
                                {analytics.metrics?.accepted || 0}
                            </div>
                        </Card>
                        <Card>
                            <div className="text-sm text-gray-600 mb-1">{t('rejected')}</div>
                            <div className="text-3xl font-bold text-red-600">
                                {analytics.metrics?.rejected || 0}
                            </div>
                        </Card>
                        <Card>
                            <div className="text-sm text-gray-600 mb-1">{t('successRate')}</div>
                            <div className="text-3xl font-bold text-purple-600">
                                {((analytics.metrics?.success_rate || 0) * 100).toFixed(1)}%
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        {t('noAnalyticsData')}
                    </div>
                )}
            </div>
        );
    };

    // Settings Tab
    const SettingsTab = () => {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t('settings')}</h2>
                <Card>
                    <h3 className="font-medium mb-4">{t('facilitySettings')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('nphiesEndpoint')}</label>
                            <Input type="text" readOnly value="https://nphies.sa/api/v1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('mockMode')}</label>
                            <select className="form-select" defaultValue="disabled">
                                <option value="enabled">{t('enabled')}</option>
                                <option value="disabled">{t('disabled')}</option>
                            </select>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    // Get the current tab content
    const TabContent = () => {
        switch (activeTab) {
            case 'claimsQueue':
                return <ClaimsQueueTab />;
            case 'priorAuth':
                return <PriorAuthTab />;
            case 'eligibility':
                return <EligibilityTab />;
            case 'analytics':
                return <AnalyticsTab />;
            case 'settings':
                return <SettingsTab />;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('healthcareClaims')}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('claimsDescription')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="success">{t('connected')}</Badge>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-1" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icons[tab.icon] size={16} />
                                {tab.label}
                            </div>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TabContent />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Submit Claim Modal */}
            <ClaimSubmitModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onSubmit={handleSubmitClaim}
            />

            {/* View Claim Modal */}
            <ClaimViewModal
                isOpen={showViewModal}
                onClose={() => setShowViewModal(false)}
                claim={selectedClaim}
            />
        </div>
    );
};

// Claim Submit Modal Component
const ClaimSubmitModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        patientId: '',
        providerId: '',
        serviceCode: '',
        serviceDescription: '',
        billedAmount: 0,
        diagnosisCode: '',
        notes: ''
    });
    const { t } = useLanguage();
    const { addToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
            setFormData({
                patientId: '',
                providerId: '',
                serviceCode: '',
                serviceDescription: '',
                billedAmount: 0,
                diagnosisCode: '',
                notes: ''
            });
        } catch (err) {
            addToast('error', err.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('submitNewClaim')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('patientId')}</label>
                        <Input
                            required
                            placeholder="P123456"
                            value={formData.patientId}
                            onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('providerId')}</label>
                        <Input
                            required
                            placeholder="PROV123"
                            value={formData.providerId}
                            onChange={(e) => setFormData({...formData, providerId: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('serviceCode')}</label>
                        <Input
                            required
                            placeholder="99213"
                            value={formData.serviceCode}
                            onChange={(e) => setFormData({...formData, serviceCode: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('diagnosisCode')}</label>
                        <Input
                            placeholder="ICD-10"
                            value={formData.diagnosisCode}
                            onChange={(e) => setFormData({...formData, diagnosisCode: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">{t('serviceDescription')}</label>
                        <Input
                            required
                            placeholder={t('enterServiceDescription')}
                            value={formData.serviceDescription}
                            onChange={(e) => setFormData({...formData, serviceDescription: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('billedAmount')}</label>
                        <Input
                            type="number"
                            required
                            placeholder="100.00"
                            value={formData.billedAmount}
                            onChange={(e) => setFormData({...formData, billedAmount: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">{t('notes')}</label>
                        <textarea
                            className="form-input"
                            rows="3"
                            placeholder={t('enterNotes')}
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" variant="primary">
                        {t('submit')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// Claim View Modal Component
const ClaimViewModal = ({ isOpen, onClose, claim }) => {
    const { t } = useLanguage();

    if (!claim) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('claimDetails')} size="lg">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            {t('claimNumber')}
                        </label>
                        <p className="font-medium">{claim.claim_number || claim.claim_uuid}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            {t('status')}
                        </label>
                        <Badge variant={claim.claim_status === 'approved' ? 'success' : 'warning'}>
                            {t(claim.claim_status)}
                        </Badge>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            {t('patient')}
                        </label>
                        <p>{claim.patient_name || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            {t('provider')}
                        </label>
                        <p>{claim.provider_name || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            {t('type')}
                        </label>
                        <p>{t(claim.claim_type || 'professional')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            {t('amount')}
                        </label>
                        <p className="font-bold text-lg">{formatCurrency(claim.billed_amount)}</p>
                    </div>
                </div>

                {claim.approvals && claim.approvals.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">{t('approvals')}</h4>
                        {claim.approvals.map((approval, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <Badge variant={approval.approved ? 'success' : 'danger'}>
                                    {approval.approved ? t('approved') : t('denied')}
                                </Badge>
                                <span>{approval.comments}</span>
                                {approval.reviewed_at && (
                                    <span className="text-gray-500 text-xs">
                                        - {formatDate(approval.reviewed_at)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default HealthcareClaimsPage;