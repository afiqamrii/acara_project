import React, { useState } from "react";
import api from "../../../lib/Api";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import './Login.css';
import {
  MDBBtn,
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBInput,
} from "mdb-react-ui-kit";
import Navbar from '../../header/pages/navbar';

type LoginResponse = {
  message: string;
  role: "user" | "vendor" | "crew" | "admin";
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
};

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setSuccessMsg("Verification successful! You can now log in.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/login", {
        email,
        password,
      });

      // localStorage.setItem("token", res.data.token);
      // localStorage.setItem("role", res.data.role);
      // localStorage.setItem("user_name", res.data.user.name);
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: res.data.token,
          role: res.data.role,
          user: res.data.user,
        })
      );
      // api.interceptors.request.use((config) => {
      //   const auth = localStorage.getItem("auth");
      //   if (auth) {
      //     const { token } = JSON.parse(auth);
      //     config.headers.Authorization = `Bearer ${token}`;
      //   }
      //   return config;
      // });

      switch (res.data.role) {
        case "user":
          navigate("/");
          break;
        case "vendor":
          navigate("/dashboard");
          break;
        case "crew":
          navigate("/crew/jobs");
          break;
        case "admin":
          navigate("/admin/panel");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <Navbar />
      <div className="background">

        <MDBContainer fluid className="p-0 gradient-form">
          <MDBRow className="g-0 min-vh-100">
            <MDBCol col="6" className="p-0 d-flex align-items-center justify-content-center">
              <div className="glass-card w-70 mx-6">
                <div className="text-center">
                  <img
                    src="src/img/acara-logo.png"
                    style={{ width: "185px" }}
                    alt="logo"
                  />

                </div>




                {successMsg && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{successMsg}</span>
                  </div>
                )}

                <h3 className="login-title">Welcome back !</h3>
                <p className="login-subtitle">
                  Log in to manage your events & vendors
                </p>

                <form onSubmit={handleLogin}>
                  <MDBInput
                    wrapperClass="mb-4"
                    label="Email address"
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <MDBInput
                    wrapperClass="mb-4"
                    label="Password"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <MDBBtn
                    type="submit"
                    className="mb-4 w-100 gradient-custom-2"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </MDBBtn>
                </form>

                <a className="text-muted text-center" href="#!">
                  Forgot password?
                </a>

                <div className="d-flex flex-row align-items-center justify-content-center pb-4 mt-4">
                  <p className="mb-0">Don't have an account?</p>
                  <MDBBtn
                    outline
                    className="mx-2"
                    color="danger"
                    onClick={() => navigate("/register")}
                  >
                    Register
                  </MDBBtn>
                </div>
              </div>
            </MDBCol>

            <MDBCol col="6">
              <div className="gradient-custom-2 h-100 position-relative w-100 d-flex flex-column justify-content-center">
                <img src="src/img/audience.png" alt="background" className="position-absolute top-0 start-0 w-100 h-100"
                  style={{ objectFit: 'cover', zIndex: 0, opacity: 0.2 }} />
                <div className="text-white px-3 py-4 p-md-5 mx-md-4 position-relative" style={{ zIndex: 1 }}>
                  <h1 className="glowing-title text-6xl font-bold mb-5 animate-glow-text"> ACARA </h1>

                  <h4 className="mb-2">Vendor Marketplace</h4>

                  <p className="tagline mb-4">
                    Making Event Planning Easy for Everyone
                  </p>

                  <ul className="benefits-list d-flex flex-column align-items-start">
                    <li>Manage all events in one place</li>
                    <li>Connect with trusted vendors</li>
                    <li>Track bookings & payments</li>
                    <li>Grow your vendor business</li>
                  </ul>
                </div>

              </div>
            </MDBCol>
          </MDBRow>
        </MDBContainer>

      </div>
    </div >
  );
};

export default Login;
