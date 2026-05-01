import React from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import { User, Mail, Phone, Lock, CheckCircle2, AlertTriangle, Save, Calendar, Users, Home } from 'lucide-react';
import clsx from 'clsx';

// --- Reusable UI Components ---

const InputLabel = ({ htmlFor, value, className, children }) => (
    <label htmlFor={htmlFor} className={clsx('block font-semibold text-sm text-gray-700 dark:text-gray-300', className)}>
        {value || children}
    </label>
);

const TextInput = React.forwardRef(({ type = 'text', className, icon, ...props }, ref) => (
    <div className="relative mt-2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
        </div>
        <input
            {...props}
            type={type}
            ref={ref}
            className={clsx(
                'block w-full border-gray-300 dark:border-slate-600 dark:bg-slate-900/50 dark:text-gray-300 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500 rounded-md shadow-sm transition duration-150 ease-in-out',
                icon ? 'pl-10' : 'pl-4',
                className
            )}
        />
    </div>
));

const InputError = ({ message, className }) => (
    message ? <p className={clsx('text-sm text-red-600 dark:text-red-400 mt-2', className)}>{message}</p> : null
);

const PrimaryButton = ({ className = '', disabled, children, icon, ...props }) => (
    <button
        {...props}
        disabled={disabled}
        className={clsx(
            'inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150',
            disabled && 'opacity-50 cursor-not-allowed',
            className
        )}
    >
        {icon}
        {children}
    </button>
);

// --- New Component for Displaying Non-Editable Info ---
const InfoField = ({ label, value, icon }) => (
    <div>
        <InputLabel value={label} />
        <div className="mt-2 flex items-center gap-3 px-3 py-2.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-md ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
            {icon}
            <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{value || 'Not set'}</span>
            <Lock size={14} className="ml-auto text-slate-400 shrink-0" title="This field cannot be edited." />
        </div>
    </div>
);


export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '' }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        first_name: user.profile?.first_name || '',
        middle_name: user.profile?.middle_name || '',
        last_name: user.profile?.last_name || '',
        email: user.email || '',
        phone_number: user.profile?.phone_number || '',
        address: user.profile?.full_address || '',
        birthday: user.profile?.birthday ? new Date(user.profile.birthday).toISOString().split('T')[0] : '',
        gender: user.profile?.gender || '',
        civil_status: user.profile?.civil_status || '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <form onSubmit={submit} className="space-y-8">
                
                {/* --- Personal Details Section --- */}
                <div>
                      <h2 className="text-xl font-bold font-lg text-blue-700">
                    Personal Details
                </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">This information is linked to your official record and cannot be changed here.</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoField label="First Name" value={data.first_name} icon={<User size={16} className="text-slate-400" />} />
                        <InfoField label="Last Name" value={data.last_name} icon={<User size={16} className="text-slate-400" />} />
                        <InfoField label="Middle Name" value={data.middle_name} icon={<User size={16} className="text-slate-400" />} />
                        <InfoField label="Birthday" value={data.birthday} icon={<Calendar size={16} className="text-slate-400" />} />
                        <InfoField label="Gender" value={data.gender} icon={<Users size={16} className="text-slate-400" />} />
                        <InfoField label="Civil Status" value={data.civil_status} icon={<Users size={16} className="text-slate-400" />} />
                        <div className="md:col-span-2">
                             <InfoField label="Address" value={data.address} icon={<Home size={16} className="text-slate-400" />} />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200/80 dark:border-slate-700"></div>

                {/* --- Contact Information Section --- */}
                <div>
                    <h3 className="text-base font-semibold leading-7 text-gray-800 dark:text-gray-200">Contact & Login Information</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Update your email and phone number to stay connected.</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <InputLabel htmlFor="email" value="Email Address" />
                            <TextInput id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="username" icon={<Mail size={16} className="text-gray-400"/>}/>
                            <InputError className="mt-2" message={errors.email} />
                        </div>
                        <div>
                            <InputLabel htmlFor="phone_number" value="Phone Number" />
                            <TextInput id="phone_number" type="tel" value={data.phone_number} onChange={(e) => setData('phone_number', e.target.value)} icon={<Phone size={16} className="text-gray-400"/>}/>
                            <InputError message={errors.phone_number} className="mt-2" />
                        </div>
                    </div>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800/50 flex items-start gap-3">
                         <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Your email address is unverified.</p>
                            <Link href={route('verification.send')} method="post" as="button" className="text-sm text-yellow-700 dark:text-yellow-300 underline hover:text-yellow-900 dark:hover:text-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded">
                                Click here to re-send the verification email.
                            </Link>
                            {status === 'verification-link-sent' && (
                                <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-300">A new verification link has been sent.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-200/80 dark:border-slate-700">
                    <PrimaryButton disabled={processing} icon={<Save size={14}/>}>Save Changes</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            Saved successfully.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
