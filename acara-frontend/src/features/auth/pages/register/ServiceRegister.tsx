import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { registerService } from "../../vendorApi";

// import { UserSidebar } from "../../../header/pages/UserSidebar";
import Stepper from "../../../../components/common/Stepper";
import { capitalizeFirstLetter, toTitleCase } from "../../../../utils/formHelpers";

const ServiceRegister: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        service_name: "",
        service_category: "",
        service_category_other: "",
        service_details: "",
        pricing_starting_from: "",
        pricing_unit: "",
        pricing_description: ""
    });

    const [files, setFiles] = useState<{
        portfolio: File | null;
    }>({
        portfolio: null,
    });

    // Validation State
    const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
    const [attemptedNext, setAttemptedNext] = useState(false);

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        let formattedValue = value;

        // Apply formatting logic based on field name
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
            if (['service_details', 'pricing_description'].includes(name)) {
                // Step 2: Sentence Case (First letter only)
                formattedValue = capitalizeFirstLetter(value);
            } else if (['service_name', 'service_category_other'].includes(name)) {
                // Step 1 & 3: Title Case (Every word)
                formattedValue = toTitleCase(value);
            }
            // other text fields (if any) or textarea will be handled below or ignored
        } else if (e.target.tagName === 'TEXTAREA') {
            if (['service_details', 'pricing_description'].includes(name)) {
                formattedValue = capitalizeFirstLetter(value);
            }
        }

        setFormData((prev) => ({ ...prev, [name]: formattedValue }));

        // Clear error on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: fileList } = e.target;
        if (fileList && fileList[0]) {
            setFiles((prev) => ({ ...prev, [name]: fileList[0] }));
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: false }));
            }
        }
    };

    // Validation Logic
    const validateStep = (step: number) => {
        const newErrors: { [key: string]: boolean } = {};
        let isValid = true;

        if (step === 1) {
            if (!formData.service_name) newErrors.service_name = true;
            if (!formData.service_category) newErrors.service_category = true;
            if (formData.service_category === 'Other' && !formData.service_category_other) newErrors.service_category_other = true;
        }
        else if (step === 2) {
            if (!formData.service_details) newErrors.service_details = true;
            if (!formData.pricing_starting_from) newErrors.pricing_starting_from = true;
            if (!formData.pricing_unit) newErrors.pricing_unit = true;
        }
        else if (step === 3) {
            if (!files.portfolio) newErrors.portfolio = true;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        return isValid;
    };

    const isStepValid = (step: number) => {
        const valid = validateStep(step);
        if (!valid) {
            setAttemptedNext(true);
        } else {
            setAttemptedNext(false);
        }
        return valid;
    };

    const handleSubmit = async () => {
        // Validate all previous steps before submitting
        const isStep1Valid = validateStep(1);
        const isStep2Valid = validateStep(2);
        const isStep3Valid = validateStep(3); // Current step

        if (!isStep1Valid) {
            setSubmitError("Please complete all required fields in Step 1 (Service Details).");
            setAttemptedNext(true); // Show errors
            return;
        }
        if (!isStep2Valid) {
            setSubmitError("Please complete all required fields in Step 2 (Services & Pricing).");
            setAttemptedNext(true);
            return;
        }
        if (!isStep3Valid) {
            setAttemptedNext(true);
            return;
        }

        setIsLoading(true);
        setSubmitError(null);

        try {
            const data = new FormData();

            const finalCategory = formData.service_category === 'Other' ? formData.service_category_other : formData.service_category;

            data.append('service_name', formData.service_name);
            data.append('service_category', finalCategory);
            data.append('service_details', formData.service_details);

            // Structured Pricing matches backend
            data.append('pricing_starting_from', formData.pricing_starting_from);
            data.append('pricing_unit', formData.pricing_unit);
            data.append('pricing_description', formData.pricing_description || "");

            if (files.portfolio) data.append("portfolio", files.portfolio);

            await registerService(data);
            setSuccess(true);
        } catch (err: any) {
            console.error("Service registration failed:", err);
            setSubmitError(err.response?.data?.message || "Failed to submit service registration. Please try again.");
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex h-screen w-full overflow-hidden bg-gray-50">
               
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
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
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
                        <p className="text-gray-600 mb-8">
                            Your service profile has been successfully created. We will review your submission and update you shortly.
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
           

            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start pt-10 pb-12 px-4">
                <div className="w-full max-w-4xl mb-6">
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
                                    <span className="ml-1 text-sm font-medium text-gray-400 md:ml-2">Service Application</span>
                                </div>
                            </li>
                        </ol>
                    </nav>
                </div>
                <div className="text-center mb-10 w-full max-w-4xl">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Register Your Service</h1>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        Share your service details accurately so we can review and publish your profile.
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
                        contentClassName="min-h-0 py-4" // Reduced spacing
                    >
                        {/* Step 1: Business Basics */}
                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Service Details</h2>
                            <p className="text-gray-500 mb-6 text-sm">Core information about the service you provide.</p>

                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Service/Product Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.service_name ? 'border-red-500 ring-red-200' : 'border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]'
                                            }`}
                                        placeholder="Enter your service or product name"
                                        name="service_name"
                                        value={formData.service_name}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                name="service_category"
                                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none ${attemptedNext && errors.service_category ? 'border-red-500 ring-red-200' : 'border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]'
                                                    }`}
                                                value={formData.service_category}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Select a category</option>
                                                <option value="Photography">Photography</option>
                                                <option value="Catering">Catering</option>
                                                <option value="Venue">Venue</option>
                                                <option value="Entertainment">Entertainment</option>
                                                <option value="Decor">Decor</option>
                                                <option value="Makeup">Makeup & Hair</option>
                                                <option value="Attire">Attire</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>

                                        {formData.service_category === 'Other' && (
                                            <div className="mt-3">
                                                <input
                                                    type="text"
                                                    name="service_category_other"
                                                    className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${attemptedNext && errors.service_category_other ? 'border-red-500 ring-red-200' : 'border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]'
                                                        }`}
                                                    placeholder="Specify your category"
                                                    value={formData.service_category_other}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Service Details */}
                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Services & Pricing</h2>
                            <p className="text-gray-500 mb-6 text-sm">Describe what you offer to clients.</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Detail Service <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="service_details"
                                        rows={4}
                                        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none ${attemptedNext && errors.service_details ? 'border-red-500 ring-red-200' : 'border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]'
                                            }`}
                                        placeholder="Describe your service or product in detail..."
                                        value={formData.service_details}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pricing Structure <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                        <div className="relative">
                                            <span className="absolute left-4 top-2.5 text-gray-500 font-medium">RM</span>
                                            <input
                                                type="number"
                                                name="pricing_starting_from"
                                                className={`w-full pl-12 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none ${attemptedNext && errors.pricing_starting_from ? 'border-red-500 ring-red-200' : 'border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]'
                                                    }`}
                                                placeholder="Starting Price"
                                                value={formData.pricing_starting_from}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="relative">
                                            <select
                                                name="pricing_unit"
                                                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all appearance-none ${attemptedNext && errors.pricing_unit ? 'border-red-500 ring-red-200' : 'border-gray-200 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2]'
                                                    }`}
                                                value={formData.pricing_unit}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Select Unit</option>
                                                <option value="Per Hour">Per Hour</option>
                                                <option value="Per Pax">Per Pax</option>
                                                <option value="Per Event">Per Event</option>
                                                <option value="Per Item">Per Item</option>
                                                <option value="Per Day">Per Day</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <textarea
                                        name="pricing_description"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7E57C2]/20 focus:border-[#7E57C2] transition-all resize-none"
                                        placeholder="Additional pricing details (optional)..."
                                        value={formData.pricing_description}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Portfolio */}
                        <div className="w-full px-2 md:px-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Portfolio</h2>
                            <p className="text-gray-500 mb-6 text-sm">Upload supporting samples so we can review your service offering.</p>

                            <div className="space-y-6">
                                <div className={`p-6 border-2 border-dashed rounded-xl transition-colors bg-gray-50/50 ${attemptedNext && errors.portfolio ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-[#7E57C2]/50'
                                    }`}>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-purple-100 text-[#7E57C2] rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-1">Portfolio <span className="text-red-500">*</span></label>
                                        <p className="text-xs text-gray-500 mb-4">Upload work samples, past projects, or product visuals (PDF/Images)</p>
                                        <input
                                            type="file"
                                            name="portfolio"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#7E57C2] file:text-white hover:file:bg-[#6C4AB8] cursor-pointer"
                                        />
                                        {files.portfolio && <p className="mt-2 text-xs text-green-600 font-medium truncate">{files.portfolio.name}</p>}
                                        {attemptedNext && errors.portfolio && <p className="text-red-500 text-xs mt-2">File required</p>}
                                    </div>
                                </div>
                                {isLoading && (
                                    <div className="text-center text-sm text-[#7E57C2] animate-pulse font-medium">
                                        Submitting your application... do not close current window
                                    </div>
                                )}
                            </div>
                        </div>
                    </Stepper>
                </div>
            </div>
        </div>
    );
};

export default ServiceRegister;
