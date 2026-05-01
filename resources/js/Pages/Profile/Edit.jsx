import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import Footer from '@/Components/Residents/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShieldCheck, KeyRound, AlertTriangle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

// --- Reusable Components ---

const SettingsCard = ({ title, description, children, variant = 'default' }) => {
    const cardVariants = {
        default: { ring: 'dark:ring-white/10', headerText: 'text-gray-900 dark:text-gray-100' },
        danger: { ring: 'ring-red-500/30 dark:ring-red-500/20', headerText: 'text-red-700 dark:text-red-300' }
    };
    const selectedVariant = cardVariants[variant] || cardVariants.default;

    return (
        <motion.div
            className={`bg-white/80 backdrop-blur-sm dark:bg-slate-800/80 p-6 sm:p-8 rounded-2xl shadow-lg ring-1 ring-black/5 ${selectedVariant.ring}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            <header>
                <h2 className={`text-xl font-bold ${selectedVariant.headerText}`}>{title}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </header>
            <div className="border-t border-gray-200/80 dark:border-slate-700 mt-6 pt-6">
                {children}
            </div>
        </motion.div>
    );
};

const ImageModal = ({ src, onClose }) => {
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!src) return null;

    return (
        <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        >
            <motion.img 
                src={src} 
                alt="Verification Document Preview" 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

// --- New: Verified Badge Component ---
const VerifiedBadge = () => (
    <div className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-semibold">
        <ShieldCheck size={14} />
        <span>Verified</span>
    </div>
);


// --- Main Page Component ---

export default function Edit({ auth, mustVerifyEmail, status, userProfile }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [viewingImage, setViewingImage] = useState(null);

    const tabs = [
        { id: 'profile', name: 'Profile', icon: <User size={18} /> },
        { id: 'verification', name: 'Verification', icon: <ShieldCheck size={18} /> },
        { id: 'password', name: 'Password', icon: <KeyRound size={18} /> },
        { id: 'danger', name: 'Danger Zone', icon: <AlertTriangle size={18} /> },
    ];
    
    const userRole = auth.user.role.charAt(0).toUpperCase() + auth.user.role.slice(1).replace('_', ' ');

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Profile Settings" />
            
            <div className="bg-slate-50 dark:bg-slate-900 min-h-screen font-sans relative isolate">
                
                <main className="py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
                            <nav className="lg:col-span-1">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-4">
                                        {/* Profile Header */}
                        <div className="flex items-center gap-4 border-b border-slate-200/80 dark:border-slate-700/50 pb-4">
                            
                            <div className="h-12 w-12 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-800 shrink-0">
                                <User className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                            </div>

                            <div className="flex-1 min-w-0">

                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-slate-800 dark:text-white truncate">
                                        {auth.user.full_name}
                                    </h2>
                                    {auth.user.is_verified && <VerifiedBadge />}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {userRole}
                                </p>

                            </div>
                        </div>

                                        <ul className="space-y-1 mt-4">
                                            {tabs.map(tab => (
                                                <li key={tab.id}>
                                                    <button
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={clsx(
                                                            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors relative',
                                                            activeTab === tab.id
                                                                ? 'text-white'
                                                                : `hover:bg-sky-100/70 dark:hover:bg-sky-900/30 ${
                                                                    tab.id === 'danger'
                                                                        ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400'
                                                                        : 'text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300'
                                                                }`
                                                        )}
                                                    >
                                                        {activeTab === tab.id && (
                                                            <motion.div
                                                                layoutId="activeSettingsTab"
                                                                className={`absolute inset-0 rounded-lg shadow-sm ${tab.id === 'danger' ? 'bg-red-600' : 'bg-blue-600'}`}
                                                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                                            />
                                                        )}
                                                        <span className="relative z-10">{tab.icon}</span>
                                                        <span className="relative z-10 whitespace-nowrap">{tab.name}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </nav>

                            <div className="lg:col-span-3">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'profile' && (
                                        <SettingsCard key="profile" title="Profile Information" description="Update your account's profile information and email address.">
                                            <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status}/>
                                        </SettingsCard>
                                    )}

                                    {activeTab === 'verification' && (
                                        <SettingsCard key="verification" title="Uploaded Credentials" description="These are the images you provided during registration. Click to enlarge.">
                                            {(userProfile && (userProfile.face_image_url || userProfile.valid_id_front_url)) ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
                                                    {userProfile.face_image_url && (
                                                        <div>
                                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Face Picture</h3>
                                                            <img onClick={() => setViewingImage(userProfile.face_image_url)} src={userProfile.face_image_url} alt="Face Picture" className="w-full h-auto rounded-lg shadow-md aspect-square object-cover cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl" />
                                                        </div>
                                                    )}
                                                    {userProfile.valid_id_front_url && (
                                                        <div>
                                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Valid ID (Front)</h3>
                                                            <img onClick={() => setViewingImage(userProfile.valid_id_front_url)} src={userProfile.valid_id_front_url} alt="Valid ID Front" className="w-full h-auto rounded-lg shadow-md aspect-[1.586/1] object-cover cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl" />
                                                        </div>
                                                    )}
                                                    {userProfile.valid_id_back_url && (
                                                        <div>
                                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Valid ID (Back)</h3>
                                                            <img onClick={() => setViewingImage(userProfile.valid_id_back_url)} src={userProfile.valid_id_back_url} alt="Valid ID Back" className="w-full h-auto rounded-lg shadow-md aspect-[1.586/1] object-cover cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl" />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                                                    <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
                                                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No Verification Images</h3>
                                                    <p className="mt-1 text-sm text-slate-500">You have not uploaded any verification images yet.</p>
                                                </div>
                                            )}
                                        </SettingsCard>
                                    )}

                                    {activeTab === 'password' && (
                                        <SettingsCard key="password" title="Update Password" description="Ensure your account is using a long, random password to stay secure.">
                                            <UpdatePasswordForm />
                                        </SettingsCard>
                                    )}

                                    {activeTab === 'danger' && (
                                        <SettingsCard key="danger" variant="danger" title="Delete Account" description="Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.">
                                            <DeleteUserForm />
                                        </SettingsCard>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
            <AnimatePresence>
                {viewingImage && <ImageModal src={viewingImage} onClose={() => setViewingImage(null)} />}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}
