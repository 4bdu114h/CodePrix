import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * AdminRoute — gates children to admin-only users.
 *
 * If the user is not an admin, they are redirected to /dashboard.
 * Note: this is a UI convenience only. The real security boundary is
 * the backend `verifyAdmin` middleware which validates the JWT signature.
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isAdmin, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="font-body text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default AdminRoute;
