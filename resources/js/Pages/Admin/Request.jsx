import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import Pagination from '@/Components/Pagination';
import { useDebounce } from 'use-debounce';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
    ResponsiveTable,
    ResponsiveTableBody,
    ResponsiveTableCell,
    ResponsiveTableEmpty,
    ResponsiveTableHead,
    ResponsiveTableHeaderCell,
    ResponsiveTableRow,
} from '@/Components/ResponsiveTable';

import {
    Eye,
    Download,
    Search,
    FileX2,
    LoaderCircle,
    CircleDollarSign,
    ReceiptText,
    HelpCircle,
    XCircle,
    Clock,
    Hourglass,
    ThumbsUp,
    Info,
    TicketCheck,
    CheckCircle2 // Restored Icon
} from 'lucide-react';

// --- Reusable Components ---

const Modal = ({ children, show, onClose, title, maxWidth = '4xl' }) => {
    useEffect(() => {
        const handleEsc = (event) => { if (event.keyCode === 27) onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!show) return null;
    const maxWidthClass = { '4xl': 'max-w-4xl', 'md': 'max-w-md' }[maxWidth];
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full ${maxWidthClass}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 leading-none text-2xl">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// --- IMPROVED STATUS BADGE ---
const StatusBadge = ({ status }) => {
    const statusConfig = {
        'Rejected': {
            badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
            icon: <XCircle className="h-4 w-4" />
        },
        'Claimed': {
            badgeClasses: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            icon: <CheckCircle2 className="h-4 w-4" />
        },
        'Processing': {
            badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            icon: <LoaderCircle className="h-4 w-4 animate-spin" />
        },
        'Pending': {
            badgeClasses: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            icon: <Clock className="h-4 w-4" />
        },
        'Waiting for Payment': {
            badgeClasses: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
            icon: <Hourglass className="h-4 w-4" />
        },
        'Ready to Pickup': {
            badgeClasses: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300',
            icon: <ThumbsUp className="h-4 w-4" />
        },
        'Place an Amount to Pay': {
            badgeClasses: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
            icon: <CircleDollarSign className="h-4 w-4" />
        },
        'default': {
           badgeClasses: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300',
            icon: <HelpCircle className="h-4 w-4" />
        }
    };
    const currentConfig = statusConfig[status] || statusConfig['default'];

    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-x-2 ${currentConfig.badgeClasses}`}>
            {currentConfig.icon}
            <span>{status || 'Unknown'}</span>
        </span>
    );
};

const ClaimByVoucherModal = ({ show, onClose, data, setData, post, processing, errors }) => {
    const submit = (e) => {
        e.preventDefault();
        post(route('admin.requests.claim-by-voucher'), {
            onSuccess: () => {
                onClose();
                toast.success('Document claimed successfully!');
            },
            onError: (errs) => {
                if (errs.voucher_code) {
                    toast.error(errs.voucher_code);
                }
            }
        });
    };

    return (
        <Modal show={show} onClose={onClose} title="Claim Document with Voucher" maxWidth="md">
            <form onSubmit={submit}>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter the resident's voucher code to mark the document as claimed.
                </p>
                <div>
                    <label htmlFor="voucher_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Voucher Code
                    </label>
                    <div className="mt-1">
                        <input
                            type="text"
                            name="voucher_code"
                            id="voucher_code"
                            value={data.voucher_code}
                            onChange={(e) => setData('voucher_code', e.target.value.toUpperCase())}
                            className="block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-900 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="VOUCHER-XXXXXXXX"
                            autoFocus
                            required
                        />
                    </div>
                    {errors.voucher_code && <p className="text-red-500 text-xs mt-2">{errors.voucher_code}</p>}
                </div>
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                        Cancel
                    </button>
                    <button type="submit" disabled={processing} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                        <TicketCheck size={16} />
                        Confirm Claim
                    </button>
                </div>
            </form>
        </Modal>
    );
};


// --- Main Page Component ---
export default function Request() {
    const { flash, documentRequests, filters } = usePage().props;

    // States for modals
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Other states
    const [previewContent, setPreviewContent] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const isInitialMount = useRef(true);

    const [filter, setFilter] = useState({
        search: filters.search || '',
        status: filters.status || 'All',
    });
    const [debouncedFilter] = useDebounce(filter, 300);

    // useForm hook for Reject and Payment modals
    const { data, setData, processing, errors, reset } = useForm({
        admin_remarks: '',
        payment_amount: '',
    });

    // useForm hook for the new Claim By Voucher modal
    const { data: claimData, setData: setClaimData, post: postClaim, processing: claimProcessing, errors: claimErrors, reset: resetClaim } = useForm({
        voucher_code: '',
    });

    const filterStatusOptions = ['All', 'Pending', 'Processing', 'Ready to Pickup'];
    const actionStatusOptions = ['Processing', 'Ready to Pickup', 'Rejected'];

    // --- REAL-TIME LISTENERS ---
    useEffect(() => {
        if (window.Echo) {
            const channel = window.Echo.private('admin-requests');
            const reloadOptions = {
                preserveState: true,
                preserveScroll: true,
                only: ['documentRequests'],
            };

            channel.listen('.NewDocumentRequest', (event) => {
                toast.success(`New request from ${event.request.user.full_name}! Refreshing list...`);
                router.reload(reloadOptions);
            });

            channel.listen('.StatusUpdated', (event) => {
                toast((t) => (
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        <span>Request for {event.request.user.full_name} was updated.</span>
                    </div>
                ));
                router.reload(reloadOptions);
            });

            return () => {
                channel.stopListening('.NewDocumentRequest');
                channel.stopListening('.StatusUpdated');
                window.Echo.leave('admin-requests');
            };
        }
    }, []);
    
    // Tour Guide
    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            popoverClass: 'driverjs-theme',
            steps: [
                { element: '#header-section', popover: { title: 'Manage Requests', description: 'This is the main header. You can find the title and action buttons here.' } },
                { element: '#claim-voucher-btn', popover: { title: 'Claim with Voucher', description: 'Click this to quickly mark a document as claimed by entering its unique voucher code.' } },
                { element: '#search-input', popover: { title: 'Search', description: 'Quickly find a specific request by typing the resident\'s name or the document type.' } },
                { element: '#status-filter-tabs', popover: { title: 'Filter by Status', description: 'Click these buttons to filter the list and see only the requests with that status.' } },
                { element: '#requests-list-container', popover: { title: 'Requests List', description: 'This area shows all the active requests. On mobile, it appears as cards, and on desktop, as a table.' } },
                { element: '#actions-items', popover: { title: 'Actions', description: 'Use this dropdown to change the status of a request. Selecting "Claimed" or "Rejected" will archive the request.' } },
                { element: '#pagination-section', popover: { title: 'Pagination', description: 'Use these controls to navigate between different pages of requests.' } }
            ]
        });
        driverObj.drive();
    };

    // --- useEffect Hooks ---
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        router.get(route('admin.request'), debouncedFilter, {
            preserveState: true,
            replace: true,
        });
    }, [debouncedFilter]);


    // --- Handlers ---
    const openRejectModal = (request) => {
        setSelectedRequest(request);
        reset('admin_remarks');
        setShowRejectModal(true);
    };

    const handleStatusChange = (request, newStatus) => {
        if (newStatus === 'Rejected') {
            openRejectModal(request);
            return;
        }
        router.post(route('admin.requests.status.update', request.id), {
            _method: 'PATCH', // <-- Add this line
            status: newStatus
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(`Request status updated to "${newStatus}".`),
            onError: () => toast.error('Failed to update status.')
        });
    };

    const handleRejectSubmit = (e) => {
        e.preventDefault();
        router.patch(route('admin.requests.status.update', selectedRequest.id), {
            _method: 'PATCH',
            status: 'Rejected',
            admin_remarks: data.admin_remarks,
        }, {
            onSuccess: () => {
                setShowRejectModal(false);
                toast.success('Request has been rejected and archived.');
            },
            onError: (errs) => {
                if (errs.admin_remarks) {
                    toast.error(errs.admin_remarks);
                } else {
                    toast.error('Failed to reject the request. Please ensure a reason is provided.');
                }
            },
            preserveScroll: true,
        });
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        router.post(route('admin.requests.set-payment', selectedRequest.id), {
            payment_amount: data.payment_amount,
        }, {
            onSuccess: () => {
                setShowPaymentModal(false);
                toast.success('Payment amount set successfully!');
            },
            onError: (errs) => {
                if (errs.payment_amount) {
                    toast.error(errs.payment_amount);
                } else {
                    toast.error('Failed to set payment amount.');
                }
            },
            preserveScroll: true,
        });
    };

    const handlePreviewClick = async (request) => {
        setSelectedRequest(request);
        setShowPreviewModal(true);
        setIsPreviewLoading(true);
        try {
            const response = await axios.get(route('admin.requests.preview', request.id));
            setPreviewContent(response.data.html);
        } catch (error) {
            toast.error('Could not load preview.');
            setPreviewContent('<p class="text-red-500">Error loading document preview.</p>');
        } finally {
            setIsPreviewLoading(false);
        }
    };

   const renderActions = (request, index) => {
        const isBusinessPermit = request.document_type?.name === 'Brgy Business Permit';

        // Case 1: Business Permit is PENDING initial assessment.
        if (isBusinessPermit && request.status === 'Pending') {
            return (
                <button
                    onClick={() => {
                        setSelectedRequest(request);
                        reset('payment_amount'); // Ensure amount is clear for initial assessment
                        setShowPaymentModal(true);
                    }}
                    className="flex items-center gap-x-2 w-full justify-center md:w-auto px-3 py-1 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                >
                    <CircleDollarSign className="w-5 h-5" />
                    Place an Amount to Pay
                </button>
            );
        }

        // Case 2: Request is WAITING FOR PAYMENT and needs re-assessment.
        if (request.status === 'Waiting for Payment') {
            return (
                <button
                    onClick={() => {
                        setSelectedRequest(request);
                        // Pre-fill the form with the existing amount for re-assessment
                        setData('payment_amount', request.payment_amount || '');
                        setShowPaymentModal(true);
                    }}
                    className="flex items-center gap-x-2 w-full justify-center md:w-auto px-3 py-1 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                    <CircleDollarSign className="w-5 h-5" />
                    Re-assess Payment
                </button>
            );
        }

        // Default Case: For all other statuses, show the status change dropdown.
        return (
            <select
                id={index === 0 ? "actions-items" : undefined}
                value={request.status}
                onChange={(e) => handleStatusChange(request, e.target.value)}
                className="w-full text-xs border-gray-300 rounded-md py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                <option value={request.status} disabled>{request.status}</option>
                {actionStatusOptions.filter(status => status !== request.status).map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Document Requests" />
            <Toaster position="bottom-right" />
            <style>{`.driverjs-theme { background-color: #fff; color: #333; }`}</style>

            <div className="py-6 md:py-12 bg-slate-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 px-4">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-md sm:rounded-lg">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div id="header-section" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Manage Active Requests</h1>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View and process all ongoing document requests.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        id="claim-voucher-btn"
                                        onClick={() => {
                                            resetClaim();
                                            setShowClaimModal(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-transform hover:scale-105 shadow-sm text-sm"
                                    >
                                        <TicketCheck size={16} />
                                        Claim with Voucher
                                    </button>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                                        <input
                                            id="search-input"
                                            type="text"
                                            placeholder="Search name or document..."
                                            value={filter.search}
                                            onChange={e => setFilter({ ...filter, search: e.target.value })}
                                            className="block w-full md:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={startTour}
                                        className="flex items-center gap-1 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        aria-label="Start tour"
                                    >
                                        <HelpCircle className="h-5 w-5" />
                                        <span className="hidden sm:inline text-xs">Need Help?</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="status-filter-tabs" className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {filterStatusOptions.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilter({ ...filter, status })}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter.status === status ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div id="requests-list-container" className="p-4 md:p-0">
                            <ResponsiveTable>
                                <ResponsiveTableHead>
                                    <tr>
                                        <ResponsiveTableHeaderCell>Requestor</ResponsiveTableHeaderCell>
                                        <ResponsiveTableHeaderCell>Document</ResponsiveTableHeaderCell>
                                        <ResponsiveTableHeaderCell>Status</ResponsiveTableHeaderCell>
                                        <ResponsiveTableHeaderCell>Date</ResponsiveTableHeaderCell>
                                        <ResponsiveTableHeaderCell className="actions-column">Actions</ResponsiveTableHeaderCell>
                                    </tr>
                                </ResponsiveTableHead>
                                <ResponsiveTableBody className="md:bg-white md:dark:bg-gray-800 md:divide-y md:divide-gray-200 md:dark:divide-gray-700">
                                    {(documentRequests.data && documentRequests.data.length > 0) ? documentRequests.data.map((request, index) => (
                                        <ResponsiveTableRow key={request.id} className="odd:bg-white even:bg-slate-100 hover:bg-sky-100 dark:odd:bg-gray-800 dark:even:bg-gray-900/50 dark:hover:bg-sky-900/20">
                                            <ResponsiveTableCell label="Requestor" nowrap className="font-medium text-gray-900 dark:text-white">
                                                {request.user?.full_name || "N/A"}
                                            </ResponsiveTableCell>
                                            <ResponsiveTableCell label="Document" nowrap className="text-gray-500 dark:text-gray-300">
                                                {request.document_type?.name || "N/A"}
                                            </ResponsiveTableCell>
                                            <ResponsiveTableCell label="Status" nowrap>
                                                <StatusBadge status={request.status} />
                                            </ResponsiveTableCell>
                                            <ResponsiveTableCell label="Date" nowrap className="text-gray-500 dark:text-gray-300">
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </ResponsiveTableCell>
                                            <ResponsiveTableCell label="Actions" nowrap className={index === 0 ? 'actions-column-item' : ''} contentClassName="flex justify-end">
                                                <div id={index === 0 ? "actions-items" : undefined} className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center">
                                                    {renderActions(request, index)}
                                                    {request.payment_receipt_url && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedRequest(request);
                                                                setShowReceiptModal(true);
                                                            }}
                                                            title="View Payment Receipt"
                                                            className="inline-flex items-center justify-center rounded-md p-2 text-blue-600 transition hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-700"
                                                        >
                                                            <ReceiptText />
                                                        </button>
                                                    )}
                                                    {request.status === 'Processing' && (
                                                        <a href={route('admin.requests.generate', request.id)} title="Generate" className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                                                            <Download />
                                                        </a>
                                                    )}
                                                </div>
                                            </ResponsiveTableCell>
                                        </ResponsiveTableRow>
                                    )) : (
                                        <ResponsiveTableEmpty colSpan="5">
                                            <FileX2 className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No active requests found</h3>
                                            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
                                        </ResponsiveTableEmpty>
                                    )}
                                </ResponsiveTableBody>
                            </ResponsiveTable>
                        </div>
                        {documentRequests.data.length > 0 && (
                            <div id="pagination-section" className="p-4 border-t dark:border-gray-700">
                                <Pagination
                                    links={documentRequests.links}
                                    from={documentRequests.from}
                                    to={documentRequests.to}
                                    total={documentRequests.total}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Modals Section --- */}
            <ClaimByVoucherModal
                show={showClaimModal}
                onClose={() => setShowClaimModal(false)}
                data={claimData}
                setData={setClaimData}
                post={postClaim}
                processing={claimProcessing}
                errors={claimErrors}
            />

            <Modal show={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Document Request" maxWidth="md">
                <form onSubmit={handleRejectSubmit}>
                    <div className="mb-4">
                        <label htmlFor="admin_remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Rejection</label>
                        <textarea
                            id="admin_remarks"
                            value={data.admin_remarks}
                            onChange={(e) => setData('admin_remarks', e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm dark:bg-slate-900 dark:border-slate-600"
                            rows="4"
                            required>
                        </textarea>
                        {errors.admin_remarks && <p className="text-red-500 text-xs mt-1">{errors.admin_remarks}</p>}
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button type="button" onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={processing} className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">Confirm Rejection</button>
                    </div>
                </form>
            </Modal>

            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Set Payment Amount" maxWidth="md">
                <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Request Details</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Requestor:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{selectedRequest?.user?.full_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Business Name:</span>
                            <span className="font-medium text-gray-900 dark:text-white text-right">{selectedRequest?.form_data?.business_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Business Type:</span>
                            <span className="font-medium text-gray-900 dark:text-white text-right">{selectedRequest?.form_data?.business_type || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-gray-500 dark:text-gray-400">Business Address:</span>
                            <span className="font-medium text-gray-900 dark:text-white mt-1 text-right">{selectedRequest?.form_data?.business_address || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handlePaymentSubmit}>
                    <div className="mb-4">
                        <label htmlFor="payment_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Enter Assessed Amount (PHP)
                        </label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">₱</span>
                            </div>
                            <input
                                id="payment_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.payment_amount}
                                onChange={(e) => setData('payment_amount', e.target.value)}
                                className="block w-full rounded-md border-gray-300 pl-7 pr-3 py-2 shadow-sm dark:bg-gray-900 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="0.00"
                                autoFocus
                                required
                            />
                        </div>
                        {errors.payment_amount && <p className="text-red-500 text-xs mt-1">{errors.payment_amount}</p>}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={processing} className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                            {processing ? 'Saving...' : 'Set Amount & Notify User'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={showReceiptModal} onClose={() => setShowReceiptModal(false)} title="Payment Receipt" maxWidth="md">
                {selectedRequest?.payment_receipt_url ? (
                    <div>
                        <img
                            src={selectedRequest.payment_receipt_url}
                            alt="Payment Receipt"
                            className="w-full h-auto rounded-lg border dark:border-gray-600"
                        />
                        <div className="text-center mt-4">
                            <a
                                href={selectedRequest.payment_receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Open image in new tab
                            </a>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">Receipt image could not be loaded or is not available.</p>
                )}
            </Modal>

            <Modal show={showPreviewModal} onClose={() => setShowPreviewModal(false)} title={`Preview: ${selectedRequest?.document_type?.name || ''}`}>
                <div className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 rounded-lg max-h-[75vh] overflow-y-auto">
                    {isPreviewLoading ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            {/* You might need to define a LoadingSpinner component */}
                            <LoaderCircle className="animate-spin h-10 w-10 text-blue-600" />
                        </div>
                    ) : (
                        <div className="document-preview-container" dangerouslySetInnerHTML={{ __html: previewContent }} />
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
