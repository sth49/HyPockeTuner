import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import Login from "../Login";
import LoadingSpinner from "../LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      try {
        await checkAuth();
      } catch (error) {
        console.error("Authentication verification error:", error);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    if (!authChecked) {
      verifyAuth();
    } else {
      setIsLoading(false);
    }
  }, [checkAuth, authChecked]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;