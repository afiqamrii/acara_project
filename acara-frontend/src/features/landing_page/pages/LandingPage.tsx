import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import "./LandingPage.css";
import Navbar from "../../header/pages/navbar";

const LandingPage: React.FC = () => {
    useEffect(() => {
        AOS.init({ duration: 800, once: true });
    }, []);

    return (
        <div className="landing-page-wrapper">
            <Navbar />

            {/* Hero Section */}
            <section className="hero-section">
                <div className="background-orbs">
                    <div className="orb orb-1"></div>
                    <div className="orb orb-2"></div>
                    <div className="orb orb-3"></div>
                    <div className="orb orb-4"></div>
                </div>
                <div
                    className="hero-content"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <h1>Welcome to Acara</h1>
                    <h1 className="glowing-title-landing">ACARA</h1>
                    <h1>Plan Your Perfect Malaysian Event</h1>

                    <p className="hero-subtitle">
                        <strong>Stop juggling ten different vendors.</strong>
                        <br />
                        ACARA is the all-in-one platform to find venues, book catering,
                        and hire crew securely.
                    </p>

                    <a href="/login" className="cta-button">
                        Find Vendors Now
                    </a>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section py-5">
                <div className="container">
                    <div className="row text-center">
                        <div className="col-md-4 mb-4 mb-md-0" data-aos="fade-up" data-aos-delay="100">
                            <div className="stat-item">
                                <h2>500+</h2>
                                <p>Curated Venues</p>
                            </div>
                        </div>
                        <div className="col-md-4 mb-4 mb-md-0" data-aos="fade-up" data-aos-delay="200">
                            <div className="stat-item">
                                <h2>100+</h2>
                                <p>Verified Crews</p>
                            </div>
                        </div>
                        <div className="col-md-4" data-aos="fade-up" data-aos-delay="300">
                            <div className="stat-item">
                                <h2>4.9/5</h2>
                                <p>Customer Satisfaction</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section pt-5">
                <div className="container my-5 pb-5">
                    <div className="text-center">
                        <h2 className="section-title" data-aos="fade-up">
                            How It Works
                        </h2>
                    </div>

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
            </section>
        </div>
    );
};

export default LandingPage;