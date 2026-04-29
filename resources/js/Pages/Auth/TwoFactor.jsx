import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';

// --- HELPER COMPONENTS ---

const KeypadIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 10h.01M7 13h.01M10 7h.01M10 10h.01M10 13h.01M13 7h.01M13 10h.01M13 13h.01M16 7h.01M16 10h.01M16 13h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3z" />
    </svg>
);

const CheckCircleIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationTriangleIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const AuthLayout = ({ title, description }) => (
    <div className="w-full md:w-1/2 text-white p-8 md:p-12 flex flex-col justify-center relative bg-cover bg-center" style={{ backgroundImage: "url(/images/brgy.png"}}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-blue-800/90"></div>
        <div className="relative z-10">
            <div className="flex items-center mb-8">
                <div className="w-16 h-16 mr-4 bg-white/20 rounded-full flex items-center justify-center ring-4 ring-white/30 p-2 shadow-lg">
                    <img src="/images/gapanlogo.png" alt="logo" className="w-full h-full rounded-full" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-shadow">{title}</h1>
            </div>
            <p className="text-blue-100 text-lg leading-relaxed text-shadow-sm">{description}</p>
            <p className="text-xs text-blue-200 mt-12 opacity-75">Gapan City, Nueva Ecija</p>
        </div>
    </div>
);

const PrimaryButton = ({ className = '', disabled, children, status = 'idle', ...props }) => {
    const statusClasses = {
        idle: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
        success: 'bg-gradient-to-r from-green-500 to-green-600 cursor-default',
        error: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
    };

    return (
        <button
            {...props}
            className={`w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg font-semibold text-base text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ease-in-out duration-150 ${statusClasses[status]} ${disabled && 'opacity-50 cursor-not-allowed'} ` + className}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const OtpInput = ({ length = 6, value, onChange, status, onValueChange }) => {
    const inputRefs = useRef([]);

    const statusStyles = {
        idle: 'border-slate-300 focus:border-blue-500 focus:ring-blue-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500 animate-shake',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    };
    
    useEffect(() => {
        if (status === 'error') {
            inputRefs.current[0]?.focus();
        }
    }, [status]);

    const handleChange = (element, index) => {
        onValueChange();
        const digit = element.value.replace(/[^0-9]/g, '');
        const newOtp = [...value];
        newOtp[index] = digit;
        onChange(newOtp.join(''));

        if (digit && index < length - 1) {
            inputRefs.current[index + 1].focus();
        }
    };
    
    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            onValueChange();
            inputRefs.current[index - 1].focus();
        }
    };
    
    const handlePaste = (e) => {
        e.preventDefault();
        onValueChange();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').substring(0, length);
        if (pastedData) {
            onChange(pastedData);
            const nextFocusIndex = pastedData.length < length ? pastedData.length : length - 1;
            inputRefs.current[nextFocusIndex].focus();
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 md:gap-3" onPaste={handlePaste}>
            {Array.from({ length }, (_, index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={value[index] || ''}
                    onChange={(e) => handleChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-3xl font-bold text-slate-800 bg-slate-50 border-2 rounded-lg shadow-sm transition-all ${statusStyles[status]}`}
                    disabled={status === 'success'}
                />
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

export default function TwoFactor({ two_factor_method = 'sms' }) {
    const [submissionStatus, setSubmissionStatus] = useState('idle');
    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const [resentMessageVisible, setResentMessageVisible] = useState(false);
    
    const [currentMethod, setCurrentMethod] = useState(two_factor_method);

    const deliveryMethod = currentMethod === 'sms' ? 'phone' : 'email';
    const destination = currentMethod === 'sms' ? 'registered phone number' : 'email address';

    const { data, setData, post, processing, reset, clearErrors } = useForm({
        two_factor_code: '',
    });

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleResend = (method) => {
        setResending(true);
        router.post(route('two_factor.resend'), { method: method }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setCurrentMethod(page.props.two_factor_method);
                setCooldown(180);
                setResentMessageVisible(true);
                setTimeout(() => setResentMessageVisible(false), 5000);
            },
            onFinish: () => {
                setResending(false);
            },
        });
    };

    const submit = (e) => {
        e.preventDefault();
        if (submissionStatus === 'success') return;

        post(route('two_factor.verify'), {
            onError: () => {
                setSubmissionStatus('error');
                reset('two_factor_code');
            },
            onSuccess: () => {
                setSubmissionStatus('success');
                setTimeout(() => {
                    router.get(route('residents.home')); 
                }, 1500);
            },
        });
    };

    const DynamicHeader = () => {
        switch (submissionStatus) {
            case 'success':
                return (
                    <>
                        <CheckCircleIcon className="h-16 w-16 text-green-500" />
                        <h2 className="text-2xl font-bold text-green-600 mt-4 text-center">Code Accepted!</h2>
                        <p className="text-slate-600 mb-8 text-center text-sm">Welcome back. Redirecting you now...</p>
                    </>
                );
            case 'error':
                return (
                    <>
                        <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
                        <h2 className="text-2xl font-bold text-red-600 mt-4 text-center">Invalid Code</h2>
                        <p className="text-slate-600 mb-8 text-center text-sm">The code is incorrect. Please try again.</p>
                    </>
                );
            default:
                return (
                    <>
                        <KeypadIcon className="h-16 w-16 text-blue-600" />
                        <h2 className="text-2xl font-bold text-slate-800 mt-4 text-center">Enter Security Code</h2>
                        <p className="text-slate-500 mb-8 text-center text-sm">
                            Please check your {deliveryMethod} and enter the 6-digit code.
                        </p>
                    </>
                );
        }
    };
    
    return (
        <div className="bg-slate-50">
            <Head title="Two-Factor Verification" />
            <style>{`
                .text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.2); } 
                .text-shadow-sm { text-shadow: 0 1px 2px rgba(0,0,0,0.15); }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>

            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden md:flex">
                    <AuthLayout
                        title="Two-Factor Authentication"
                        description={`For your security, a one-time code has been sent to your ${destination}. Please enter it below to complete your login.`}
                    />

                    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                        <div className="flex flex-col items-center mb-4">
                            <DynamicHeader />
                        </div>
                        
                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <OtpInput
                                    length={6}
                                    value={data.two_factor_code}
                                    onChange={(otp) => setData('two_factor_code', otp)}
                                    status={submissionStatus}
                                    onValueChange={() => {
                                        if (submissionStatus !== 'idle') {
                                            setSubmissionStatus('idle');
                                            clearErrors('two_factor_code');
                                        }
                                    }}
                                />
                            </div>
                            <div className="pt-2">
                                <PrimaryButton 
                                    status={submissionStatus}
                                    disabled={processing || data.two_factor_code.length !== 6 || submissionStatus === 'success'}
                                >
                                    {processing ? 'Verifying...' : (submissionStatus === 'success' ? 'Success!' : 'Verify & Sign In')}
                                </PrimaryButton>
                            </div>
                        </form>
                        
                        <div className="mt-6 text-center text-sm">
                            {resentMessageVisible && (
                                <p className="text-green-600 mb-2 transition-opacity duration-300">
                                    A new security code has been sent.
                                </p>
                            )}

                            <div className="space-y-2">
                                <p className="text-slate-500">Didn't receive a code?</p>
                                <div className="flex justify-center items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleResend('sms')}
                                        disabled={cooldown > 0 || resending}
                                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                                    >
                                        {cooldown > 0 ? `Try again in ${cooldown}s` : 'Resend via SMS'}
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => handleResend('email')}
                                        disabled={cooldown > 0 || resending}
                                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                                    >
                                        Resend via Email
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-6 border-t border-slate-100 text-center">
                            <Link
                                href={route('logout')}
                                method="post" as="button"
                                className="font-medium text-slate-600 hover:text-slate-800 hover:underline text-sm transition-colors"
                            >
                                Cancel and Log Out
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}