import React from "react";
import { MDBContainer, MDBRow, MDBCol, MDBInput, MDBBtn } from "mdb-react-ui-kit";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Register.css";

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(false);
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [formData, setFormData] = React.useState({
        name: "",
        email: "",
        phone_number: "",
        password: "",
        password_confirmation: "",
        role: "user",
        ssm_registration: "",
    });

    const slides = [
        {
            title: "Find Your Sweet Home",
            description: "Visiting your dream property is now just a few clicks away — fast, easy, reliable.",
            bgImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Manage Events Anywhere",
            description: "ACARA connects organizers with the best vendors and crew in one seamless marketplace.",
            bgImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Grow Your Business",
            description: "Join a growing community of event professionals. Scale your business with ease.",
            bgImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070&auto=format&fit=crop"
        }
    ];

    // Auto-slide
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            if (formData.role !== "vendor") {
                delete (payload as { ssm_registration?: string }).ssm_registration;
            }
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/register`, payload);
            navigate("/login");
        } catch (error) {
            console.error("Registration failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <MDBContainer fluid className="p-0 h-100">
                <MDBRow className="g-0 h-100">

                    {/* LEFT SIDE - Image + Text Overlay */}
                    <MDBCol lg="6" className="d-none d-lg-block left-panel">
                        {/* Background Images */}
                        {slides.map((slide, index) => (
                            <div
                                key={index}
                                className={`bg-slide ${index === currentSlide ? 'active' : ''}`}
                                style={{ backgroundImage: `url(${slide.bgImage})` }}
                            />
                        ))}

                        {/* Dark Overlay */}
                        <div className="dark-overlay" />

                        {/* Content */}
                        <div className="left-content">
                            {/* Logo */}
                            <div className="logo-pill">
                                <img src="src/img/acara-logo.png" alt="ACARA" />
                                <span>ACARA</span>
                            </div>

                            {/* Text at Bottom */}
                            <div className="hero-text-area">
                                {slides.map((slide, index) => (
                                    <div key={index} className={`slide-text ${index === currentSlide ? 'active' : ''}`}>
                                        <h1>{slide.title}</h1>
                                        <p>{slide.description}</p>
                                    </div>
                                ))}

                                {/* Indicators */}
                                <div className="slide-indicators">
                                    {slides.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`indicator-line ${index === currentSlide ? 'active' : ''}`}
                                            onClick={() => setCurrentSlide(index)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </MDBCol>

                    {/* RIGHT SIDE - Form */}
                    <MDBCol lg="6" md="12" className="right-panel">
                        <div className="form-wrapper">
                            <h2 className="form-title">Create an account</h2>

                            {/* Role Tabs */}
                            <div className="role-tabs">
                                <button
                                    className={formData.role === 'user' ? 'active' : ''}
                                    onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                                >
                                    <i className="fas fa-user me-2"></i>User
                                </button>
                                <button
                                    className={formData.role === 'organizer' ? 'active' : ''}
                                    onClick={() => setFormData(prev => ({ ...prev, role: 'organizer' }))}
                                >
                                    <i className="fas fa-calendar-alt me-2"></i>Organizer
                                </button>
                                <button
                                    className={formData.role === 'vendor' ? 'active' : ''}
                                    onClick={() => setFormData(prev => ({ ...prev, role: 'vendor' }))}
                                >
                                    <i className="fas fa-store me-2"></i>Vendor
                                </button>
                            </div>

                            <form onSubmit={handleRegister}>
                                <MDBInput wrapperClass="mb-3 input-field" label="Full Name" id="name" type="text" value={formData.name} onChange={handleInputChange} required />
                                <MDBInput wrapperClass="mb-3 input-field" label="Email address" id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                                <MDBInput wrapperClass="mb-3 input-field" label="Phone Number" id="phone_number" type="tel" value={formData.phone_number} onChange={handleInputChange} required />

                                {formData.role === 'vendor' && (
                                    <MDBInput wrapperClass="mb-3 input-field" label="SSM Registration Number" id="ssm_registration" type="text" value={formData.ssm_registration} onChange={handleInputChange} required />
                                )}

                                <MDBRow>
                                    <MDBCol md="6">
                                        <MDBInput wrapperClass="mb-4 input-field" label="Password" id="password" type="password" value={formData.password} onChange={handleInputChange} required />
                                    </MDBCol>
                                    <MDBCol md="6">
                                        <MDBInput wrapperClass="mb-4 input-field" label="Confirm Password" id="password_confirmation" type="password" value={formData.password_confirmation} onChange={handleInputChange} required />
                                    </MDBCol>
                                </MDBRow>

                                <MDBBtn type="submit" className="w-100 submit-btn" disabled={loading}>
                                    {loading ? "Creating Account..." : "Create an Account"}
                                </MDBBtn>
                            </form>

                            <p className="login-link">
                                Already have an account? <span onClick={() => navigate("/login")}>Log In</span>
                            </p>
                        </div>
                    </MDBCol>
                </MDBRow>
            </MDBContainer>
        </div>
    );
};

export default Register;
