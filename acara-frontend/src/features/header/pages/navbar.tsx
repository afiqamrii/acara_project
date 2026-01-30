import { useNavigate } from "react-router-dom";
import './navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("user_name");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-left">
        <h1 className="navbar-logo">ACARA</h1>
       
      </div>

      <div className="navbar-right">
          {token ? (
          <>
            <span className="navbar-user">Hi, {userName}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => navigate("/login")}>Login</button>
        )}
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/marketplace")}>Marketplace</button>

        {/* Cart icon (SVG, no deps) */}
        <button className="cart-btn" onClick={() => navigate("/cart")}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.6 13h10.4l2-8H6" />
          </svg>
          <span className="cart-badge">0</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
