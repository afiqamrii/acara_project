import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

const LandingPage: React.FC = () => {
    useEffect(() => {
        AOS.init({ duration: 800, once: true });
    }, []);

    return (
        <>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="background-orbs">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div className="orb" key={index}></div>
                    ))}
                </div>
                <div
                    className="hero-content"
                    style={{ paddingTop: '15rem' }}
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    {/* Your Hero content goes here */}
                    <h1>Welcome to Acara</h1>
                    <h1 className="glowing-title">ACARA</h1>
                    <h1>Plan Your Perfect Malaysian Event</h1>

                    <p>
                        <strong>Stop juggling ten different vendors.</strong>
                        <br />
                        ACARA is the all-in-one platform to find venues, book catering,
                        and hire crew securely.
                    </p>

                    <a href="/login" className="cta-button">
                        Find Vendors Now
                    </a>
                </div>
            </section >

            {/* How It Works Section */}
            < section className="how-it-works-section animated-purple-bg py-5" >
                <div className="container my-5 py-5">
                    <h2 className="text-center section-title" data-aos="fade-up">
                        How It Works
                    </h2>

                    <div className="row text-center mt-5">
                        <div
                            className="col-md-4 mb-4"
                            data-aos="zoom-in-up"
                            data-aos-delay="100"
                        >
                            <div className="how-it-works-card">
                                <div className="how-it-works-icon">
                                    <i className="fas fa-search"></i>
                                </div>
                                <h3>1. Discover</h3>
                                <p>
                                    Browse our marketplace of curated vendors for every type of
                                    event.
                                </p>
                            </div>
                        </div>

                        <div
                            className="col-md-4 mb-4"
                            data-aos="zoom-in-up"
                            data-aos-delay="200"
                        >
                            <div className="how-it-works-card">
                                <div className="how-it-works-icon">
                                    <i className="fas fa-comments"></i>
                                </div>
                                <h3>2. Connect</h3>
                                <p>
                                    Chat with vendors, get quotes, and manage your bookings all in
                                    one place.
                                </p>
                            </div>
                        </div>

                        <div
                            className="col-md-4 mb-4"
                            data-aos="zoom-in-up"
                            data-aos-delay="300"
                        >
                            <div className="how-it-works-card">
                                <div className="how-it-works-icon">
                                    <i className="fas fa-calendar-check"></i>
                                </div>
                                <h3>3. Book</h3>
                                <p>
                                    Securely book your chosen vendor and start planning your event.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section >
        </>
    );
};

export default LandingPage;