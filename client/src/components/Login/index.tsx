import React, { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import ApiClient from "../../api/api";
import { useNavigation } from "../../hooks/useNavigation";

const Login: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const { login } = useAuthStore();
  const { handleNavigate } = useNavigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const result = await ApiClient.addUser(userId, password);
        if (result.success) {
          const loginResult = await ApiClient.login(userId);
          if (loginResult.success) {
            login(userId);
            handleNavigate("/workspace");
          } else {
            setError("Sign up successful but login failed.");
          }
        } else {
          setError(result.message || "Sign up failed.");
        }
      } else {
        const result = await ApiClient.login(userId);
        if (result.success) {
          login(userId);
          handleNavigate("/workspace");
        } else {
          setError(result.message || "Login failed.");
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError("Connection error with server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary">HyPockeTuner</h1>
            <p className="text-sm text-gray-500 mt-2">
              {isSignUp ? "Create New Account" : "Login to Continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">User ID</span>
              </label>
              <input
                type="text"
                placeholder="Enter your user ID"
                className="input input-bordered w-full"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {isSignUp && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="input input-bordered w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary w-full ${
                  isLoading ? "loading" : ""
                }`}
                disabled={isLoading || !userId || (isSignUp && !password)}
              >
                {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setPassword("");
            }}
            disabled={isLoading}
          >
            {isSignUp
              ? "Already have an account? Login"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
