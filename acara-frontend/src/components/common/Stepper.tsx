import React, { useState, Children, useRef, useLayoutEffect, type HTMLAttributes, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    initialStep?: number;
    onStepChange?: (step: number) => void;
    onFinalStepCompleted?: () => void;
    stepCircleContainerClassName?: string;
    stepContainerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
    backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    backButtonText?: string;
    nextButtonText?: string;
    disableStepIndicators?: boolean;
    renderStepIndicator?: (props: {
        step: number;
        currentStep: number;
        onStepClick: (clicked: number) => void;
    }) => ReactNode;
    isStepValid?: (step: number) => boolean;
    isLoading?: boolean;
}

export default function Stepper({
    children,
    initialStep = 1,
    onStepChange = () => { },
    onFinalStepCompleted = () => { },
    stepCircleContainerClassName = '',
    stepContainerClassName = '',
    contentClassName = '',
    footerClassName = '',
    backButtonProps = {},
    nextButtonProps = {},
    backButtonText = 'Back',
    nextButtonText = 'Continue',
    disableStepIndicators = false,
    renderStepIndicator,
    isStepValid = () => true,
    isLoading = false,
    ...rest
}: StepperProps) {
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const [direction, setDirection] = useState<number>(0);
    const stepsArray = Children.toArray(children);
    const totalSteps = stepsArray.length;
    const isCompleted = currentStep > totalSteps;
    const isLastStep = currentStep === totalSteps;

    const updateStep = (newStep: number) => {
        setCurrentStep(newStep);
        if (newStep > totalSteps) {
            onFinalStepCompleted();
        } else {
            onStepChange(newStep);
        }
    };

    const handleBack = () => {
        if (currentStep > 1 && !isLoading) {
            setDirection(-1);
            updateStep(currentStep - 1);
        }
    };

    const handleNext = () => {
        if (isLoading) return;
        if (!isStepValid(currentStep)) return;

        if (!isLastStep) {
            setDirection(1);
            updateStep(currentStep + 1);
        }
    };

    const handleComplete = () => {
        if (isLoading) return;
        if (!isStepValid(currentStep)) return;

        // Don't auto-advance here if we want to wait for async operation.
        // The parent should trigger completion logic. 
        // Logic: calls onFinalStepCompleted. Parent handles submission. 
        // If parent sets isLoading, we just show loading. 
        // We typically wait for parent to navigate away or set success.
        onFinalStepCompleted();
        // setDirection(1); 
        // updateStep(totalSteps + 1); // Removed auto-advance to allow parent to handle success state/navigation
    };

    // ... (rest of rendering)

    return (
        <div
            className="flex min-h-full flex-1 flex-col items-center justify-center p-4"
            {...rest}
        >
            <div
                className={`mx-auto w-full max-w-4xl rounded-3xl shadow-xl bg-white ${stepCircleContainerClassName}`}
                style={{ border: '1px solid #e5e7eb' }}
            >
                <div className={`${stepContainerClassName} flex w-full items-center p-8 overflow-x-auto`}>
                    {stepsArray.map((_, index) => {
                        const stepNumber = index + 1;
                        const isNotLastStep = index < totalSteps - 1;
                        return (
                            <React.Fragment key={stepNumber}>
                                {renderStepIndicator ? (
                                    renderStepIndicator({
                                        step: stepNumber,
                                        currentStep,
                                        onStepClick: clicked => {
                                            if (!isLoading) {
                                                if (clicked > currentStep) {
                                                    if (isStepValid && !isStepValid(currentStep)) {
                                                        return;
                                                    }
                                                }
                                                setDirection(clicked > currentStep ? 1 : -1);
                                                updateStep(clicked);
                                            }
                                        }
                                    })
                                ) : (
                                    <StepIndicator
                                        step={stepNumber}
                                        disableStepIndicators={disableStepIndicators || isLoading}
                                        currentStep={currentStep}
                                        onClickStep={clicked => {
                                            if (!isLoading) {
                                                // Prevent skipping ahead if current step is invalid
                                                if (clicked > currentStep) {
                                                    if (isStepValid && !isStepValid(currentStep)) {
                                                        return;
                                                    }
                                                }
                                                setDirection(clicked > currentStep ? 1 : -1);
                                                updateStep(clicked);
                                            }
                                        }}
                                    />
                                )}
                                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
                            </React.Fragment>
                        );
                    })}
                </div>

                <StepContentWrapper
                    isCompleted={isCompleted}
                    currentStep={currentStep}
                    direction={direction}
                    className={`space-y-4 px-8 ${contentClassName}`}
                >
                    {stepsArray[currentStep - 1]}
                </StepContentWrapper>

                {!isCompleted && (
                    <div className={`px-8 pb-8 ${footerClassName}`}>
                        <div className={`mt-10 flex ${currentStep !== 1 ? 'justify-between' : 'justify-end'}`}>
                            {currentStep !== 1 && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    disabled={isLoading}
                                    className={`duration-350 rounded px-4 py-2 transition font-medium ${(currentStep === 1 || isLoading)
                                        ? 'pointer-events-none opacity-50 text-gray-400'
                                        : 'text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200'
                                        }`}
                                    {...backButtonProps}
                                >
                                    {backButtonText}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={isLastStep ? handleComplete : handleNext}
                                disabled={isLoading}
                                className={`duration-350 flex items-center justify-center rounded-xl py-2.5 px-6 font-medium tracking-wide text-white transition shadow-md ${isLoading
                                    ? 'bg-[#7E57C2]/70 cursor-wait'
                                    : 'bg-[#7E57C2] hover:bg-[#6C4AB8] active:scale-95 hover:shadow-lg'
                                    }`}
                                {...nextButtonProps}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Processing...</span>
                                    </div>
                                ) : (
                                    isLastStep ? 'Complete Registration' : nextButtonText
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface StepContentWrapperProps {
    isCompleted: boolean;
    currentStep: number;
    direction: number;
    children: ReactNode;
    className?: string;
}

function StepContentWrapper({
    isCompleted,
    currentStep,
    direction,
    children,
    className = ''
}: StepContentWrapperProps) {
    const [parentHeight, setParentHeight] = useState<number>(0);

    return (
        <motion.div
            style={{ position: 'relative', overflow: 'hidden' }}
            animate={{ height: isCompleted ? 0 : parentHeight }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={className}
        >
            <AnimatePresence initial={false} mode="wait" custom={direction}>
                {!isCompleted && (
                    <SlideTransition key={currentStep} direction={direction} onHeightReady={h => setParentHeight(h)}>
                        {children}
                    </SlideTransition>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

interface SlideTransitionProps {
    children: ReactNode;
    direction: number;
    onHeightReady: (height: number) => void;
}

function SlideTransition({ children, direction, onHeightReady }: SlideTransitionProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        if (containerRef.current) {
            onHeightReady(containerRef.current.offsetHeight);
        }
    }, [children, onHeightReady]); // Re-run when children change

    // Additional effect to handle dynamic content resizing within the step
    useLayoutEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                onHeightReady(entries[0].contentRect.height);
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [onHeightReady]);


    return (
        <motion.div
            ref={containerRef}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
        >
            {children}
        </motion.div>
    );
}

const stepVariants: Variants = {
    enter: (dir: number) => ({
        x: dir >= 0 ? '10%' : '-10%',
        opacity: 0
    }),
    center: {
        x: '0%',
        opacity: 1
    },
    exit: (dir: number) => ({
        x: dir >= 0 ? '-10%' : '10%',
        opacity: 0
    })
};

interface StepProps {
    children: ReactNode;
}

export function Step({ children }: StepProps) {
    return <div className="px-1 py-1">{children}</div>;
}

interface StepIndicatorProps {
    step: number;
    currentStep: number;
    onClickStep: (clicked: number) => void;
    disableStepIndicators?: boolean;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators = false }: StepIndicatorProps) {
    const status = currentStep === step ? 'active' : currentStep > step ? 'complete' : 'inactive'; // Adjusted logic: completed if step < currentStep

    const handleClick = () => {
        if (step !== currentStep && !disableStepIndicators) {
            onClickStep(step);
        }
    };

    return (
        <motion.div
            onClick={handleClick}
            className={`relative cursor-pointer outline-none focus:outline-none flex flex-col items-center gap-2`} // added flex col for potential label
            animate={status}
            initial={false}
        >
            <motion.div
                variants={{
                    inactive: { scale: 1, backgroundColor: '#f3f4f6', color: '#9ca3af', borderColor: '#e5e7eb' }, // gray-100, gray-400
                    active: { scale: 1.1, backgroundColor: '#7E57C2', color: '#ffffff', borderColor: '#7E57C2' },
                    complete: { scale: 1, backgroundColor: '#ede9fe', color: '#7E57C2', borderColor: '#7E57C2' } // purple-50
                }}
                transition={{ duration: 0.3 }}
                className="flex h-10 w-10 items-center justify-center rounded-full font-semibold border-2 z-10"
            >
                {status === 'complete' ? (
                    <CheckIcon className="h-5 w-5" />
                ) : (
                    <span className="text-sm">{step}</span>
                )}
            </motion.div>
        </motion.div>
    );
}

interface StepConnectorProps {
    isComplete: boolean;
}

function StepConnector({ isComplete }: StepConnectorProps) {
    const lineVariants: Variants = {
        incomplete: { width: 0, backgroundColor: 'transparent' },
        complete: { width: '100%', backgroundColor: '#7E57C2' }
    };

    return (
        <div className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded bg-gray-200">
            <motion.div
                className="absolute left-0 top-0 h-full"
                variants={lineVariants}
                initial={false}
                animate={isComplete ? 'complete' : 'incomplete'}
                transition={{ duration: 0.4 }}
            />
        </div>
    );
}

interface CheckIconProps extends React.SVGProps<SVGSVGElement> { }

function CheckIcon(props: CheckIconProps) {
    return (
        <svg {...props} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                    delay: 0.1,
                    type: 'tween',
                    ease: 'easeOut',
                    duration: 0.3
                }}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
            />
        </svg>
    );
}
