import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

export default function BrgyClearance({ auth, userProfile, documentType }) {

    const { data, setData, post, processing, errors } = useForm({
        purpose: '',
        other_purpose: '',
        document_type_id: documentType.id,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('residents.request.store'));
    };

    const calculateAge = (birthdate) => {
        if (!birthdate) return '';
        const age = new Date().getFullYear() - new Date(birthdate).getFullYear();
        return age > 0 ? age : '';
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Request: {documentType.name}</h2>}
        >
            <Head title={`Request ${documentType.name}`} />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 md:p-8">
                            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                Barangay Clearance Application Form
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Your information is pre-filled from your profile. Please provide the purpose of your request.
                            </p>

                            <form onSubmit={submit} className="mt-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Full Name */}
                                    <div>
                                        <InputLabel htmlFor="full_name" value="Full Name" />
                                        <TextInput
                                            id="full_name"
                                            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700/60"
                                            value={userProfile.full_name || ''}
                                            readOnly
                                        />
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <InputLabel htmlFor="address" value="Address" />
                                        <TextInput
                                            id="address"
                                            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700/60"
                                            value={userProfile.full_address || ''}
                                            readOnly
                                        />
                                    </div>
                                    
                                    {/* Age */}
                                    <div>
                                        <InputLabel htmlFor="age" value="Age" />
                                        <TextInput
                                            id="age"
                                            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700/60"
                                            value={calculateAge(userProfile.birthday)}
                                            readOnly
                                        />
                                    </div>
                                    
                                    {/* Civil Status */}
                                    <div>
                                        <InputLabel htmlFor="civil_status" value="Civil Status" />
                                        <TextInput
                                            id="civil_status"
                                            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700/60"
                                            value={userProfile.civil_status || ''}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                {/* --- MODIFIED SECTION --- */}
                                <div className="pt-4">
                                    <InputLabel htmlFor="purpose" value="Purpose of Request" />
                                    <textarea
                                        id="purpose"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                        value={data.purpose}
                                        onChange={(e) => setData('purpose', e.target.value)}
                                        placeholder="e.g., Job Application, Bank Requirement, School Admission"
                                        required
                                        rows="3"
                                    ></textarea>
                                    <InputError message={errors.purpose} className="mt-2" />
                                </div>
                                {/* --- END OF MODIFICATION --- */}

                                <div className="flex justify-end pt-4">
                                    <PrimaryButton disabled={processing}>
                                        {processing ? 'Submitting...' : 'Submit Request'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}