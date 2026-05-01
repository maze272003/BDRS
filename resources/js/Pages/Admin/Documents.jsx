import React, { useState, useEffect, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, useForm, router } from "@inertiajs/react";
import axios from 'axios';

// --- Import SweetAlert and React Hot Toast ---
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';

// --- Import Driver.js for the tour ---
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

// --- Icon Components ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h12" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const CancelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const RestoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 9a9 9 0 0114.13-6.36M20 15a9 9 0 01-14.13 6.36" /></svg>;
const ViewArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;

// --- Modal Component (for viewing archived list) ---
const Modal = ({ children, show, onClose, title }) => {
    if (!show) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" 
            onClick={onClose}
        >
            <div 
                className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
};


// --- Main Documents Component ---
export default function Documents() {
    const { documentTypes = [], flash } = usePage().props;
    const [editingDocType, setEditingDocType] = useState(null);
    const [showArchivedModal, setShowArchivedModal] = useState(false);
    const [archivedDocs, setArchivedDocs] = useState([]);
    const [isLoadingModal, setIsLoadingModal] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const { data, setData, patch, processing, errors, clearErrors } = useForm({
        name: '',
        description: '',
    });

    // --- Sorting Logic ---
    const sortedDocumentTypes = useMemo(() => {
        let sortableItems = [...documentTypes];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue.toLowerCase() < bValue.toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue.toLowerCase() > bValue.toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [documentTypes, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // --- Driver.js Tour Function ---
    const startTour = () => {
        const firstDoc = sortedDocumentTypes[0];
        const editButtonId = firstDoc ? `#edit-doc-btn-${firstDoc.id}` : null;
        const archiveButtonId = firstDoc ? `#archive-doc-btn-${firstDoc.id}` : null;

        const driverObj = driver({
            showProgress: true,
            steps: [
                {
                    element: '#page-title',
                    popover: {
                        title: 'Manage Documents',
                        description: 'Dito mo pinamamahalaan ang lahat ng mga dokumento na pwedeng i-request ng residente.',
                        side: 'bottom',
                        align: 'start',
                    }
                },
                {
                    element: '#document-table-thead',
                    popover: {
                        title: 'Sortable Columns',
                        description: 'I-click ang "Name" o "Description" para ayusin ang listahan ng mga dokumento.',
                        side: 'bottom',
                        align: 'start',
                    }
                },
                ...(firstDoc ? [
                    {
                        element: editButtonId,
                        popover: {
                            title: 'Edit Document',
                            description: 'I-click ito para palitan ang pangalan o deskripsyon ng isang dokumento.',
                            side: 'left',
                            align: 'start',
                        }
                    },
                    {
                        element: archiveButtonId,
                        popover: {
                            title: 'Archive Document',
                            description: 'Itatago nito ang dokumento sa listahan. Pwede mo itong ibalik mamaya.',
                            side: 'left',
                            align: 'start',
                        }
                    }
                ] : []),
                {
                    element: '#view-archive-btn',
                    popover: {
                        title: 'View Archived',
                        description: 'Dito mo makikita ang lahat ng mga dokumento na iyong in-archive.',
                        side: 'left',
                        align: 'start',
                    }
                },
            ]
        });

        driverObj.drive();
    };

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleEditClick = (docType) => {
        setEditingDocType(docType.id);
        setData(docType);
        clearErrors();
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        patch(route('admin.documents.update', editingDocType), {
            onSuccess: () => {
                setEditingDocType(null);
                toast.success('Document updated successfully!');
            },
            onError: () => {
                toast.error('Failed to update the document.');
            },
            preserveScroll: true,
        });
    };

    const handleArchive = (docType) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to archive "${docType.name}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, archive it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('admin.documents.archive', docType.id), {}, {
                    preserveScroll: true,
                });
            }
        });
    };
    
    const handleRestore = (docType) => {
         Swal.fire({
            title: 'Restore Document?',
            text: `This will make "${docType.name}" available again.`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, restore it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(route('admin.documents.archive', docType.id), {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setArchivedDocs(prevDocs => prevDocs.filter(doc => doc.id !== docType.id));
                    },
                });
            }
        });
    };

    const openArchivedModal = async () => {
        setShowArchivedModal(true);
        setIsLoadingModal(true);
        try {
            const response = await axios.get(route('admin.documents.archived.data'));
            setArchivedDocs(response.data.archivedDocuments);
        } catch (error) {
            console.error("Error fetching archived documents:", error);
            toast.error("Could not fetch archived documents.");
        } finally {
            setIsLoadingModal(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Toaster position="bottom-right" reverseOrder={false} />
            <Head title="Manage Documents" />

            <div className="py-12 bg-slate-50 min-h-screen">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-md rounded-xl border border-gray-200">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <div id="page-title">
                                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                    Manage Document Types
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Edit, update, and archive the documents available for request.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    id="view-archive-btn"
                                    onClick={openArchivedModal}
                                    className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150"
                                >
                                    <ViewArchiveIcon />
                                    <span>View Archived</span>
                                </button>
                                <button
                                   onClick={startTour}
                                   className="flex items-center gap-1 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                   aria-label="Start tour"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5L7 9.167A1 1 0 007 10.833L9.133 13.5a1 1 0 001.734 0L13 10.833A1 1 0 0013 9.167L10.867 6.5A1 1 0 0010 7z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs">Need Help?</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 md:p-0">
                            <ResponsiveTable>
                                <ResponsiveTableHead id="document-table-thead">
                                    <tr>
                                        <ResponsiveTableHeaderCell className="py-4 cursor-pointer hover:bg-blue-800 transition duration-200" onClick={() => requestSort('name')}>
                                            <div className="flex items-center space-x-1">
                                                <span>Name</span>
                                                {sortConfig.key === 'name' && (
                                                    <span className="text-xs">{sortConfig.direction === 'ascending' ? 'ASC' : 'DESC'}</span>
                                                )}
                                            </div>
                                        </ResponsiveTableHeaderCell>
                                        <ResponsiveTableHeaderCell className="py-4 cursor-pointer hover:bg-blue-800 transition duration-200" onClick={() => requestSort('description')}>
                                            <div className="flex items-center space-x-1">
                                                <span>Description</span>
                                                {sortConfig.key === 'description' && (
                                                    <span className="text-xs">{sortConfig.direction === 'ascending' ? 'ASC' : 'DESC'}</span>
                                                )}
                                            </div>
                                        </ResponsiveTableHeaderCell>
                                        <ResponsiveTableHeaderCell className="py-4 hover:bg-blue-800">Actions</ResponsiveTableHeaderCell>
                                    </tr>
                                </ResponsiveTableHead>
                                <ResponsiveTableBody className="md:bg-white md:divide-y md:divide-gray-200">
                                    {sortedDocumentTypes.map((docType) => (
                                        <ResponsiveTableRow key={docType.id} className="odd:bg-white even:bg-slate-100 hover:bg-sky-100">
                                            {editingDocType === docType.id ? (
                                                <>
                                                    <ResponsiveTableCell label="Name">
                                                        <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                                    </ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Description">
                                                        <input type="text" value={data.description} onChange={(e) => setData('description', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                                        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                                                    </ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Actions" nowrap className="font-medium" contentClassName="flex justify-end">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button onClick={handleUpdate} disabled={processing} className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
                                                                <SaveIcon /> <span className="ml-1">Save</span>
                                                            </button>
                                                            <button onClick={() => setEditingDocType(null)} className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-300 transition-colors">
                                                                <CancelIcon /> <span className="ml-1">Cancel</span>
                                                            </button>
                                                        </div>
                                                    </ResponsiveTableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <ResponsiveTableCell label="Name" nowrap className="font-medium text-gray-800">{docType.name}</ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Description" className="text-gray-600">{docType.description}</ResponsiveTableCell>
                                                    <ResponsiveTableCell label="Actions" nowrap className="font-medium" contentClassName="flex justify-end">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button id={`edit-doc-btn-${docType.id}`} onClick={() => handleEditClick(docType)} className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors">
                                                                <EditIcon /> <span className="ml-1">Edit</span>
                                                            </button>
                                                            <button id={`archive-doc-btn-${docType.id}`} onClick={() => handleArchive(docType)} className="flex items-center px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-md hover:bg-yellow-200 transition-colors">
                                                                <ArchiveIcon /> <span className="ml-1">Archive</span>
                                                            </button>
                                                        </div>
                                                    </ResponsiveTableCell>
                                                </>
                                            )}
                                        </ResponsiveTableRow>
                                    ))}
                                </ResponsiveTableBody>
                            </ResponsiveTable>
                        </div>
                    </div>
                </div>
            </div>
            
            <Modal show={showArchivedModal} onClose={() => setShowArchivedModal(false)} title="Archived Documents">
                {isLoadingModal ? (
                    <p className="text-center text-gray-500">Loading...</p>
                ) : (
                    <ResponsiveTable>
                        <ResponsiveTableHead className="bg-gray-50 text-gray-500">
                            <tr>
                                <ResponsiveTableHeaderCell>Name</ResponsiveTableHeaderCell>
                                <ResponsiveTableHeaderCell>Archived By</ResponsiveTableHeaderCell>
                                <ResponsiveTableHeaderCell>Actions</ResponsiveTableHeaderCell>
                            </tr>
                        </ResponsiveTableHead>
                        <ResponsiveTableBody className="md:bg-white md:divide-y md:divide-gray-200">
                            {archivedDocs.length > 0 ? (
                                archivedDocs.map(doc => (
                                    <ResponsiveTableRow key={doc.id}>
                                        <ResponsiveTableCell label="Name" nowrap className="font-medium text-gray-800">{doc.name}</ResponsiveTableCell>
                                        <ResponsiveTableCell label="Archived By" nowrap className="text-gray-500">
                                            {doc.archived_by ? doc.archived_by.full_name : 'N/A'}
                                        </ResponsiveTableCell>
                                        <ResponsiveTableCell label="Actions" nowrap contentClassName="flex justify-end md:justify-start">
                                            <button onClick={() => handleRestore(doc)} className="flex items-center px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-md hover:bg-green-200 transition-colors">
                                                <RestoreIcon /> <span className="ml-1">Restore</span>
                                            </button>
                                        </ResponsiveTableCell>
                                    </ResponsiveTableRow>
                                ))
                            ) : (
                                <ResponsiveTableEmpty colSpan="3">No archived documents found.</ResponsiveTableEmpty>
                            )}
                        </ResponsiveTableBody>
                    </ResponsiveTable>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
