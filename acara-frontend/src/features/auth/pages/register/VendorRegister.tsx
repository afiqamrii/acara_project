import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { UserSidebar } from "../../../header/pages/UserSidebar";
import { registerVendor } from "../../vendorApi";
import { malaysiaBanks, malaysiaLocations, toTitleCase } from "../../../../utils/formHelpers";
import Stepper from "../../../../components/common/Stepper";

const VendorRegister: React.FC = () => {
    const navigate = useNavigate();
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
        years_of_experience: "",
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
            if (!formData.years_of_experience.trim()) newErrors.years_of_experience = true;
            if (!formData.service_area_state.trim()) newErrors.service_area_state = true;
            if (!formData.service_area_town.trim()) newErrors.service_area_town = true;
        }

        if (step === 3) {
            if (!formData.bank_name.trim()) newErrors.bank_name = true;
            if (!formData.bank_account_number.trim()) newErrors.bank_account_number = true;
            if (!formData.bank_holder_name.trim()) newErrors.bank_holder_name = true;
        }

        if (step === 4) {
            if (!files.ssm_document) newErrors.ssm_document = true;
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
            data.append("years_of_experience", formData.years_of_experience.trim());
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
        } catch (err: any) {
            console.error("Vendor registration failed:", err);
            setSubmitError(err.response?.data?.message || "Failed to submit vendor registration. Please try again.");
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex h-screen w-full overflow-hidden bg-gray-50">
                <UserSidebar />
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
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Vendor Details Saved</h2>
                        <p className="text-gray-600 mb-8">
                            Your vendor business details have been submitted. We can continue building the rest of the vendor registration next.
                        </p>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="w-full bg-[#7E57C2] text-white py-3.5 rounded-xl hover:bg-[#6C4AB8] transition-colors font-medium shadow-md"
                        >
                            Return to Dashboard
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            <UserSidebar />

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
                                    <span className="ml-1 text-sm font-medium text-gray-400 md:ml-2">Vendor Registration</span>
                                </div>
                            </li>
                        </ol>
                    </nav>
                </div>

                <div className="text-center mb-10 w-full max-w-3xl">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Register Your Vendor Business</h1>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Complete your vendor registration step by step so we can review your business details clearly.
                    </p>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        name="years_of_experience"
                                        value={formData.years_of_experience}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 5"
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.years_of_experience ? "border-red-500 ring-red-200" : "border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]"}`}
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
                            <p className="text-gray-500 mb-6 text-sm">Upload your SSM certificate or related registration proof.</p>

                            <div className={`p-6 border-2 border-dashed rounded-xl transition-colors bg-gray-50/50 ${attemptedNext && errors.ssm_document ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-[#7E57C2]/50"}`}>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-1">SSM Document <span className="text-red-500">*</span></label>
                                    <p className="text-xs text-gray-500 mb-4">Upload SSM certificate or supporting registration document (PDF/Images)</p>
                                    <input
                                        type="file"
                                        name="ssm_document"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#7E57C2] file:text-white hover:file:bg-[#6C4AB8] cursor-pointer"
                                    />
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
