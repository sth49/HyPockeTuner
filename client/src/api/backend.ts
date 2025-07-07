/* eslint-disable @typescript-eslint/no-explicit-any */
import { io } from "socket.io-client";
import { SOCKET_URL } from "./const";
import { useAppStore } from "../stores/appStore";
import { useExperimentStore } from "../stores/experimentStore";
import { useMetadataStore } from "../stores/metadataStore";
import { createExpSummary, SummaryData } from "../types";
import { createExpOption } from "../types/option";

function log(...args: any[]) {
  console.info("Socket", ...args);
}

// 🔥 전역 소켓 인스턴스 추적을 위한 전역 변수
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
    // 🔥 각 Backend 인스턴스에 고유 ID 부여
    this.instanceId = `backend_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log(`🏗️ Backend instance created: ${this.instanceId}`);

    // 페이지 언로드 시 소켓 정리
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });

    // 🔥 React 개발 모드에서 컴포넌트 언마운트 감지
    if (typeof window !== "undefined") {
      // 개발 모드에서 HMR(Hot Module Replacement) 감지
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

    // 🔥 전역 소켓 인스턴스 체크 및 재사용
    if (globalSocketInstance && globalSocketInstance.connected) {
      const timeSinceCreation = Date.now() - instanceCreationTime;

      // 5초 이내에 생성된 소켓이면 재사용
      if (timeSinceCreation < 5000) {
        console.log("♻️ Reusing existing global socket instance");
        this.socket = globalSocketInstance;

        // 상태만 업데이트
        const { setIsSocketConnected } = useAppStore.getState();
        setIsSocketConnected(true);

        // 기존 이벤트 리스너 제거 후 새로 설정
        this.socket.removeAllListeners();
        this.setupSocketEvents();

        return;
      } else {
        console.log("⏰ Global socket too old, creating new one");
        this.cleanupGlobalSocket();
      }
    }

    // 🔥 기존 소켓 완전 정리
    if (this.socket && this.socket !== globalSocketInstance) {
      console.log("🧹 Cleaning up instance socket");
      this.cleanup();
    }

    this.isConnecting = true;
    this.reconnectAttempts = 0;

    // 🔥 새 소켓 생성
    this.socket = io(SOCKET_URL, {
      transports: ["polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      forceNew: true, // 새 연결 강제
      upgrade: false,
      rememberUpgrade: false,
      timeout: 10000,
      query: {
        clientVersion: "1.0",
        timestamp: Date.now(),
        instanceId: this.instanceId, // 디버깅용 인스턴스 ID
      },
    });

    // 🔥 전역 소켓으로 설정
    globalSocketInstance = this.socket;
    instanceCreationTime = Date.now();

    this.setupSocketEvents();
  }

  private isDevelopmentMode(): boolean {
    // Vite 환경
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return import.meta.env.MODE === "development" || import.meta.env.DEV;
    }

    // CRA/Webpack 환경
    if (typeof process !== "undefined" && (process as any)?.env) {
      return (process as any).env.NODE_ENV === "development";
    }

    // 브라우저에서 개발 모드 감지
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.port !== ""
    );
  }

  private setupSocketEvents() {
    if (!this.socket) return;

    console.log(`🔧 Setting up socket events for instance: ${this.instanceId}`);

    // 연결 성공
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

        // 연결 후 상태 요청
        setTimeout(() => {
          console.log("🔄 Requesting current state...");
          this.requestCurrentState();
        }, 1000);
      }
    });

    // 연결 해제
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

    // 재연결 성공
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

      setTimeout(() => {
        this.requestCurrentState();
      }, 1000);
    });

    // 연결 오류
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

    // 🔥 이벤트 핸들러에 중복 방지 로직 추가
    const eventProcessingLock = false;

    // 초기 상태 수신
    this.socket.on("initial_state", (data: any) => {
      if (eventProcessingLock) {
        console.log("🔒 Event processing locked, skipping initial_state");
        return;
      }

      console.log(`🎯 Got Initial State on instance: ${this.instanceId}`, data);
      log("Got Initial State", data);
      this.processInitialState(data);
    });

    // 이벤트 수신
    this.socket.on("event", (data: any) => {
      if (eventProcessingLock) {
        console.log("🔒 Event processing locked, skipping event:", data.key);
        return;
      }

      // 🔥 이벤트 중복 방지: 짧은 시간 내 같은 이벤트 필터링
      const now = Date.now();
      const eventKey = `${data.key}_${data.expId}_${JSON.stringify(
        data.value
      )}`;

      if (!this.lastEventTimes) {
        this.lastEventTimes = new Map();
      }

      const lastTime = this.lastEventTimes.get(eventKey);
      if (lastTime && now - lastTime < 100) {
        // 100ms 내 중복 이벤트 무시
        console.log("🚫 Duplicate event filtered:", data.key);
        return;
      }

      this.lastEventTimes.set(eventKey, now);

      // 오래된 이벤트 기록 정리 (메모리 누수 방지)
      if (this.lastEventTimes.size > 100) {
        const entries = Array.from(this.lastEventTimes.entries());
        entries.sort((a, b) => b[1] - a[1]); // 시간순 정렬
        this.lastEventTimes = new Map(entries.slice(0, 50)); // 최신 50개만 유지
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

    // 에러 처리
    this.socket.on("error", (error: any) => {
      console.error(`❌ Socket error on instance: ${this.instanceId}:`, error);
    });

    // 🔥 디버깅용 이벤트 로깅 (visibility 제외)
    this.socket.on("event", (data: any) => {
      if (data.key !== "visibility") {
        console.log(
          `🔔 Socket Event Received on ${this.instanceId}: ${data.key}`,
          data
        );
      }
    });

    // 재연결 관련 이벤트들
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

  // 🔥 이벤트 중복 방지를 위한 타임스탬프 맵
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

  // 🔥 전역 소켓 정리 메서드 추가
  private cleanupGlobalSocket() {
    if (globalSocketInstance) {
      console.log("🧹 Cleaning up global socket instance");
      globalSocketInstance.removeAllListeners();
      globalSocketInstance.disconnect();
      globalSocketInstance = null;
      instanceCreationTime = 0;
    }
  }

  // 소켓 완전 정리
  private cleanup() {
    console.log(`🧹 Cleaning up socket on instance: ${this.instanceId}`);

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();

      // 전역 소켓과 같은 인스턴스면 전역 소켓도 정리
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
}
