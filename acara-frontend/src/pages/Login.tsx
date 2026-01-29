import { useState } from "react";
import api from "../services/Api";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom"; // Use navigate instead of window.location

type LoginResponse = {
  message: string;
  role: "user" | "vendor" | "crew" | "admin";
  token: string; // Added token to the response type
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
};

function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = async (): Promise<void> => {
    try {
      const res = await api.post<LoginResponse>("/login", { email, password });

      // 1. Save credentials to localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user_name", res.data.user.name);

      const role = res.data.role;

      // 2. Navigate without a full page refresh
      switch (role) {
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
      }

    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login">
      <h2>Login to ACARA</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;