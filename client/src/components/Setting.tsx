import { NotificationService } from "../utils/NotificationService";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { useState } from "react";
import ApiClient from "../api/api";
import {
  IoLogOutOutline,
  IoPersonOutline,
  IoColorPaletteOutline,
} from "react-icons/io5";
import {
  useColorSettingsStore,
  colorSchemes,
  type ColorMode,
} from "../stores/colorSettingsStore";

const Settings: React.FC = () => {
  const setIsSubscribe = useAppStore((state) => state.setSubscribed);
  const isSubscribe = useAppStore((state) => state.isSubscribed);
  const { logout, currentUser } = useAuthStore();
  const { colorMode, setColorMode } = useColorSettingsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  
  const handleTestPush = async () => {
    try {
      setTestLoading(true);

      
      const subscription = await NotificationService.getSubscription();

      if (!subscription) {
        console.error("No subscription found. Please subscribe first.");
        alert(
          "No subscription found. Please subscribe to push notifications first."
        );
        return;
      }

      console.log("Sending test push notification:", subscription);

      // Send test push request to server
      const result = await ApiClient.testPush(JSON.stringify(subscription));

      console.log("Test push result:", result);

      // if (result?.success) {
      
      // } else {
      
      // }
    } catch (error) {
      console.error("Test push notification error:", error);
      // alert("An error occurred while sending test push notification.");
    } finally {
      setTestLoading(false);
    }
  };

  // Subscription setup function
  const handleSubscribe = async () => {
    console.log("[Settings] handleSubscribe start");
    try {
      setIsLoading(true);
      console.log("[Settings] Loading state enabled");

      console.log("[Settings] NotificationService.setupPush() called");
      const success = await NotificationService.setupPush();
      console.log(`[Settings] setupPush result: ${success}`);

      if (success) {
        console.log("[Settings] Subscription success, updating state");
        setIsSubscribe(true);
        console.log("[Settings] Push notification subscription successful");
      } else {
        console.error("[Settings] Push notification subscription failed");
      }
    } catch (error) {
      console.error(
        "[Settings] Push notification subscription error:",
        error
      );
      if (error instanceof Error) {
        console.error("[Settings] Error stack:", error.stack);
      }
    } finally {
      console.log("[Settings] Loading state disabled");
      setIsLoading(false);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      setLogoutLoading(true);

      if (currentUser) {
        try {
          // Send logout request to server
          await ApiClient.logout(currentUser);
        } catch (error) {
          console.error("Server logout failed:", error);
        }
      }

      logout();
      // Refresh page to completely reset state
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-4 bg-white gap-6 m-2">
      {/* User Information Section */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <IoPersonOutline size={24} className="text-primary" />
          <h3 className="text-lg font-semibold">User Information</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Currently logged in as</p>
            <p className="font-medium text-lg">{currentUser}</p>
          </div>
        </div>
      </div>

      {/* Color Mode Settings Section */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-3 mb-3">
          <IoColorPaletteOutline size={24} className="text-primary" />
          <h3 className="text-lg font-semibold">Color Palette</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Choose a color scheme optimized for your visual needs
        </p>

        <div className="space-y-3">
          {/* Color palette options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(colorSchemes).map(([mode, scheme]) => (
              <label
                key={mode}
                className={`card cursor-pointer border-2 transition-all ${
                  colorMode === mode
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-primary/50"
                }`}
              >
                <div className="card-body p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="color-mode"
                      className="radio radio-sm radio-primary mt-1"
                      checked={colorMode === mode}
                      onChange={() => setColorMode(mode as ColorMode)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{scheme.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {scheme.description}
                      </div>
                      {/* Color preview for each option */}
                      <div className="flex gap-0.5 mt-2">
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((value) => (
                          <div
                            key={value}
                            className="flex-1 h-6 rounded-sm"
                            style={{
                              backgroundColor: scheme.diverging
                                .copy()
                                .domain([0, 0.5, 1])(value),
                            }}
                            title={`${(value * 100).toFixed(0)}%`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Info about color accessibility */}
          {/* {colorMode !== "default" && (
            <div className="alert alert-info py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-xs">
                Accessible color palettes help users with color vision deficiencies
                distinguish between different values more easily.
              </span>
            </div>
          )} */}
        </div>
      </div>

      {/* Notification Settings Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Notification Settings</h3>
        <div className="flex items-center justify-between mb-4">
          <p>Push Notification</p>
          <div
            className={`badge ${isSubscribe ? "badge-success" : "badge-error"}`}
          >
            {isSubscribe ? "Enabled" : "Disabled"}
          </div>
        </div>

        <button
          className="btn btn-primary w-full mb-3"
          onClick={handleSubscribe}
          disabled={isSubscribe || isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Subscribe to Push Notifications"
          )}
        </button>

        <button
          className="btn btn-outline btn-primary w-full"
          onClick={handleTestPush}
          disabled={!isSubscribe || testLoading}
        >
          {testLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Test Push Notification"
          )}
        </button>
      </div>

      {/* Account Management Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Account Management</h3>
        <button
          className="btn btn-error w-full gap-2"
          onClick={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <>
              <IoLogOutOutline size={18} />
              Logout
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Logging out will end your current session and redirect you to the
          login page.
        </p>
      </div>
    </div>
  );
};

export default Settings;
