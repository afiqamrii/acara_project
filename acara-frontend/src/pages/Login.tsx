import { useState } from "react";
import axios, { AxiosError } from "axios";

type LoginResponse = {
  message: string;
  role: "user" | "vendor" | "crew" | "admin";
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

  const handleLogin = async (): Promise<void> => {
    try {
      const res = await axios.post<LoginResponse>(
        "http://localhost:5175/api/login",
        { email, password }
      );

      const role = res.data.role;

      switch (role) {
        case "user":
          window.location.href = "/dashboard";
          break;
        case "vendor":
          window.location.href = "/vendor/dashboard";
          break;
        case "crew":
          window.location.href = "/crew/jobs";
          break;
        case "admin":
          window.location.href = "/admin/panel";
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
