import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { toast } from 'react-toastify';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
// Ensure this file exists at resources/js/components/EditUserModal.jsx (Case Sensitive!)
import EditUserModal from '@/Components/EditUserModal'; 
import VerificationModal from '@/Components/VerificationModal';
import { CheckCircle, Clock, XCircle, Edit, HelpCircle, Loader2 } from 'lucide-react';
import {
    ResponsiveTable,
    ResponsiveTableBody,
    ResponsiveTableCell,
    ResponsiveTableEmpty,
    ResponsiveTableHead,
    ResponsiveTableHeaderCell,
    ResponsiveTableRow,
} from '@/Components/ResponsiveTable';

const roleBadgeClasses = {
    resident: 'bg-blue-50 text-blue-600 ring-blue-500/10',
    admin: 'bg-indigo-50 text-indigo-600 ring-indigo-500/10',
    super_admin: 'bg-red-50 text-red-600 ring-red-500/10',
};

const verificationBadgeClasses = {
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    unverified: 'bg-yellow-100 text-yellow-800',
    pending_verification: 'bg-blue-100 text-blue-800',
};

const LoadingSpinner = () => (
    <div className="flex items-center space-x-2 text-blue-500">
        <Loader2 className="animate-spin h-4 w-4" />
        <span className="text-xs">Updating...</span>
    </div>
);

const VerificationStatusBadge = ({ status }) => {
    const baseClasses = 'px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full capitalize';
    const statusClass = verificationBadgeClasses[status] || 'bg-gray-100 text-gray-800';

    const getIcon = () => {
        switch (status) {
            case 'verified': return <CheckCircle size={14} className="mr-1.5 flex-shrink-0" />;
            case 'pending_verification':
            case 'unverified': return <Clock size={14} className="mr-1.5 flex-shrink-0" />;
            case 'rejected': return <XCircle size={14} className="mr-1.5 flex-shrink-0" />;
            default: return null;
        }
    };

    return (
        <span className={`${baseClasses} ${statusClass}`}>
            {getIcon()}
            {status.replace('_', ' ')}
        </span>
    );
};

const UserLocation = ({ user }) => {
    const barangay = user.barangay?.name || user.profile?.barangay;
    const city = user.profile?.city;
    const province = user.profile?.province;

    if (!barangay && !city && !province) {
        return <span className="text-gray-400">Not set</span>;
    }

    return (
        <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{barangay || 'No barangay'}</div>
            {(city || province) && (
                <div className="text-xs text-gray-500 truncate">
                    {[city, province].filter(Boolean).join(', ')}
                </div>
            )}
        </div>
    );
};

export default function UserManagement({ auth, users: initialUsers, filters }) {
    const { flash } = usePage().props;
    const [localUsers, setLocalUsers] = useState(initialUsers.data);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [reviewingUser, setReviewingUser] = useState(null);

    const [updatingUserRole, setUpdatingUserRole] = useState(null);
    const [updatingVerification, setUpdatingVerification] = useState(null);

    const [params, setParams] = useState({
        search: filters.search || '',
        role: filters.role || 'all',
        status: filters.status || 'all',
        sortBy: filters.sortBy || 'created_at',
        sortOrder: filters.sortOrder || 'desc',
    });

    // Helper to check permissions (Admin OR Super Admin)
    const hasWriteAccess = ['admin', 'super_admin'].includes(auth.user.role);

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
                { element: '#user-management-header', popover: { title: 'User Management', description: 'This is where you can view and manage all user accounts.' } },
                { element: '#user-search-filter', popover: { title: 'Search & Filter', description: 'Use these fields to search for specific users or filter by their role.' } },
                { element: '#user-status-toggles', popover: { title: 'Verification Status', description: 'Quickly filter users based on their verification status.' } },
                { element: '#user-table', popover: { title: 'User List', description: 'This table shows all user details. You can change roles, review verification, and edit user info here.' } },
                { element: '#user-pagination', popover: { title: 'Pagination', description: 'Use these controls to navigate through pages of users.' } }
            ]
        });
        driverObj.drive();
    };

    useEffect(() => {
        setLocalUsers(initialUsers.data);
    }, [initialUsers.data]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.get(route('superadmin.users.index'), params, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(timeout);
    }, [params]);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleOpenEditModal = (user) => { setEditingUser(user); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setEditingUser(null); setIsEditModalOpen(false); };
    const handleOpenVerificationModal = (user) => { setReviewingUser(user); setIsVerificationModalOpen(true); };
    const handleCloseVerificationModal = () => { setReviewingUser(null); setIsVerificationModalOpen(false); };

    const handleRoleChange = (e, user) => {
        const newRole = e.target.value;
        setUpdatingUserRole(user.id);
        router.patch(route('superadmin.users.updateRole', { user: user.id }), { role: newRole }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`Role updated for ${user.full_name}.`),
            onError: (errors) => toast.error(errors.role || 'Failed to update user role.'),
            onFinish: () => setUpdatingUserRole(null),
        });
    };

    const handleVerificationChange = (user, newStatus) => {
        setUpdatingVerification(user.id);
        router.patch(route('superadmin.users.verify', { user: user.id }), { verification_status: newStatus }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Verification status updated for ${user.full_name}.`);
                handleCloseVerificationModal();
            },
            onError: (errors) => toast.error(errors.verification_status || 'Failed to update status.'),
            onFinish: () => setUpdatingVerification(null),
        });
    };

    const handleQueryChange = (key, value) => {
        setParams(prevParams => ({ ...prevParams, [key]: value, page: 1 }));
    };

    const handleSort = (column) => {
        const newSortOrder = (params.sortBy === column && params.sortOrder === 'asc') ? 'desc' : 'asc';
        setParams(prevParams => ({ ...prevParams, sortBy: column, sortOrder: newSortOrder, page: 1 }));
    };

    const Toggles = [
        { key: 'all', label: 'All Users' },
        { key: 'verified', label: 'Verified' },
        { key: 'unverified', label: 'Unverified' },
    ];

    return (
        <>
            <AuthenticatedLayout user={auth.user}>
                <Head title="User Management" />

                {editingUser && <EditUserModal user={editingUser} isOpen={isEditModalOpen} onClose={handleCloseEditModal} />}
                {reviewingUser && <VerificationModal user={reviewingUser} isOpen={isVerificationModalOpen} onClose={handleCloseVerificationModal} onVerify={handleVerificationChange} onReject={handleVerificationChange} isUpdating={!!updatingVerification} />}

                <div className="py-12 bg-slate-50 min-h-screen font-sans antialiased">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200">
                            <div id="user-management-header" className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Manage Users</h3>
                                    <p className="mt-1 text-gray-500 text-sm">View and manage all registered accounts, roles, and user details.</p>
                                </div>
                                <div id="user-search-filter" className="flex items-center gap-2 w-full md:w-auto">
                                    <input type="text" placeholder="Search..." value={params.search} onChange={(e) => handleQueryChange('search', e.target.value)} className="block w-full sm:w-52 rounded-md border-gray-300 py-2 text-sm focus:border-blue-500 focus:ring-blue-500" />
                                    <select value={params.role} onChange={(e) => handleQueryChange('role', e.target.value)} className="block w-36 rounded-md border-gray-300 py-2 text-sm focus:border-blue-500 focus:ring-blue-500">
                                        <option value="all">All Roles</option>
                                        <option value="resident">Resident</option>
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                      <button
                                        onClick={startTour}
                                        className="flex items-center gap-1 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        aria-label="Start tour"
                                    >
                                        <HelpCircle size={20} />
                                        <span className="hidden sm:inline text-xs">Need Help?</span>
                                    </button>
                                </div>
                            </div>

                            <div id="user-status-toggles" className="p-4 px-6 border-b border-gray-200">
                                <div className="p-1 inline-flex space-x-1 bg-gray-100 rounded-lg">
                                    {Toggles.map(toggle => (
                                        <button key={toggle.key} onClick={() => handleQueryChange('status', toggle.key)}
                                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 ${params.status === toggle.key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                                            {toggle.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div id="user-table" className="p-4 md:p-0">
                                <ResponsiveTable>
                                    <ResponsiveTableHead>
                                        <tr>
                                            <ResponsiveTableHeaderCell onClick={() => handleSort('full_name')} className="py-4 cursor-pointer hover:bg-blue-700">Name</ResponsiveTableHeaderCell>
                                            <ResponsiveTableHeaderCell onClick={() => handleSort('email')} className="py-4 cursor-pointer hover:bg-blue-700">Email</ResponsiveTableHeaderCell>
                                            <ResponsiveTableHeaderCell className="py-4">Barangay</ResponsiveTableHeaderCell>
                                            <ResponsiveTableHeaderCell className="py-4">Role</ResponsiveTableHeaderCell>
                                            <ResponsiveTableHeaderCell onClick={() => handleSort('created_at')} className="py-4 cursor-pointer hover:bg-blue-700">Registered On</ResponsiveTableHeaderCell>
                                            <ResponsiveTableHeaderCell className="py-4">Verification</ResponsiveTableHeaderCell>
                                            {/* Show Actions header for Admin AND Super Admin */}
                                            {hasWriteAccess && (
                                                <ResponsiveTableHeaderCell className="py-4 text-center">Actions</ResponsiveTableHeaderCell>
                                            )}
                                        </tr>
                                    </ResponsiveTableHead>
                                    <ResponsiveTableBody className="md:bg-white">
                                        {localUsers.length > 0 ? (
                                            localUsers.map((user) => (
                                                <ResponsiveTableRow key={user.id} className="odd:bg-white even:bg-slate-100 hover:bg-sky-50 dark:odd:bg-gray-800 dark:even:bg-gray-900/50 dark:hover:bg-sky-900/20">
                                                    <ResponsiveTableCell label="Name" nowrap className="font-medium text-gray-900">{user.full_name}</ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Email" nowrap className="text-gray-600">{user.email}</ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Barangay" nowrap className="text-gray-600"><UserLocation user={user} /></ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Role" nowrap>
                                                        {updatingUserRole === user.id ? <LoadingSpinner /> : (
                                                            <>
                                                                {/* Super Admin can change roles for non-super-admins */}
                                                                {auth.user.role === 'super_admin' ? (
                                                                    <select 
                                                                        value={user.role} 
                                                                        onChange={(e) => handleRoleChange(e, user)} 
                                                                        className={`block w-auto rounded-md px-3 py-1 text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer ${roleBadgeClasses[user.role]}`} 
                                                                        disabled={user.id === auth.user.id || user.role === 'super_admin'}
                                                                    >
                                                                        <option value="resident">Resident</option>
                                                                        <option value="admin">Admin</option>
                                                                    </select>
                                                                ) : (
                                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${roleBadgeClasses[user.role]}`}>
                                                                        {user.role}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Registered On" nowrap className="text-gray-600">{new Date(user.created_at).toLocaleDateString()}</ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Verification" nowrap><VerificationStatusBadge status={user.verification_status} /></ResponsiveTableCell>
                                                    
                                                    {/* Actions cell for Admin AND Super Admin */}
                                                    {hasWriteAccess && (
                                                        <ResponsiveTableCell label="Actions" nowrap className="font-medium" contentClassName="flex justify-end">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <button 
                                                                    onClick={() => handleOpenVerificationModal(user)} 
                                                                    className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-md hover:bg-yellow-600 transition-colors shadow-sm disabled:opacity-50"
                                                                    disabled={updatingVerification === user.id}
                                                                >
                                                                    Review
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleOpenEditModal(user)} 
                                                                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                                                                >
                                                                    <Edit size={12} className="mr-1"/> Edit
                                                                </button>
                                                            </div>
                                                        </ResponsiveTableCell>
                                                    )}
                                                </ResponsiveTableRow>
                                            ))
                                        ) : (
                                            <ResponsiveTableEmpty colSpan={hasWriteAccess ? 7 : 6} className="bg-gray-50">
                                                <div className="flex flex-col items-center justify-center">
                                                    <HelpCircle className="h-12 w-12 text-gray-300 mb-2" />
                                                    <p className="text-lg font-medium text-gray-900">No users found</p>
                                                    <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                                                </div>
                                            </ResponsiveTableEmpty>
                                        )}
                                    </ResponsiveTableBody>
                                </ResponsiveTable>
                            </div>

                            <div id="user-pagination" className="p-6 flex justify-between items-center text-sm text-gray-600 border-t border-gray-200">
                                {initialUsers.total > 0 && (
                                    <>
                                        <div>Showing <span className="font-bold">{initialUsers.from}</span> to <span className="font-bold">{initialUsers.to}</span> of <span className="font-bold">{initialUsers.total}</span> results</div>
                                        {initialUsers.links && initialUsers.total > initialUsers.per_page && (
                                            <div className="flex flex-wrap gap-1">
                                                {initialUsers.links.map((link, index) => (
                                                    link.url ? (
                                                        <Link key={index} href={link.url} preserveState className={`px-3 py-1 rounded-md transition border ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                                    ) : (
                                                        <span key={index} className="px-3 py-1 rounded-md text-gray-400 border border-gray-200 bg-gray-50" dangerouslySetInnerHTML={{ __html: link.label }} />
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
