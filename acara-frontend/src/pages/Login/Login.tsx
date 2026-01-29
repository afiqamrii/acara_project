import React, { useState } from "react";
import api from "../../services/Api";
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

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user_name", res.data.user.name);

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
    <div className="background">
      <MDBContainer className="gradient-form">
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

          <MDBCol col="6" className="p-0 d-flex justify-content-end">
            <div className="d-flex flex-column justify-content-center gradient-custom-2 h-100 mb-4">
              <div className="text-white px-3 py-4 p-md-5 mx-md-4">
                <h1 className="glowing-title text-6xl font-bold mb-5 animate-glow-text">
                  ACARA
                </h1>
                <h4 className="mt-1">We are Acara Vendor Marketplace</h4>
                <p className="small mb-0">
                  “Making Event Planning Easy for Everyone!”
                </p>
              </div>
            </div>
          </MDBCol>
        </MDBRow>
      </MDBContainer>

    </div>
  );
};

export default Login;
