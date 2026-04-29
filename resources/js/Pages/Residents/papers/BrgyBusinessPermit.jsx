import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TextInput from '@/Components/TextInput'; // --- ADD THIS LINE ---
import { Briefcase, Building, Home, FileText } from 'lucide-react';

// --- Reusable UI Components for a more professional look ---

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 shadow-sm sm:rounded-lg ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ title, description }) => (
    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
);

const CardContent = ({ children, className = '' }) => (
    <div className={`p-6 space-y-6 ${className}`}>
        {children}
    </div>
);

const ReadOnlyField = ({ label, value, icon: Icon }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <input
                type="text"
                value={value}
                readOnly
                className="w-full pl-10 pr-4 py-2 border rounded-md shadow-sm bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-300"
            />
        </div>
    </div>
);

const CustomTextInput = ({ label, id, value, onChange, placeholder, error, isFocused = false, required = false, isTextArea = false }) => {
    const commonClasses = "block w-full rounded-md bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
    
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {label}
            </label>
            {isTextArea ? (
                <textarea
                    id={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    rows="3"
                    className={commonClasses}
                />
            ) : (
                <TextInput
                    id={id}
                    type="text"
                    value={value}
                    onChange={onChange}
                    className="mt-1 block w-full"
                    placeholder={placeholder}
                    isFocused={isFocused}
                    required={required}
                />
            )}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

const PrimaryButton = ({ disabled, children, ...props }) => (
    <button
        {...props}
        disabled={disabled}
        className={`inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition ease-in-out duration-150 ${disabled && 'opacity-50 cursor-not-allowed'}`}
    >
        {children}
    </button>
);


// --- Main Component ---

export default function BrgyBusinessPermit({ auth, userProfile, documentType }) {

    const { data, setData, post, processing, errors } = useForm({
        business_name: '',
        business_type: '',
        business_address: '',
        document_type_id: documentType.id,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('residents.request.store'));
    };

    const ownerFullName = `${userProfile?.first_name || ''} ${userProfile?.middle_name || ''} ${userProfile?.last_name || ''}`.replace(/\s+/g, ' ').trim();

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Request: {documentType.name}</h2>}
        >
            <Head title={`Request ${documentType.name}`} />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-8">

                    {/* Requirements Card */}
                    <Card>
                        <CardHeader
                            title="Requirements"
                            description="Please review the requirements before submitting your request."
                        />
                        <CardContent>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {documentType.requirements_description || 'No specific requirements listed for this document.'}
                            </p>
                        </CardContent>
                    </Card>
                    
                    {/* Main Form Card */}
                    <form onSubmit={submit}>
                        <Card>
                            <CardHeader
                                title="Business Permit Application Form"
                                description="Fill in the details of your business below."
                            />
                            
                            {/* Owner's Information Section */}
                            <CardContent className="border-b border-slate-200 dark:border-slate-700">
                                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Owner's Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ReadOnlyField label="Owner's Full Name" value={ownerFullName} icon={Home} />
                                    
                                    {/* --- MODIFIED LINE --- */}
                                    <ReadOnlyField label="Owner's Address" value={userProfile?.full_address || 'N/A'} icon={Home} />
                                    
                                </div>
                            </CardContent>

                            {/* Business Details Section */}
                            <CardContent>
                                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Business Details</h4>
                                <CustomTextInput
                                    label="Business Name"
                                    id="business_name"
                                    value={data.business_name}
                                    onChange={(e) => setData('business_name', e.target.value)}
                                    placeholder="e.g., Aling Nena's Sari-Sari Store"
                                    error={errors.business_name}
                                    isFocused={true}
                                    required
                                />
                                <CustomTextInput
                                    label="Business Type / Nature"
                                    id="business_type"
                                    value={data.business_type}
                                    onChange={(e) => setData('business_type', e.target.value)}
                                    placeholder="e.g., Retail, Food Service, Online Selling"
                                    error={errors.business_type}
                                    required
                                />
                                <CustomTextInput
                                    label="Business Address"
                                    id="business_address"
                                    value={data.business_address}
                                    onChange={(e) => setData('business_address', e.target.value)}
                                    placeholder="Enter the full address where the business is located"
                                    error={errors.business_address}
                                    isTextArea={true}
                                    required
                                />
                            </CardContent>

                            {/* Submission Button */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end rounded-b-lg">
                                <PrimaryButton disabled={processing}>
                                    {processing ? 'Submitting...' : 'Submit Request'}
                                </PrimaryButton>
                            </div>
                        </Card>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}