import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

export default function JobSeeker({ auth, userProfile, documentType }) {

    const { data, setData, post, processing, errors } = useForm({
        years_qualified: '',
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
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <form onSubmit={submit} className="p-6 md:p-8 space-y-6">
                            
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Requirements:</h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {documentType.requirements_description || 'No specific requirements listed.'}
                                </p>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            <div>
                                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Applicant Information</h4>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <InputLabel value="Full Name" />
                                        <TextInput
                                            type="text"
                                            className="mt-1 block w-full bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                                            value={ownerFullName}
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Address" />
                                        <TextInput
                                            type="text"
                                            className="mt-1 block w-full bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                                            value={userProfile.full_address || ''}
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <InputLabel htmlFor="years_qualified" value="Number of Years as a Resident of this Barangay" />
                                <TextInput
                                    id="years_qualified"
                                    type="number"
                                    value={data.years_qualified}
                                    onChange={(e) => setData('years_qualified', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="e.g., 5"
                                    isFocused={true}
                                    required
                                />
                                <InputError message={errors.years_qualified} className="mt-2" />
                            </div>

                            <div className="flex justify-end pt-4">
                                <PrimaryButton disabled={processing}>
                                    {processing ? 'Submitting...' : 'Submit Request'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}