/* eslint-disable @typescript-eslint/no-explicit-any */
import { io } from "socket.io-client";
import { SOCKET_URL } from "./const";
import { useAppStore } from "../stores/appStore";
import { useExperimentStore } from "../stores/experimentStore";
import { useMetadataStore } from "../stores/metadataStore";
import { useAuthStore } from "../stores/authStore";
import { createExpSummary, SummaryData } from "../types";
import { createExpOption } from "../types/option";

function log(...args: any[]) {
  console.info("Socket", ...args);
}


let globalSocketInstance: any = null;
let instanceCreationTime: number = 0;

export class Backend {
  socket: any;
  active: boolean = false;
  events: any[] = [];
  recentId: number = 0;
  lastViewedId: number = 0;
  isConnecting: boolean = false;
  reconnectAttempts: number = 0;
  maxReconnectAttempts: number = 3;
  instanceId: string;

  constructor() {
    
    this.instanceId = `backend_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`🏗️ Backend instance created: ${this.instanceId}`);

    
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });

    
    if (typeof window !== "undefined") {
      
      if ((window as any).webpackHotUpdate || (import.meta as any)?.hot) {
        console.log("🔥 Development mode detected - setting up HMR cleanup");

        // Vite HMR
        if ((import.meta as any)?.hot) {
          (import.meta as any).hot.dispose(() => {
            console.log("🔥 Vite HMR disposing, cleaning up socket");
            this.cleanup();
          });
        }
      }
    }
  }

  connect() {
    console.log(`🔄 Connect called on instance: ${this.instanceId}`, {
      connected: this.socket?.connected,
      isConnecting: this.isConnecting,
      socketExists: !!this.socket,
      globalSocketExists: !!globalSocketInstance,
    });

    
    if (globalSocketInstance && globalSocketInstance.connected) {
      const timeSinceCreation = Date.now() - instanceCreationTime;

      
      if (timeSinceCreation < 5000) {
        console.log("♻️ Reusing existing global socket instance");
        this.socket = globalSocketInstance;

        
        const { setIsSocketConnected } = useAppStore.getState();
        setIsSocketConnected(true);

        
        this.socket.removeAllListeners();
        this.setupSocketEvents();

        return;
      } else {
        console.log("⏰ Global socket too old, creating new one");
        this.cleanupGlobalSocket();
      }
    }

    
    if (this.socket && this.socket !== globalSocketInstance) {
      console.log("🧹 Cleaning up instance socket");
      this.cleanup();
    }

    this.isConnecting = true;
    this.reconnectAttempts = 0;

    
    this.socket = io(SOCKET_URL, {
      transports: ["polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      forceNew: true,
      upgrade: false,
      rememberUpgrade: false,
      timeout: 10000,
      query: {
        clientVersion: "1.0",
        timestamp: Date.now(),
        instanceId: this.instanceId,
      },
    });

    
    globalSocketInstance = this.socket;
    instanceCreationTime = Date.now();

    this.setupSocketEvents();
  }

  

  private setupSocketEvents() {
    if (!this.socket) return;

    console.log(`🔧 Setting up socket events for instance: ${this.instanceId}`);

    
    this.socket.on("connect", () => {
      console.log(
        `✅ Socket connected on instance: ${this.instanceId}, Socket ID:`,
        this.socket.id
      );
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      const { isSocketConnected, setIsSocketConnected } =
        useAppStore.getState();

      if (!isSocketConnected) {
        console.log("🎯 Setting socket connected state");
        setIsSocketConnected(true);
        log("Connected");

        
        setTimeout(async () => {
          await this.attemptAutoLogin();
          console.log("🔄 Requesting current state...");
          this.requestCurrentState();
        }, 1000);
      }
    });

    
    this.socket.on("disconnect", (reason: string) => {
      console.log(
        `❌ Socket disconnected on instance: ${this.instanceId}, reason:`,
        reason
      );
      this.isConnecting = false;
      const { setIsSocketConnected } = useAppStore.getState();
      setIsSocketConnected(false);
      log("Disconnected", reason);
    });

    
    this.socket.on("reconnect", (attemptNumber: number) => {
      console.log(
        `🔄 Socket reconnected on instance: ${this.instanceId} after`,
        attemptNumber,
        "attempts"
      );
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      const { setIsSocketConnected } = useAppStore.getState();
      setIsSocketConnected(true);
      log("Reconnected");

      setTimeout(async () => {
        await this.attemptAutoLogin();
        this.requestCurrentState();
      }, 1000);
    });

    
    this.socket.on("connect_error", (error: any) => {
      console.error(
        `❌ Socket connection error on instance: ${this.instanceId}:`,
        error
      );
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("💀 Max reconnection attempts reached");
        const { setIsSocketConnected } = useAppStore.getState();
        setIsSocketConnected(false);
      }

      log("Connection Error", error);
    });

    
    const eventProcessingLock = false;

    
    this.socket.on("initial_state", (data: any) => {
      if (eventProcessingLock) {
        console.log("🔒 Event processing locked, skipping initial_state");
        return;
      }

      console.log(`🎯 Got Initial State on instance: ${this.instanceId}`, data);
      log("Got Initial State", data);
      this.processInitialState(data);
    });

    
    this.socket.on("event", (data: any) => {
      if (eventProcessingLock) {
        console.log("🔒 Event processing locked, skipping event:", data.key);
        return;
      }

      
      const now = Date.now();
      const eventKey = `${data.key}_${data.expId}_${JSON.stringify(
        data.value
      )}`;

      if (!this.lastEventTimes) {
        this.lastEventTimes = new Map();
      }

      const lastTime = this.lastEventTimes.get(eventKey);
      if (lastTime && now - lastTime < 100) {
        
        console.log("🚫 Duplicate event filtered:", data.key);
        return;
      }

      this.lastEventTimes.set(eventKey, now);

      
      if (this.lastEventTimes.size > 100) {
        const entries = Array.from(this.lastEventTimes.entries());
        entries.sort((a, b) => b[1] - a[1]);
        this.lastEventTimes = new Map(entries.slice(0, 50));
      }

      console.log(
        `📨 Processing event on instance: ${this.instanceId}:`,
        data.key,
        data.value
      );

      if (this.isExperimentEvent(data.key)) {
        useExperimentStore.getState().processEvent(data);
      }

      if (this.isMetadataEvent(data.key)) {
        useMetadataStore.getState().processEvent(data);
      }
    });

    
    this.socket.on("error", (error: any) => {
      console.error(`❌ Socket error on instance: ${this.instanceId}:`, error);
    });

    
    this.socket.on("event", (data: any) => {
      if (data.key !== "visibility") {
        console.log(
          `🔔 Socket Event Received on ${this.instanceId}: ${data.key}`,
          data
        );
      }
    });

    
    this.socket.on("reconnect_attempt", (attemptNumber: number) => {
      console.log(
        `🔄 Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts} on instance: ${this.instanceId}`
      );
    });

    this.socket.on("reconnect_failed", () => {
      console.error(`💀 Reconnection failed on instance: ${this.instanceId}`);
      this.isConnecting = false;
      const { setIsSocketConnected } = useAppStore.getState();
      setIsSocketConnected(false);
    });
  }

  
  private lastEventTimes: Map<string, number> = new Map();

  processInitialState(data: any) {
    console.log(
      `🎯 Processing Initial State on instance: ${this.instanceId}`,
      data
    );
    const { setAllMetadata } = useMetadataStore.getState();
    const { initializeExperiment } = useExperimentStore.getState();

    try {
      const expListData =
        data.exp_list?.map((item: SummaryData) => {
          return createExpSummary(item);
        }) || [];

      const expOptionData = data.exp_option || {};
      const newExpOptionData = createExpOption(data.kernel_info || {});

      setAllMetadata({
        expList: expListData,
        expOptions: expOptionData,
        kernelInfo: newExpOptionData,
        newExpOptions: newExpOptionData,
      });

      if (data.current_exp || data.curr_exp) {
        const currExpData = data.current_exp || data.curr_exp;
        console.log("🎯 Initializing experiment with data:", currExpData);
        initializeExperiment(currExpData);
        // const exceptKeys = [
        //   "lastUpdated"]
      }

      console.log("✅ Initial state processed successfully");
    } catch (error) {
      console.error("❌ Error processing initial state:", error);
    }
  }

  requestCurrentState() {
    if (this.socket && this.socket.connected) {
      console.log(
        `📤 Emitting request_current_state on instance: ${this.instanceId}`
      );
      this.socket.emit("request_current_state");
      log("Requested current state");
    } else {
      console.log("❌ Socket not connected, cannot request state");
      if (!this.isConnecting) {
        console.log("🔄 Attempting to reconnect...");
        this.connect();
      }
    }
  }

  
  private cleanupGlobalSocket() {
    if (globalSocketInstance) {
      console.log("🧹 Cleaning up global socket instance");
      globalSocketInstance.removeAllListeners();
      globalSocketInstance.disconnect();
      globalSocketInstance = null;
      instanceCreationTime = 0;
    }
  }

  
  public cleanup() {
    console.log(`🧹 Cleaning up socket on instance: ${this.instanceId}`);

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();

      
      if (this.socket === globalSocketInstance) {
        globalSocketInstance = null;
        instanceCreationTime = 0;
      }

      this.socket = null;
    }

    this.isConnecting = false;
    this.lastEventTimes?.clear();
  }

  disconnect() {
    console.log(
      `🔌 Manually disconnecting socket on instance: ${this.instanceId}`
    );
    this.cleanup();
    const { setIsSocketConnected } = useAppStore.getState();
    setIsSocketConnected(false);
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  forceReconnect() {
    console.log(`🔄 Force reconnecting on instance: ${this.instanceId}...`);
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  private isExperimentEvent(key: string): boolean {
    const experimentEvents = [
      "brackets",
      "bracketStart",
      "bracketDone",
      "roundStart",
      "roundDone",
      "trialStart",
      "trialDone",
      "bestTrial",
      "userTrialDone",
      "push",
      "interaction",
      "status",
      "progress",
      "trialPaused",
      "visibility",
      "gpu",
      "shap",
      "narrowConfigspace",
      "updateNotiCond",
    ];
    return experimentEvents.includes(key);
  }

  private isMetadataEvent(key: string): boolean {
    const metadataEvents = [
      "experiment_list",
      "lastUpdated",
      "trialDone",
      "curNumTrials",
    ];
    return metadataEvents.includes(key);
  }

  private async attemptAutoLogin(): Promise<void> {
    try {
      const { currentUser, token, isAuthenticated, checkAuth } = useAuthStore.getState();
      
      
      if (isAuthenticated && currentUser) {
        console.log(`✅ Already authenticated as: ${currentUser}`);
        return;
      }
      
      
      if (token) {
        console.log(`🔐 Attempting auto-login with stored token: ${token}`);
        const isValid = await checkAuth();
        
        if (isValid) {
          console.log(`✅ Auto-login successful for user: ${token}`);
          return;
        } else {
          console.log(`❌ Stored token is invalid`);
        }
      } else {
        console.log(`ℹ️ No stored token found`);
      }
    } catch (error) {
      console.error(`❌ Error during auto-login attempt:`, error);
    }
  }
}
