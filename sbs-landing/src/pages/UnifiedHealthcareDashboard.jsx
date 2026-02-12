import React, { useState, useEffect } from 'react';
import { Icons, Button, Card, Grid, StatsCard, Table, Badge, Modal, LoadingOverlay, Alert } from '../components/ui';
import { healthcareApiService } from '../services/healthcareApiService';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { formatDate, formatCurrency } from '../utils/helpers';

export const UnifiedHealthcareDashboard = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showQuickAction, setShowQuickAction] = useState(false);

    // Determine user role
    const getUserRole = () => {
        if (user?.role) return user.role;
        return 'provider'; // Default for demo
    };

    const userRole = getUserRole();

    useEffect(() => {
        fetchDashboardData();
    }, [userRole]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const data = await healthcareApiService.getDashboard(userRole);
            setDashboardData(data);
        } catch (err) {
            setError(err.message);
            addToast('error', t('failedToLoadDashboard'));
        } finally {
            setLoading(false);
        }
    };

    // Get statistics based on role
    const getRoleSpecificStats = () => {
        if (!dashboardData?.stats) return [];

        const stats = [];

        switch (userRole) {
            case 'patient':
                stats.push(
                    { label: t('totalRequests'), value: dashboardData.stats.total_requests || 0, icon: 'ClipboardList', color: 'blue' },
                    { label: t('approved'), value: dashboardData.stats.approved || 0, icon: 'CheckCircle', color: 'green' },
                    { label: t('denied'), value: dashboardData.stats.denied || 0, icon: 'XCircle', color: 'red' }
                );
                break;

            case 'provider':
                stats.push(
                    { label: t('totalRequests'), value: dashboardData.stats.total_requests || 0, icon: 'ClipboardList', color: 'blue' },
                    { label: t('patientsCount'), value: dashboardData.stats.patients_count || 0, icon: 'Users', color: 'purple' },
                    { label: t('pendingReview'), value: dashboardData.stats.pending || 0, icon: 'Clock', color: 'yellow' }
                );
                break;

            case 'payer':
                stats.push(
                    { label: t('pendingRequests'), value: dashboardData.stats.total_requests || 0, icon: 'Inbox', color: 'blue' },
                    { label: t('approved'), value: dashboardData.stats.approved || 0, icon: 'CheckCircle', color: 'green' },
                    { label: t('paidClaims'), value: dashboardData.stats.paid || 0, icon: 'DollarSign', color: 'orange' }
                );
                break;

            case 'admin':
                stats.push(
                    { label: t('totalRequests'), value: dashboardData.stats.total_requests || 0, icon: 'ClipboardList', color: 'blue' },
                    { label: t('totalPatients'), value: dashboardData.stats.total_patients || 0, icon: 'Users', color: 'purple' },
                    { label: t('totalProviders'), value: dashboardData.stats.total_providers || 0, icon: 'Hospital', color: 'green' },
                    { label: t('totalPayers'), value: dashboardData.stats.total_payers || 0, icon: 'Building', color: 'orange' }
                );
                break;
        }

        return stats;
    };

    const renderQuickActions = () => {
        const actions = [];

        if (userRole === 'provider') {
            actions.push(
                { label: t('submitClaim'), icon: 'FilePlus', color: 'primary', action: () => window.location.href = '/healthcare-claims?tab=priorAuth' },
                { label: t('checkEligibility'), icon: 'Search', color: 'secondary', action: () => window.location.href = '/healthcare-claims?tab=eligibility' },
                { label: t('viewClaims'), icon: 'ClipboardList', color: 'secondary', action: () => window.location.href = '/healthcare-claims?tab=claimsQueue' }
            );
        } else if (userRole === 'payer') {
            actions.push(
                { label: t('reviewClaims'), icon: 'Review', color: 'primary', action: () => window.location.href = '/healthcare-claims?tab=claimsQueue' },
                { label: t('viewAnalytics'), icon: 'BarChart', color: 'secondary', action: () => window.location.href = '/healthcare-claims?tab=analytics' }
            );
        } else if (userRole === 'patient') {
            actions.push(
                { label: t('viewMyClaims'), icon: 'ClipboardList', color: 'primary', action: () => window.location.href = '/healthcare-claims?tab=claimsQueue' },
                { label: t('checkCoverage'), icon: 'Shield', color: 'secondary', action: () => window.location.href = '/healthcare-claims?tab=eligibility' }
            );
        } else if (userRole === 'admin') {
            actions.push(
                { label: t('viewAnalytics'), icon: 'BarChart', color: 'primary', action: () => window.location.href = '/healthcare-claims?tab=analytics' },
                { label: t('manageSettings'), icon: 'Settings', color: 'secondary', action: () => window.location.href = '/healthcare-claims?tab=settings' },
                { label: t('viewAllClaims'), icon: 'ClipboardList', color: 'secondary', action: () => window.location.href = '/healthcare-claims?tab=claimsQueue' }
            );
        }

        return (
            <div className="flex flex-wrap gap-3 mt-6">
                {actions.map((action, index) => (
                    <Button
                        key={index}
                        variant={action.color}
                        onClick={action.action}
                        icon={action.icon}
                    >
                        {action.label}
                    </Button>
                ))}
            </div>
        );
    };

    const RecentRequestsTable = () => {
        if (!dashboardData?.recent_requests?.length) {
            return (
                <div className="text-center py-8 text-gray-500">
                    {t('noRecentRequests')}
                </div>
            );
        }

        const columns = [
            { key: 'request_id', label: t('reference'), sortable: true },
            { key: 'request_type', label: t('type'), sortable: true },
            { key: 'status', label: t('status'), sortable: true },
            { key: 'submitted_at', label: t('submitted'), sortable: true }
        ];

        const formatDateWithFallback = (date) => formatDate(date) || 'N/A';

        return (
            <Table
                columns={columns}
                data={dashboardData.recent_requests}
                loading={loading}
                emptyMessage={t('noRecentRequests')}
                renderCell={(column, row) => {
                    if (column.key === 'status') {
                        const statusColors = {
                            submitted: 'warning',
                            under_review: 'info',
                            approved: 'success',
                            denied: 'danger',
                            in_progress: 'info'
                        };
                        return (
                            <Badge variant={statusColors[row.status] || 'default'}>
                                {t(row.status)}
                            </Badge>
                        );
                    }
                    if (column.key === 'submitted_at') {
                        return formatDateWithFallback(row.submitted_at);
                    }
                    return row[column.key];
                }}
            />
        );
    };

    const FacilitiesPanel = () => {
        if (userRole !== 'admin' || !dashboardData?.facilities?.length) return null;

        return (
            <Card className="mt-6">
                <h3 className="text-lg font-semibold mb-4">{t('topFacilities')}</h3>
                <div className="space-y-3">
                    {dashboardData.facilities.map((facility, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{facility.facility_name}</span>
                            <div className="flex gap-4 text-sm">
                                <span className="text-gray-600">
                                    {t('requests')}: {facility.request_count}
                                </span>
                                <span className="text-green-600">
                                    {t('approved')}: {facility.approved_count}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    const RoleWelcomeMessage = () => {
        const welcomeMessages = {
            patient: t('patientWelcome'),
            provider: t('providerWelcome'),
            payer: t('payerWelcome'),
            admin: t('adminWelcome')
        };

        return (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-6">
                <h2 className="text-xl font-bold mb-2">
                    {welcomeMessages[userRole] || t('welcome')}
                </h2>
                <p className="text-blue-100">
                    {t(`${userRole}DashboardDescription`)}
                </p>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('healthcareDashboard')}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('healthcareDashboardDesc')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="success">{t('connected')}</Badge>
                    <Badge variant="default">{t(userRole)}</Badge>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading State */}
            {loading && <LoadingOverlay />}

            {/* Dashboard Content */}
            {!loading && dashboardData && (
                <>
                    {/* Welcome Message */}
                    <RoleWelcomeMessage />

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {getRoleSpecificStats().map((stat, index) => (
                            <StatsCard
                                key={index}
                                label={stat.label}
                                value={stat.value}
                                icon={stat.icon}
                                color={stat.color}
                                trend={stat.trend}
                            />
                        ))}
                    </div>

                    {/* Recent Requests */}
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{t('recentRequests')}</h3>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/healthcare-claims?tab=claimsQueue'}
                            >
                                {t('viewAll')}
                            </Button>
                        </div>
                        <RecentRequestsTable />
                    </Card>

                    {/* Facilities Panel (Admin only) */}
                    <FacilitiesPanel />

                    {/* Quick Actions */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-4">{t('quickActions')}</h3>
                        {renderQuickActions()}
                    </Card>
                </>
            )}

            {/* Empty State */}
            {!loading && !dashboardData && !error && (
                <div className="text-center py-12">
                    <Icons.Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('noDataFound')}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {t('noDashboardData')}
                    </p>
                    <Button
                        variant="primary"
                        onClick={fetchDashboardData}
                        icon="RefreshCw"
                    >
                        {t('tryAgain')}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default UnifiedHealthcareDashboard;