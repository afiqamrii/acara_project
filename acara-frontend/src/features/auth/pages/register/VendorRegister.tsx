import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import {
    IconBuildingStore,
    IconCalendar,
    IconCreditCard,
    IconEdit,
    IconExternalLink,
    IconFileCertificate,
    IconMapPin,
    IconShieldCheck,
} from "@tabler/icons-react";

// import { UserSidebar } from "../../../header/pages/UserSidebar";
import { fetchCompanyProfile, registerVendor, type CompanyProfile } from "../../vendorApi";
import { malaysiaBanks, malaysiaLocations, toTitleCase } from "../../../../utils/formHelpers";
import Stepper from "../../../../components/common/Stepper";
import { usePageTitle } from "../../../../utils/usePageTitle";

type ApiErrorData = { message?: string };

const getApiErrorMessage = (error: unknown) =>
    (error as AxiosError<ApiErrorData>).response?.data?.message;

const maskAccountNumber = (accountNumber: string) => {
    const visible = accountNumber.slice(-4);
    return `${"•".repeat(Math.max(4, accountNumber.length - 4))} ${visible}`;
};

const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

const STATUS_META: Record<CompanyProfile["status"], { label: string; message: string; className: string }> = {
    approved: {
        label: "Verified",
        message: "Your company is verified and can publish services on ACARA.",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    pending_verification: {
        label: "Under review",
        message: "Your company details are being reviewed by the ACARA admin team.",
        className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    pending_completion: {
        label: "Incomplete",
        message: "Complete the remaining company information to start verification.",
        className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    rejected: {
        label: "Needs attention",
        message: "Your company profile needs changes before it can be approved.",
        className: "bg-red-50 text-red-700 ring-red-200",
    },
};

const formDataFromProfile = (profile: CompanyProfile) => ({
    ssm_number: profile.ssm_number ?? "",
    business_name: profile.business_name,
    business_link: profile.business_link,
    business_started_at: profile.business_started_at,
    service_area_state: profile.service_area_state,
    service_area_town: profile.service_area_town,
    bank_name: profile.bank_name,
    bank_account_number: profile.bank_account_number,
    bank_holder_name: profile.bank_holder_name,
});

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) => (
    <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-3.5 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-purple-600 shadow-sm">
            <Icon size={16} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <div className="mt-1 break-words text-sm font-semibold text-gray-800">{value || "—"}</div>
        </div>
    </div>
);

const CompanyProfileOverview = ({
    profile,
    onEdit,
    onDashboard,
}: {
    profile: CompanyProfile;
    onEdit: () => void;
    onDashboard: () => void;
}) => {
    const status = STATUS_META[profile.status];
    const websiteIsLink = /^https?:\/\//i.test(profile.business_link.trim());

    return (
        <main className="flex-1 overflow-y-auto bg-[#f6f5fb] px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-4 pt-12 md:pt-0">
                <motion.section
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#18073d] via-[#351078] to-[#6d28d9] p-6 text-white shadow-xl shadow-purple-900/15 sm:p-8"
                >
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
                    <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/20">
                                {profile.business_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-200">Company profile</p>
                                <h1 className="mt-1 text-2xl font-black sm:text-3xl">{profile.business_name}</h1>
                                <p className="mt-1 text-xs text-purple-100/65">SSM {profile.ssm_number || "Not provided"}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={onDashboard} className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20">
                                Vendor Dashboard
                            </button>
                            <button onClick={onEdit} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-purple-700 shadow-sm transition hover:bg-purple-50">
                                <IconEdit size={15} /> Edit details
                            </button>
                        </div>
                    </div>
                </motion.section>

                <section className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 ring-1 ${status.className}`}>
                    <IconShieldCheck size={20} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-black">{status.label}</p>
                        <p className="mt-0.5 text-xs opacity-80">{status.message}</p>
                    </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600"><IconBuildingStore size={20} /></div>
                            <div>
                                <h2 className="text-sm font-black text-gray-900">Company details</h2>
                                <p className="text-[11px] text-gray-400">Legal identity and online presence</p>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <DetailItem label="SSM Number" value={profile.ssm_number} icon={IconFileCertificate} />
                            <DetailItem label="Established" value={formatDate(profile.business_started_at)} icon={IconCalendar} />
                            <DetailItem
                                label="Website / Social"
                                icon={IconExternalLink}
                                value={websiteIsLink ? (
                                    <a href={profile.business_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-purple-600 hover:underline">
                                        Open business page <IconExternalLink size={13} />
                                    </a>
                                ) : profile.business_link}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><IconMapPin size={20} /></div>
                            <div>
                                <h2 className="text-sm font-black text-gray-900">Operations</h2>
                                <p className="text-[11px] text-gray-400">Service coverage and verification</p>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <DetailItem label="Service State" value={profile.service_area_state} icon={IconMapPin} />
                            <DetailItem label="Town / Area" value={profile.service_area_town} icon={IconMapPin} />
                            <DetailItem
                                label="SSM Document"
                                icon={IconFileCertificate}
                                value={profile.ssm_document_url ? (
                                    <a href={profile.ssm_document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-purple-600 hover:underline">
                                        View document <IconExternalLink size={13} />
                                    </a>
                                ) : "Not uploaded"}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><IconCreditCard size={20} /></div>
                            <div>
                                <h2 className="text-sm font-black text-gray-900">Payout account</h2>
                                <p className="text-[11px] text-gray-400">Bank details are masked for privacy</p>
                            </div>
                        </div>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                            <DetailItem label="Bank" value={profile.bank_name} icon={IconCreditCard} />
                            <DetailItem label="Account Holder" value={profile.bank_holder_name} icon={IconCreditCard} />
                            <DetailItem label="Account Number" value={maskAccountNumber(profile.bank_account_number)} icon={IconCreditCard} />
                        </div>
                    </div>
                </section>

                {profile.status === "approved" && (
                    <p className="px-2 text-center text-[11px] text-gray-400">
                        Editing verified company details will submit the profile for admin verification again.
                    </p>
                )}
            </div>
        </main>
    );
};

const VendorRegister: React.FC = () => {
    usePageTitle("Company Profile");
    const navigate = useNavigate();
    const {
        data: existingProfile,
        isPending: profileLoading,
        isError: profileError,
        refetch: refetchProfile,
    } = useQuery({
        queryKey: ["company-profile"],
        queryFn: fetchCompanyProfile,
        staleTime: 30_000,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [attemptedNext, setAttemptedNext] = useState(false);
    const [files, setFiles] = useState<{
        ssm_document: File | null;
    }>({
        ssm_document: null,
    });

    const [formData, setFormData] = useState({
        ssm_number: "",
        business_name: "",
        business_link: "",
        business_started_at: "",
        service_area_state: "",
        service_area_town: "",
        bank_name: "",
        bank_account_number: "",
        bank_holder_name: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        let formattedValue = value;
        if (["business_name", "bank_holder_name"].includes(name)) {
            formattedValue = toTitleCase(value);
        }

        setFormData((prev) => ({ ...prev, [name]: formattedValue }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: false }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: fileList } = e.target;
        if (fileList && fileList[0]) {
            setFiles((prev) => ({ ...prev, [name]: fileList[0] }));
            if (errors[name]) {
                setErrors((prev) => ({ ...prev, [name]: false }));
            }
        }
    };

    const validateStep = (step: number) => {
        const newErrors: Record<string, boolean> = {};

        if (step === 1) {
            if (!formData.business_name.trim()) newErrors.business_name = true;
            if (!formData.ssm_number.trim()) newErrors.ssm_number = true;
        }

        if (step === 2) {
            if (!formData.business_link.trim()) newErrors.business_link = true;
            if (!formData.business_started_at.trim()) newErrors.business_started_at = true;
            if (!formData.service_area_state.trim()) newErrors.service_area_state = true;
            if (!formData.service_area_town.trim()) newErrors.service_area_town = true;
        }

        if (step === 3) {
            if (!formData.bank_name.trim()) newErrors.bank_name = true;
            if (!formData.bank_account_number.trim()) newErrors.bank_account_number = true;
            if (!formData.bank_holder_name.trim()) newErrors.bank_holder_name = true;
        }

        if (step === 4) {
            if (!files.ssm_document && !existingProfile?.ssm_document_url) newErrors.ssm_document = true;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }

        return true;
    };

    const isStepValid = (step: number) => {
        const valid = validateStep(step);
        setAttemptedNext(!valid);
        return valid;
    };

    const handleSubmit = async () => {
        const isStep1Valid = validateStep(1);
        const isStep2Valid = validateStep(2);
        const isStep3Valid = validateStep(3);
        const isStep4Valid = validateStep(4);

        if (!isStep1Valid) {
            setSubmitError("Please complete all required fields in Step 1 (Business Basics).");
            setAttemptedNext(true);
            return;
        }

        if (!isStep2Valid) {
            setSubmitError("Please complete all required fields in Step 2 (Business Presence & Area).");
            setAttemptedNext(true);
            return;
        }

        if (!isStep3Valid) {
            setSubmitError("Please complete all required fields in Step 3 (Bank Details).");
            setAttemptedNext(true);
            return;
        }

        if (!isStep4Valid) {
            setSubmitError("Please upload your required SSM document in Step 4.");
            setAttemptedNext(true);
            return;
        }

        setIsLoading(true);
        setSubmitError(null);

        try {
            const data = new FormData();
            data.append("business_name", formData.business_name.trim());
            data.append("business_link", formData.business_link.trim());
            data.append("business_started_at", formData.business_started_at.trim());
            data.append("service_area_state", formData.service_area_state);
            data.append("service_area_town", formData.service_area_town);
            data.append("bank_name", formData.bank_name);
            data.append("bank_account_number", formData.bank_account_number.trim());
            data.append("bank_holder_name", formData.bank_holder_name.trim());
            if (formData.ssm_number.trim()) {
                data.append("ssm_number", formData.ssm_number.trim());
            }
            if (files.ssm_document) {
                data.append("ssm_document", files.ssm_document);
            }

            await registerVendor(data);
            setSuccess(true);
        } catch (error: unknown) {
            console.error("Vendor registration failed:", error);
            setSubmitError(getApiErrorMessage(error) || "Failed to submit vendor registration. Please try again.");
            setIsLoading(false);
        }
    };

    if (profileLoading) {
        return (
            <main className="flex flex-1 items-center justify-center bg-[#f6f5fb] p-6">
                <div className="rounded-3xl bg-white px-10 py-8 text-center shadow-sm">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-purple-100 border-t-purple-600" />
                    <p className="mt-4 text-sm font-bold text-gray-700">Loading company profile...</p>
                </div>
            </main>
        );
    }

    if (profileError) {
        return (
            <main className="flex flex-1 items-center justify-center bg-[#f6f5fb] p-6">
                <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
                    <p className="text-lg font-black text-gray-900">Company profile could not be loaded</p>
                    <p className="mt-2 text-sm text-gray-500">Please refresh and try again.</p>
                    <button onClick={() => refetchProfile()} className="mt-5 rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white">Try again</button>
                </div>
            </main>
        );
    }

    if (existingProfile && !isEditing && !success) {
        return (
            <CompanyProfileOverview
                profile={existingProfile}
                onEdit={() => {
                    setFormData(formDataFromProfile(existingProfile));
                    setIsEditing(true);
                }}
                onDashboard={() => navigate("/vendor/dashboard")}
            />
        );
    }

    if (success) {
        return (
            <div className="flex h-screen w-full overflow-hidden bg-gray-50">
                {/* <UserSidebar /> */}
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <motion.path
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </motion.div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            {existingProfile ? "Company Profile Updated" : "Company Profile Submitted"}
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Your company details are pending admin verification. You can continue using the vendor workspace while the review is in progress.
                        </p>
                        <button
                            onClick={async () => {
                                await refetchProfile();
                                setSuccess(false);
                                setIsEditing(false);
                                setIsLoading(false);
                            }}
                            className="w-full bg-[#7E57C2] text-white py-3.5 rounded-xl hover:bg-[#6C4AB8] transition-colors font-medium shadow-md"
                        >
                            View Company Profile
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            {/* <UserSidebar /> */}

            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start pt-10 pb-12 px-4">
                <div className="w-full max-w-3xl mb-6">
                    <nav className="flex" aria-label="Breadcrumb">
                        <ol className="inline-flex items-center space-x-1 md:space-x-3">
                            <li className="inline-flex items-center">
                                <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#7E57C2]">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                                    Home
                                </Link>
                            </li>
                            <li aria-current="page">
                                <div className="flex items-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                                    <span className="ml-1 text-sm font-medium text-gray-400 md:ml-2">Company Profile</span>
                                </div>
                            </li>
                        </ol>
                    </nav>
                </div>

                <div className="text-center mb-10 w-full max-w-3xl">
                    <div className="flex items-center justify-center gap-3">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            {existingProfile ? "Edit Company Profile" : "Create Company Profile"}
                        </h1>
                    </div>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        {existingProfile
                            ? "Update company details used for verification, payouts, and service listings."
                            : "Add company details used for verification, payouts, and service listings."}
                    </p>
                    {existingProfile && (
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="mt-4 text-sm font-bold text-purple-600 hover:text-purple-800"
                        >
                            Cancel editing
                        </button>
                    )}
                </div>

                {submitError && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium max-w-3xl w-full text-center border border-red-100 animate-pulse">
                        {submitError}
                    </div>
                )}

                <div className="w-full max-w-4xl">
                    <Stepper
                        initialStep={1}
                        onFinalStepCompleted={handleSubmit}
                        backButtonText="Previous"
                        nextButtonText="Next Step"
                        isStepValid={isStepValid}
                        isLoading={isLoading}
                        stepCircleContainerClassName="shadow-2xl border-0"
                        contentClassName="min-h-0 py-4"
                    >
                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Business Basics</h2>
                            <p className="text-gray-500 mb-6 text-sm">Start with the identity of your vendor business.</p>

                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="business_name"
                                        value={formData.business_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your business name"
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.business_name ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">SSM Number <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="ssm_number"
                                            value={formData.ssm_number}
                                            onChange={handleInputChange}
                                            placeholder="Enter your SSM number"
                                            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.ssm_number ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Area <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <select
                                                name="service_area_state"
                                                value={formData.service_area_state}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    setFormData((prev) => ({ ...prev, service_area_town: "" }));
                                                }}
                                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none ${attemptedNext && errors.service_area_state ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                            >
                                                <option value="">Select State</option>
                                                {Object.keys(malaysiaLocations).sort().map((state) => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>

                                            <select
                                                name="service_area_town"
                                                value={formData.service_area_town}
                                                onChange={handleInputChange}
                                                disabled={!formData.service_area_state}
                                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none ${attemptedNext && errors.service_area_town ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                            >
                                                <option value="">Select Town/Area</option>
                                                {formData.service_area_state && (malaysiaLocations as Record<string, string[]>)[formData.service_area_state]?.sort().map((town) => (
                                                    <option key={town} value={town}>{town}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Business Presence & Area</h2>
                            <p className="text-gray-500 mb-6 text-sm">Share your online presence and experience details.</p>

                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Website / Social Media Links <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="business_link"
                                        rows={4}
                                        value={formData.business_link}
                                        onChange={handleInputChange}
                                        placeholder="Add your website, Instagram, TikTok, Facebook, or other business links"
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none ${attemptedNext && errors.business_link ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Business Start Date <span className="text-red-500">*</span>
                                        <span className="ml-2 text-xs text-gray-400 font-normal">— years of experience will be calculated automatically</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="business_started_at"
                                        value={formData.business_started_at}
                                        onChange={handleInputChange}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.business_started_at ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Bank Details</h2>
                            <p className="text-gray-500 mb-6 text-sm">Add your payout information for future vendor transactions.</p>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name <span className="text-red-500">*</span></label>
                                    <select
                                        name="bank_name"
                                        value={formData.bank_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none ${attemptedNext && errors.bank_name ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                    >
                                        <option value="">Select Bank</option>
                                        {malaysiaBanks.sort().map((bank) => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Account Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="bank_account_number"
                                        value={formData.bank_account_number}
                                        onChange={handleInputChange}
                                        placeholder="Enter your bank account number"
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.bank_account_number ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Holder Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="bank_holder_name"
                                        value={formData.bank_holder_name}
                                        onChange={handleInputChange}
                                        placeholder="Name as per bank record"
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.bank_holder_name ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Document</h2>
                            <p className="text-gray-500 mb-6 text-sm">
                                {existingProfile?.ssm_document_url
                                    ? "Your current document remains active unless you upload a replacement."
                                    : "Upload your SSM certificate or related registration proof."}
                            </p>

                            <div className={`p-6 border-2 border-dashed rounded-xl transition-colors bg-gray-50/50 ${attemptedNext && errors.ssm_document ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-[#7E57C2]/50"}`}>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                                        {existingProfile?.ssm_document_url ? "Replace SSM Document" : "SSM Document"}
                                        {!existingProfile?.ssm_document_url && <span className="text-red-500"> *</span>}
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        PDF, JPG, JPEG or PNG, up to 10 MB
                                    </p>
                                    <input
                                        type="file"
                                        name="ssm_document"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#7E57C2] file:text-white hover:file:bg-[#6C4AB8] cursor-pointer"
                                    />
                                    {existingProfile?.ssm_document_url && !files.ssm_document && (
                                        <a href={existingProfile.ssm_document_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:underline">
                                            View current document <IconExternalLink size={13} />
                                        </a>
                                    )}
                                    {files.ssm_document && <p className="mt-2 text-xs text-green-600 font-medium truncate">{files.ssm_document.name}</p>}
                                    {attemptedNext && errors.ssm_document && <p className="text-red-500 text-xs mt-2">SSM document is required</p>}
                                </div>
                            </div>

                            {isLoading && (
                                <div className="text-center text-sm text-[#7E57C2] animate-pulse font-medium mt-4">
                                    Submitting your vendor details... do not close current window
                                </div>
                            )}
                        </div>
                    </Stepper>
                </div>
            </div>
        </div>
    );
};

export default VendorRegister;
