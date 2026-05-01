import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
    CheckCircle, XCircle, Mail, Phone, Home, Calendar, User, Info, Image as ImageIcon, X, LoaderCircle, MessageCircleWarning, ShieldCheck, Clock
} from 'lucide-react';

const MySwal = withReactContent(Swal);

const ModalWrapper = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </motion.div>
        </div>
    );
};

const ModalHeader = ({ user, onClose, onAvatarClick }) => (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-slate-800 dark:to-slate-900 px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onAvatarClick} className="focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full">
                <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=2563eb&color=fff`} alt="User Avatar" className="h-10 w-10 rounded-full border-2 border-white/50" />
            </button>
            <h3 className="text-xl font-bold text-white">Reviewing: <span className="font-extrabold">{user.full_name}</span></h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-white/70 hover:bg-white/20 transition-colors">
            <X className="h-6 w-6" />
        </button>
    </div>
);

const InfoField = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-blue-50 dark:bg-slate-700 p-2.5 rounded-lg">
            <Icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-base font-semibold text-slate-800 dark:text-white">{value || 'N/A'}</p>
        </div>
    </div>
);

const ImageBox = ({ title, imageUrl, onImageClick }) => {
    return (
        <div className="w-full sm:w-1/3 p-2">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">{title}</h4>
                <button onClick={() => imageUrl && onImageClick(imageUrl)} disabled={!imageUrl} className="group aspect-w-16 aspect-h-9 rounded-md overflow-hidden flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 hover:ring-2 hover:ring-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed">
                    {imageUrl ? <img src={imageUrl} alt={title} className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/e2e8f0/e2e8f0?text=Error'; }} /> : <div className="flex flex-col items-center text-slate-400 dark:text-slate-500"><ImageIcon size={32} /><span className="text-xs mt-1">No Image</span></div>}
                </button>
            </div>
        </div>
    );
};

const ImageViewer = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
        <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} src={imageUrl} alt="Enlarged View" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-slate-300 p-2 bg-black/30 rounded-full"><X size={24} /></button>
    </div>
);

const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-20">
        <div className="flex flex-col items-center gap-2">
            <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Processing...</span>
        </div>
    </div>
);


export default function VerificationModal({ user, isOpen, onClose, onVerify, onReject, isUpdating }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    if (!user) return null;

    const handleVerifyClick = () => {
        MySwal.fire({
            html: <CheckCircle className="h-20 w-20 text-blue-500 mx-auto" strokeWidth={1.5} />,
            title: 'Verify this User?',
            text: `This will grant ${user.full_name} full access to the system.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Verify Account!',
            confirmButtonColor: '#2563eb',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-300 rounded-2xl', confirmButton: 'font-semibold', cancelButton: 'font-semibold' }
        }).then((result) => {
            if (result.isConfirmed) onVerify(user, 'verified');
        });
    };

    const handleRejectClick = () => {
        if (!rejectionReason.trim()) {
            MySwal.fire({ title: 'Reason Required', text: 'Please provide a reason for rejection.', icon: 'error', customClass: { popup: 'dark:bg-slate-800 dark:text-slate-300 rounded-2xl' }});
            return;
        }
        MySwal.fire({
            title: 'Reject this User?',
            text: "This action cannot be undone. The user will be notified.",
            icon: 'warning',
            iconColor: '#f59e0b',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reject User!',
            confirmButtonColor: '#e11d48',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-300 rounded-2xl', confirmButton: 'font-semibold', cancelButton: 'font-semibold' }
        }).then((result) => {
            if (result.isConfirmed) {
                onReject(user, 'rejected', { reason: rejectionReason });
                setShowRejectionInput(false);
                setRejectionReason('');
            }
        });
    };

    const isVerified = user.verification_status === 'verified';
    const statusInfo = {
        verified: { icon: CheckCircle, text: 'Verified', color: 'text-green-500' },
        pending_verification: { icon: Clock, text: 'Pending', color: 'text-blue-500' },
        rejected: { icon: XCircle, text: 'Rejected', color: 'text-red-500' },
        unverified: { icon: Info, text: 'Unverified', color: 'text-yellow-500' }
    }[user.verification_status] || { icon: Info, text: 'Unknown', color: 'text-slate-500' };
    const StatusIcon = statusInfo.icon;
    
    return (
        <>
            <ModalWrapper isOpen={isOpen} onClose={onClose}>
                {isUpdating && <LoadingOverlay />}
                <ModalHeader user={user} onClose={onClose} onAvatarClick={() => user.profile?.face_image_url && setSelectedImage(user.profile.face_image_url)}/>
                
                <div className="p-6 overflow-y-auto flex-grow">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md">
                                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white mb-6 pb-3 border-b border-slate-200 dark:border-slate-700"><User size={20} className="text-blue-500" /> User Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                    <InfoField icon={User} label="Full Name" value={user.full_name} />
                                    <InfoField icon={Mail} label="Email" value={user.email} />
                                    <InfoField icon={Phone} label="Phone Number" value={user.profile?.phone_number} />
                                    <InfoField icon={Calendar} label="Birthday" value={user.profile?.birthday ? new Date(user.profile.birthday).toLocaleDateString() : 'N/A'} />
                                    <InfoField icon={Home} label="Address" value={user.profile?.address} />
                                </div>
                             </div>

                             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md">
                                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white mb-4 pb-3 border-b border-slate-200 dark:border-slate-700"><ImageIcon size={20} className="text-blue-500"/> Uploaded Credentials</h3>
                                <div className="flex flex-col sm:flex-row -m-2">
                                    <ImageBox title="Valid ID (Front)" imageUrl={user.profile?.valid_id_front_url} onImageClick={setSelectedImage} />
                                    <ImageBox title="Valid ID (Back)" imageUrl={user.profile?.valid_id_back_url} onImageClick={setSelectedImage} />
                                    <ImageBox title="Selfie Photo" imageUrl={user.profile?.face_image_url} onImageClick={setSelectedImage} />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Account Status</h3>
                                <div className="space-y-5">
                                    <InfoField icon={User} label="Current Role" value={user.role} />
                                    <InfoField icon={ShieldCheck} label="ID Type Presented" value={user.profile?.valid_id_type} />
                                </div>
                                <div className="mt-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-center"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Verification Status</p><div className={`mt-1 flex items-center justify-center gap-2 text-xl font-bold capitalize ${statusInfo.color}`}><StatusIcon size={20} /><span>{statusInfo.text}</span></div></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Actions</h3>
                                <div className="space-y-3">
                                    <button onClick={handleVerifyClick} disabled={isUpdating || isVerified} className={`w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg shadow-sm disabled:cursor-not-allowed transition-all text-sm ${isVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-400 border border-green-300 dark:border-green-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                        <CheckCircle size={20} />
                                        {isVerified ? 'Verified' : 'Verify Account'}
                                    </button>
                                    <AnimatePresence>
                                        {showRejectionInput && (
                                            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: '0.75rem' }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="flex flex-col gap-3 overflow-hidden">
                                                <div className="relative"><MessageCircleWarning className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection (required)..." className="w-full text-sm pl-9 pr-3 py-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500" rows="3" /></div>
                                                <button onClick={handleRejectClick} disabled={isUpdating || !rejectionReason.trim()} className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed transition-all"><XCircle size={20} /> Confirm Rejection</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {!showRejectionInput && (
                                        <button onClick={() => setShowRejectionInput(true)} disabled={isUpdating || user.verification_status === 'rejected'} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg shadow-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                            <XCircle size={20} /> Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalWrapper>
            
            <AnimatePresence>
                {selectedImage && <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
            </AnimatePresence>
        </>
    );
}
