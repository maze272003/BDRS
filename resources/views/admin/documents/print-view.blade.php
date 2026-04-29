<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Document Requests</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://unpkg.com/react-hot-toast@2.4.1/dist/react-hot-toast.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .lucide {
             stroke-width: 2;
        }
    </style>
</head>
<body class="bg-slate-50 dark:bg-gray-900">
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        const { Toaster, toast } = reactHotToast;

        // --- Mock Data (replaces Inertia's props) ---
        const MOCK_DATA = {
            documentRequests: {
                data: [
                    { id: 1, user: { full_name: 'Juan Dela Cruz' }, document_type: { name: 'Barangay Clearance' }, status: 'Processing', created_at: '2025-09-12T08:00:00.000Z', payment_receipt_url: 'https://placehold.co/400x600/png' },
                    { id: 2, user: { full_name: 'Maria Clara' }, document_type: { name: 'Certificate of Residency' }, status: 'Pending', created_at: '2025-09-12T09:30:00.000Z', payment_receipt_url: null },
                    { id: 3, user: { full_name: 'Jose Rizal' }, document_type: { name: 'Brgy Business Permit' }, status: 'Pending', created_at: '2025-09-11T14:00:00.000Z', payment_receipt_url: null, form_data: { business_name: 'PisoNet Central', business_type: 'Retail', business_address: '123 Rizal Ave, Baguio City' } },
                    { id: 4, user: { full_name: 'Andres Bonifacio' }, document_type: { name: 'Certificate of Indigency' }, status: 'Ready to Pickup', created_at: '2025-09-10T11:20:00.000Z', payment_receipt_url: null },
                    { id: 5, user: { full_name: 'Gabriela Silang' }, document_type: { name: 'Solo Parent Certificate' }, status: 'Waiting for Payment', created_at: '2025-09-09T16:45:00.000Z', payment_receipt_url: null },
                ],
                links: [],
                from: 1,
                to: 5,
                total: 5
            }
        };

        // --- Reusable Components ---
        const Icon = ({ name, className, size = 16 }) => {
            const IconComponent = lucide[name];
            return IconComponent ? <IconComponent className={`lucide ${className}`} size={size} /> : null;
        };

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
                            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1.5 leading-none text-2xl">&times;</button>
                        </div>
                        <div className="p-6">{children}</div>
                    </div>
                </div>
            );
        };

        const StatusBadge = ({ status }) => {
            const statusConfig = {
                'Rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: 'XCircle' },
                'Claimed': { bg: 'bg-green-100', text: 'text-green-800', icon: 'CheckCircle2' },
                'Processing': { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'LoaderCircle', animate: 'animate-spin' },
                'Pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'Clock' },
                'Waiting for Payment': { bg: 'bg-pink-100', text: 'text-pink-800', icon: 'Hourglass' },
                'Ready to Pickup': { bg: 'bg-lime-100', text: 'text-lime-800', icon: 'ThumbsUp' },
                'default': { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'HelpCircle' }
            };
            const config = statusConfig[status] || statusConfig['default'];
            return (
                <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-x-2 ${config.bg} ${config.text}`}>
                    <Icon name={config.icon} className={config.animate} size={14} />
                    <span>{status || 'Unknown'}</span>
                </span>
            );
        };

        const PrintModal = ({ show, onClose, documentRequest }) => {
            const [isPrinting, setIsPrinting] = useState(false);
            const handleGenerateAndPrint = () => {
                if (!documentRequest) return toast.error("No request selected.");
                setIsPrinting(true);
                toast.loading('Generating PDF...', { id: 'print-toast' });
                
                // In a real app, this URL is generated by Ziggy/Inertia `route()` function
                const generateUrl = `/admin/requests/${documentRequest.id}/generate`;
                const printWindow = window.open(generateUrl, '_blank');

                if (printWindow) {
                    toast.success('Your PDF will open in a new tab.', { id: 'print-toast', duration: 4000 });
                } else {
                    toast.error('Could not open new tab. Please disable pop-up blockers.', { id: 'print-toast', duration: 5000 });
                }
                setIsPrinting(false);
                onClose();
            };
            return (
                <Modal show={show} onClose={onClose} title="Generate and Print Document" maxWidth="md">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You are about to generate a PDF of the <strong>{documentRequest?.document_type?.name}</strong> for <strong>{documentRequest?.user?.full_name}</strong>.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            The document will open in a new browser tab where you can print it.
                        </p>
                        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancel</button>
                            <button onClick={handleGenerateAndPrint} disabled={isPrinting} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                <Icon name="Printer" size={16} />{isPrinting ? 'Generating...' : 'Confirm & Print'}
                            </button>
                        </div>
                    </div>
                </Modal>
            );
        };
        
        // Main App Component
        function App() {
            const [requests, setRequests] = useState(MOCK_DATA.documentRequests.data);
            const [selectedRequest, setSelectedRequest] = useState(null);
            const [showPrintModal, setShowPrintModal] = useState(false);
            
            useEffect(() => {
                lucide.createIcons();
            }, [requests]);

            const handlePrintClick = (request) => {
                setSelectedRequest(request);
                setShowPrintModal(true);
            };
            
            const handleStatusChange = (requestId, newStatus) => {
                toast.success(`Request #${requestId} status updated to ${newStatus}.`);
                // Simulate API update
                setRequests(prev => prev.map(req => req.id === requestId ? {...req, status: newStatus} : req));
            }

            return (
                <div>
                    <Toaster position="bottom-right" />
                    <div className="py-6 md:py-12">
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 px-4">
                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-md sm:rounded-lg">
                                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Manage Active Requests</h1>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View, process, and print ongoing document requests as PDFs.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-blue-600/90 text-white dark:bg-blue-800/50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase">Requestor</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase">Document</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {requests.map((request) => (
                                                <tr key={request.id} className="odd:bg-white even:bg-slate-50 hover:bg-sky-100 dark:odd:bg-gray-800 dark:even:bg-gray-900/50 dark:hover:bg-sky-900/20">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{request.user.full_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{request.document_type.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={request.status} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(request.created_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <select value={request.status} onChange={(e) => handleStatusChange(request.id, e.target.value)} className="w-full text-xs border-gray-300 rounded-md py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500">
                                                                <option value={request.status} disabled>{request.status}</option>
                                                                {['Pending', 'Processing', 'Ready to Pickup', 'Claimed', 'Rejected'].filter(s => s !== request.status).map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                            {request.status === 'Processing' && (
                                                                <button onClick={() => handlePrintClick(request)} title="Generate & Print PDF" className="p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 rounded-md transition"><Icon name="Printer" /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <PrintModal show={showPrintModal} onClose={() => setShowPrintModal(false)} documentRequest={selectedRequest} />
                </div>
            );
        }

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
