import React from 'react';
import './Loader.css';

type LoaderProps = {
    title?: string;
    message?: string;
    fullScreen?: boolean;
};

const Loader: React.FC<LoaderProps> = ({
    title = 'ACARA',
    message = 'Preparing your experience...',
    fullScreen = false,
}) => {
    return (
        <div
            className={`page-loader ${fullScreen ? 'min-h-screen' : 'min-h-64'} flex w-full items-center justify-center overflow-hidden`}
            role="status"
            aria-live="polite"
        >
            <div className="page-loader__ambient page-loader__ambient--coral" />
            <div className="page-loader__ambient page-loader__ambient--violet" />

            <div className="page-loader__content">
                <div className="page-loader__mark" aria-hidden="true">
                    <div className="page-loader__orbit page-loader__orbit--outer" />
                    <div className="page-loader__orbit page-loader__orbit--inner" />
                    <div className="page-loader__letter">A</div>
                </div>

                <div className="text-center">
                    <p className="page-loader__eyebrow">{title}</p>
                    <p className="page-loader__message">{message}</p>
                </div>

                <div className="page-loader__bar" aria-hidden="true">
                    <span />
                </div>
            </div>
        </div>
    );
};

export default Loader;
