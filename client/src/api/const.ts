// API URLs - automatically switch between development and production
const isDev = import.meta.env.DEV;

// Production URLs (configure these for your deployment)
const PROD_SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://your-server.example.com/";
const PROD_SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "wss://your-server.example.com/";

// Development URLs
const DEV_SERVER_URL = "http://localhost:8080/";
const DEV_SOCKET_URL = "ws://localhost:8080/";

export const SERVER_URL = isDev ? DEV_SERVER_URL : PROD_SERVER_URL;
export const SOCKET_URL = isDev ? DEV_SOCKET_URL : PROD_SOCKET_URL;
