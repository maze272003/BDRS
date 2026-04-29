import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import Pagination from '@/Components/Pagination';
import Footer from '@/Components/Residents/Footer';
import { toast } from 'react-hot-toast';
import { 
    FileText, History, Info, X, UploadCloud, CheckCircle2, 
    XCircle, Clock, LoaderCircle, ThumbsUp, Hourglass, HelpCircle, Ticket
} from 'lucide-react';
import clsx from 'clsx';

const StatusBadge = ({ status }) => {
    const statusConfig = {
        'Rejected': { badgeClasses: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: <XCircle className="h-4 w-4" /> },
        'Claimed': { badgeClasses: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: <CheckCircle2 className="h-4 w-4" /> },
        'Processing': { badgeClasses: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300', icon: <LoaderCircle className="h-4 w-4 animate-spin" /> },
        'Pending': { badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300', icon: <Clock className="h-4 w-4" /> },
        'Waiting for Payment': { badgeClasses: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300', icon: <Hourglass className="h-4 w-4" /> },
        'For Payment': { badgeClasses: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300', icon: <Hourglass className="h-4 w-4" /> },
        'Ready to Pickup': { badgeClasses: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300', icon: <ThumbsUp className="h-4 w-4" /> },
        'default': { badgeClasses: 'bg-slate-100 text-slate-800 dark:bg-slate-700/80 dark:text-slate-300', icon: <HelpCircle className="h-4 w-4" /> }
    };
    const currentConfig = statusConfig[status] || statusConfig['default'];

    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-x-2 ${currentConfig.badgeClasses}`}>
            {currentConfig.icon}
            <span>{status || 'Unknown'}</span>
        </span>
    );
};


const Modal = ({ children, show, onClose, title }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1.5 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const ClaimVoucherModal = ({ show, onClose, request }) => {
    if (!request) return null;
    const claimVoucherCode = request.claim_voucher_code || `LOADING...`;

    return (
        <Modal show={show} onClose={onClose} title="Claim Your Document">
            <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Present this voucher code to the barangay personnel to claim your document.
                </p>
                <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-widest">VOUCHER CODE</p>
                    <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-gray-200 tracking-wider">{claimVoucherCode}</p>
                </div>
    
                <div className="mt-6 text-left text-sm text-gray-800 dark:text-gray-200 space-y-2 border-t dark:border-slate-700 pt-4">
                    <p><strong>Requestor:</strong> {request.user?.name || 'N/A'}</p>
                    <p><strong>Document:</strong> {request.document_type?.name || 'N/A'}</p>
                </div>
            </div>
        </Modal>
    );
};

const RequestCard = ({ request, openPaymentModal, openVoucherModal, isPastRequest = false }) => {
    const needsPayment = !isPastRequest && request.document_type?.name === 'Brgy Business Permit' &&
                         (request.status === 'Waiting for Payment' || request.status === 'For Payment');

    return (
        <div className="bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm border dark:border-gray-700 rounded-xl transition-shadow hover:shadow-md">
            <div className="p-6 flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{request.document_type?.name || 'Unknown Document'}</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-11">
                        Requested on: {new Date(isPastRequest ? request.original_created_at : request.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                
                <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto md:min-w-[280px] shrink-0">
                    <StatusBadge status={request.status} />

                    {!isPastRequest && request.status === 'Ready to Pickup' && (
                         <button 
                            onClick={() => openVoucherModal(request)}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-lime-600 text-white font-semibold rounded-lg hover:bg-lime-700 transition-transform hover:scale-105 shadow-sm"
                        >
                            <Ticket size={16}/>
                            View Claim Voucher
                        </button>
                    )}
                    
                    {needsPayment && (
                        <div className="mt-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-center w-full border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-gray-600 dark:text-gray-300">Amount to Pay:</p>
                            <p className="font-bold text-3xl text-blue-800 dark:text-blue-300 my-1">
                                ₱{parseFloat(request.payment_amount).toFixed(2)}
                            </p>
                            <button 
                                onClick={() => openPaymentModal(request)}
                                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-transform hover:scale-105 shadow-sm"
                            >
                                <UploadCloud size={16}/>
                                Upload Receipt
                            </button>
                        </div>
                    )}

                     {isPastRequest && request.status === 'Rejected' && (
                         <div className="mt-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-left w-full border border-red-200 dark:border-red-800">
                             <p className="text-sm font-semibold text-red-800 dark:text-red-200">Reason for Rejection:</p>
                             <p className="text-sm text-red-700 dark:text-red-300 mt-1 italic">
                                 {request.admin_remarks || "No reason provided."}
                             </p>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const EmptyState = ({ icon, title, message, children }) => (
    <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800/30 rounded-lg border-2 border-dashed dark:border-gray-700">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {icon}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        {children && <div className="mt-6">{children}</div>}
    </div>
);

export default function MyRequests({ auth, activeRequests, pastRequests }) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [view, setView] = useState('active');

    const { data, setData, post, processing, errors, reset, progress } = useForm({
        receipt: null,
    });

    useEffect(() => {
        if (window.Echo) {
            const channel = window.Echo.private(`user-requests.${auth.user.id}`);
            const reloadOptions = {
                preserveState: true,
                preserveScroll: true,
                only: ['activeRequests', 'pastRequests'],
            };

            channel.listen('.StatusUpdated', (event) => {
                toast.success(`Your request status has been updated to "${event.request.status}"!`);
                router.reload(reloadOptions);
            });

            return () => {
                channel.stopListening('.StatusUpdated');
                window.Echo.leave(`user-requests.${auth.user.id}`);
            };
        }
    }, [auth.user.id]);

    const openPaymentModal = (request) => {
        setSelectedRequest(request);
        reset();
        setShowPaymentModal(true);
    };

    const openVoucherModal = (request) => {
        setSelectedRequest(request);
        setShowVoucherModal(true);
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        if (!data.receipt) return;
        post(route('residents.requests.submit-payment', selectedRequest.id), {
            onSuccess: () => setShowPaymentModal(false),
        });
    };

    const currentList = view === 'active' ? activeRequests.data : pastRequests.data;
    const paginationLinks = view === 'active' ? activeRequests.links : pastRequests.links;
    const totalRequests = view === 'active' ? activeRequests.total : pastRequests.total;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="My Document Requests" />

            <div className="py-12 bg-slate-50 dark:bg-slate-900/90 min-h-screen">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    <div className="px-4 sm:px-0">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">My Requests</h1>
                        <p className="mt-2 text-md text-gray-600 dark:text-gray-400">
                            Track your active document requests and view your completed or past requests.
                        </p>
                    </div>
                
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl">
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <nav className="flex -mb-px p-4" aria-label="Tabs">
                                <button
                                    onClick={() => setView('active')}
                                    className={clsx('flex items-center gap-2 shrink-0 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors', view === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50')}
                                >
                                    <FileText size={16} /> Active Requests
                                </button>
                                <button
                                    onClick={() => setView('past')}
                                    className={clsx('ml-2 flex items-center gap-2 shrink-0 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors', view === 'past' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50')}
                                >
                                    <History size={16} /> Past Requests
                                </button>
                            </nav>
                        </div>
                        
                        <div className="p-6">
                            {currentList.length > 0 ? (
                                <div className="space-y-6">
                                    {currentList.map(request => (
                                        <RequestCard 
                                            key={request.id} 
                                            request={request} 
                                            openPaymentModal={openPaymentModal}
                                            openVoucherModal={openVoucherModal}
                                            isPastRequest={view === 'past'}
                                        />
                                    ))}
                                </div>
                            ) : (
                                view === 'active' ? (
                                    <EmptyState icon={<Info size={24} />} title="No Active Requests" message="You currently have no ongoing document requests.">
                                        <Link href={route('residents.home')} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm">
                                            Request a Document
                                        </Link>
                                    </EmptyState>
                                ) : (
                                    <EmptyState icon={<History size={24} />} title="No Past Requests" message="Your history of completed or rejected requests will appear here." />
                                )
                            )}
                        </div>

                        {totalRequests > 0 && (
                            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                                <Pagination links={paginationLinks} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ClaimVoucherModal 
                show={showVoucherModal} 
                onClose={() => setShowVoucherModal(false)} 
                request={selectedRequest} 
            />

            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Submit Proof of Payment">
                 <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Payment Instructions</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                        <li>Scan the QR code below to pay the exact amount.</li>
                        <li>Take a screenshot of the successful transaction receipt.</li>
                        <li>Upload the screenshot in the form below.</li>
                    </ol>
                    <div className="text-sm space-y-3">
                        <div className="text-center my-2">
                            <img 
                                src="/images/gcash_qr_code.png" 
                                alt="GCash QR Code"
                                className="w-40 h-40 mx-auto rounded-lg border p-1 bg-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Scan to Pay</p>
                        </div>
                        <p className="text-center font-medium text-gray-700 dark:text-gray-200">
                            GCash Name: B. San Isidro Treasury<br/>
                            GCash Number: 0912-345-6789
                        </p>
                    </div>
                </div>
                <form onSubmit={handlePaymentSubmit}>
                    <div className="mb-4">
                        <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Upload Receipt Screenshot
                        </label>
                        <input
                            id="receipt"
                            type="file"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/40 dark:file:text-blue-300 dark:hover:file:bg-blue-900/60"
                            onChange={(e) => setData('receipt', e.target.files[0])}
                            accept="image/png, image/jpeg"
                            required
                        />
                        {progress && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress.percentage}%` }}></div>
                            </div>
                        )}
                        {errors.receipt && <p className="text-red-500 text-xs mt-2">{errors.receipt}</p>}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700 mt-6">
                        <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-semibold text-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing} className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm flex items-center gap-2">
                            {processing ? 'Uploading...' : 'Submit Payment'}
                        </button>
                    </div>
                </form>
            </Modal>
            <Footer />
        </AuthenticatedLayout>
    );
}
