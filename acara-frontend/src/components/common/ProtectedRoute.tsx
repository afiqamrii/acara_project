import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string[];
}

/**
 * Wraps any route that requires authentication.
 * - No token → redirect to /login
 * - Token exists but role doesn't match requiredRole → redirect to /dashboard
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") || "user";

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && requiredRole.length > 0 && !requiredRole.includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
