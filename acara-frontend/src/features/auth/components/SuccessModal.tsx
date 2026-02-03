import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SuccessModalProps {
    isOpen: boolean;
    onClose?: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
        navigate('/login');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center transform transition-all scale-100">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h2>
                <p className="text-gray-500 mb-8">
                    We've sent a verification link to your email address. Please click the link to activate your account.
                </p>

                <button
                    onClick={handleClose}
                    className="w-full bg-[#7E57C2] hover:bg-[#6C4AB8] text-white font-medium py-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default SuccessModal;
