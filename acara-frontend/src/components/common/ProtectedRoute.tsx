import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string[];
}

const homeForRole = (role: string) => {
    switch (role) {
        case "admin":
        case "super_admin":
            return "/admin/dashboard";
        case "vendor":
            return "/vendor/dashboard";
        case "crew":
            return "/crew/jobs";
        default:
            return "/dashboard";
    }
};

/**
 * Wraps any route that requires authentication.
 * - No token → redirect to /login
 * - Token exists but role doesn't match requiredRole → redirect to that role's home
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") || "user";

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && requiredRole.length > 0 && !requiredRole.includes(role)) {
        return <Navigate to={homeForRole(role)} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
