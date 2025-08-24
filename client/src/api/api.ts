/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotiCondPair } from "../models/notification";
import { useExperimentStore } from "../stores/experimentStore";
import { useAuthStore } from "../stores/authStore";
import { SERVER_URL } from "./const";
// import { NotiCondPair } from "./models/noti-cond-pair";
// import { useCurrExp } from "./store";

// 응답 타입 정의 (실제 API 응답 구조에 맞게 조정 필요)

function normalizeUrl(path: string): string {
  // path가 이미 슬래시로 시작하는 경우 슬래시 중복 방지
  const normalizedPath = path.startsWith("/") ? path : `${path}`;
  return `${SERVER_URL}${normalizedPath}`;
}

function getAuthHeaders(): Record<string, string> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function fetchSingle<T = any>(url: string, payload?: any, method = "post"): Promise<T> {
  const headers = getAuthHeaders();
  console.log(`🌐 [fetchSingle] ${method.toUpperCase()} 요청:`, url);
  console.log("🌐 [fetchSingle] 헤더:", headers);
  
  if (payload) {
    console.log("🌐 [fetchSingle] 페이로드:", payload);
    console.log("🌐 [fetchSingle] 직렬화된 페이로드:", JSON.stringify(payload));
  }

  if (!payload) {
    return fetch(url, {
      method: "GET",
      headers,
      mode: "cors",
    }).then(async (res) => {
      console.log(`🌐 [fetchSingle] GET 응답 상태: ${res.status} ${res.statusText}`);
      
      if (res.status === 401) {
        console.error("🌐 [fetchSingle] 인증 실패, 로그아웃 처리");
        const { logout } = useAuthStore.getState();
        logout();
        window.location.reload();
        throw new Error("Authentication required");
      }
      
      const responseData = await res.json();
      console.log("🌐 [fetchSingle] GET 응답 데이터:", responseData);
      return responseData;
    }).catch(error => {
      console.error("🌐 [fetchSingle] GET 요청 에러:", error);
      throw error;
    });
  }

  return fetch(url, {
    method: method,
    headers,
    body: JSON.stringify(payload),
    mode: "cors",
  }).then(async (res) => {
    console.log(`🌐 [fetchSingle] ${method.toUpperCase()} 응답 상태: ${res.status} ${res.statusText}`);
    
    if (res.status === 401) {
      console.error("🌐 [fetchSingle] 인증 실패, 로그아웃 처리");
      const { logout } = useAuthStore.getState();
      logout();
      window.location.reload();
      throw new Error("Authentication required");
    }
    
    const responseData = await res.json();
    console.log(`🌐 [fetchSingle] ${method.toUpperCase()} 응답 데이터:`, responseData);
    return responseData;
  }).catch(error => {
    console.error(`🌐 [fetchSingle] ${method.toUpperCase()} 요청 에러:`, error);
    throw error;
  });
}

function fetchMultiple(urls: string[]) {
  return Promise.all(urls.map((url) => fetchSingle(url)));
}

// API 클라이언트 객체
const ApiClient = {
  /**
   * 여러 API URL을 호출합니다
   * @param urls 상대 URL 배열
   * @returns Promise<응답 데이터 배열>
   */
  call: function <T = any>(urls: string[]): Promise<T[]> {
    const fullUrls = urls.map((url) => SERVER_URL + url);
    return fetchMultiple(fullUrls);
  },

  /**
   * 클러스터 API를 호출합니다
   * @param threshold 클러스터링 임계값
   * @returns Promise<응답 데이터>
   */
  cluster: function <T = any>(threshold: number): Promise<T> {
    return fetchSingle(
      `${SERVER_URL}/cluster?threshold=${threshold}`,
      null,
      "get"
    );
  },

  /**
   * 새 실험을 추가합니다
   * @param exp 실험 데이터
   * @returns Promise<응답 데이터>
   */
  addExperiment: function <T = any>(exp: any, type: string = ""): Promise<T> {
    if (type === "redefine") {
      console.log("Adding redefine experiment:", exp);
      return fetchSingle(`${SERVER_URL}redefine_exp/add`, exp);
    }
    console.log("Adding new experiment:", exp);
    return fetchSingle(`${SERVER_URL}new_exp/add`, exp);
  },

  /**
   * 실행할 새 실험을 추가합니다
   * @param exp 실험 데이터
   * @returns Promise<응답 데이터>
   */
  addLaunchExperiment: function <T = any>(
    exp: any,
    type: string = ""
  ): Promise<T> {
    if (type === "redefine") {
      console.log("Adding redefine experiment:", exp);
      return fetchSingle(`${SERVER_URL}redefine_exp/add_launch`, exp);
    } else return fetchSingle(`${SERVER_URL}new_exp/add_launch`, exp);
  },

  /**
   * 조건을 추가합니다
   * @param notiCondPair 알림-조건 쌍
   * @returns Promise<응답 데이터>
   */
  addCondition: function <T = any>(notiCondPair: NotiCondPair): Promise<T> {
    const expId = useExperimentStore.getState().expId;
    if (!expId) {
      return Promise.reject(new Error("No active experiment found"));
    }

    const data = {
      ...notiCondPair.toJSON(),
      exp_id: expId,
    };

    //@ts-ignore
    return fetchSingle<T>(`${SERVER_URL}add_condition`, data);
  },

  /**
   * 조건을 편집합니다
   * @param notiId 알림 ID
   * @param active 활성화 상태
   * @returns Promise<응답 데이터>
   */
  editCondition: function <T = any>(
    notiCondPair: NotiCondPair
    // notiId: string,
    // active: boolean
  ): Promise<T> {
    // const currExp = useCurrExp.getState().currExp;
    const expId = useExperimentStore.getState().expId;
    if (!expId) {
      return Promise.reject(new Error("No active experiment found"));
    }

    const data = {
      // id: notiId,
      // active: active,
      ...notiCondPair.toJSON(),
      exp_id: expId,
    };

    return fetchSingle<T>(`${SERVER_URL}edit_condition`, data);
  },

  /**
   * 조건을 제거합니다
   * @param notiCondPair 알림-조건 쌍
   * @returns Promise<응답 데이터>
   */
  //   removeCondition: function <T = any>(notiCondPair: NotiCondPair): Promise<T> {
  //     const currExp = useCurrExp.getState().currExp;
  //     if (!currExp || !currExp.id) {
  //       return Promise.reject(new Error("No active experiment found"));
  //     }

  //     const data = {
  //       ...notiCondPair.toJSON(),
  //       exp_id: currExp.id,
  //     };

  //     return fetchSingle<T>(`${SERVER_URL}/remove_condition`, data);
  //   },

  /**
   * 구성 공간 범위를 좁힙니다
   * @param value 구성 값
   * @returns Promise<응답 데이터>
   */
  narrowConfigspace: function <T = any>(value: any): Promise<T> {
    // const currExp = useCurrExp.getState().currExp;
    const expId = useExperimentStore.getState().expId;
    if (!expId) {
      return Promise.reject(new Error("No active experiment found"));
    }
    // if (!currExp || !currExp.id) {
    //   return Promise.reject(new Error("No active experiment found"));
    // }

    const data = {
      ...value,
      exp_id: expId,
    };

    return fetchSingle<T>(`${SERVER_URL}narrow_configspace`, data);
  },

  /**
   * 사용자 시험을 게시합니다
   * @param hparams 하이퍼파라미터
   * @returns Promise<응답 데이터>
   */
  postTrial: function <T = any>(hparams: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}trial/user`, hparams);
  },

  postVisibility: function <T = any>(
    userId: string,
    isViewing: boolean
  ): Promise<T> {
    const data = {
      userId: userId || "user1", // 기본값 "user1"
      page: window.location.pathname + window.location.search,
      isViewing: isViewing, // 기본값 true
      timestamp: Date.now() / 1000, // 초 단위로 변환
    };
    console.log("Sending visibility data:", data);

    return fetchSingle(`${SERVER_URL}visibility`, data);
  },

  /**
   * 구성 공간을 설정합니다
   * @param config 구성 데이터
   * @returns Promise<응답 데이터>
   */
  configureSpace: function <T = any>(config: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/configure_space`, config);
  },

  /**
   * 알림-조건 쌍을 확인합니다
   * @param id 알림-조건 쌍 ID
   * @returns Promise<응답 데이터>
   */
  confirmNotiCondPair: function <T = any>(id: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/confirm_noti_cond_pair`, { id });
  },

  /**
   * 알림을 테스트합니다
   * @param content 알림 내용
   * @returns Promise<응답 데이터>
   */
  testNoti: function <T = any>(content: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}/test_noti`, { content });
  },

  /**
   * 프로젝트를 가져옵니다
   * @param perp 영속성 값
   * @returns Promise<응답 데이터>
   */
  project: function <T = any>(perp: number): Promise<T> {
    return fetchSingle(`${SERVER_URL}/project`, { perp });
  },

  /**
   * 푸시 알림 구독 정보를 등록합니다
   * @param sub 구독 정보
   * @returns Promise<응답 데이터>
   */
  // src/utils/api.ts
  // registerSubscription 메서드 추가 또는 수정

  registerSubscription: function <T = any>(subscription: any): Promise<T> {
    console.log("📡 [ApiClient] registerSubscription 호출");
    console.log("📡 [ApiClient] 구독 데이터:", subscription);
    console.log("📡 [ApiClient] 요청 URL:", normalizeUrl("subscribe"));
    
    // 서버의 /subscribe 엔드포인트로 구독 정보 전송
    return fetchSingle(normalizeUrl("subscribe"), subscription, "post")
      .then(response => {
        console.log("📡 [ApiClient] registerSubscription 응답:", response);
        return response;
      })
      .catch(error => {
        console.error("📡 [ApiClient] registerSubscription 에러:", error);
        throw error;
      });
  },

  testPush: function <T = any>(subscription: any): Promise<T> {
    // 서버의 /test/push 엔드포인트로 구독 정보 전송
    return fetchSingle(normalizeUrl("test/push"), subscription, "post").catch(
      (error) => {
        console.warn("테스트 푸시 API 호출 실패:", error);

        // 실패 시 프로미스 거부 - NotificationService에서 로컬 알림으로 대체
        throw error;
      }
    );
  },

  /**
   * 실험을 다시 실행합니다
   * @param config 구성 데이터
   * @returns Promise<응답 데이터>
   */
  rerun: function <T = any>(config: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/rerun`, config);
  },

  /**
   * 이벤트를 기록합니다
   * @param event_name 이벤트 이름
   * @param data 이벤트 데이터
   * @returns Promise<응답 데이터>
   */
  log: function <T = any>(event_name: string, data: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/log`, { event_name, data });
  },

  /**
   * 푸시 알림을 테스트합니다
   * @param data 테스트 데이터
   * @returns Promise<응답 데이터>
   */
  //   testPush: function <T = any>(data: any): Promise<T> {
  //     return fetchSingle<T>(`${SERVER_URL}/test/push`, data, "post");
  //   },

  /**
   * 데이터를 캡처합니다
   * @param data 캡처 데이터
   * @returns Promise<응답 데이터>
   */
  capture: function <T = any>(data: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/capture`, data, "post");
  },

  /**
   * 사용자 로그인
   * @param userId 사용자 ID
   * @returns Promise<응답 데이터>
   */
  login: function <T = any>(userId: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}login/${userId}`, null, "get");
  },

  /**
   * 새 사용자 추가
   * @param userId 사용자 ID
   * @param password 비밀번호
   * @returns Promise<응답 데이터>
   */
  addUser: function <T = any>(userId: string, password: string): Promise<T> {
    return fetchSingle(
      `${SERVER_URL}add_user/${userId}/${password}`,
      null,
      "get"
    );
  },

  /**
   * 토큰 검증
   * @param token 검증할 토큰
   * @returns Promise<응답 데이터>
   */
  checkToken: function <T = any>(token: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}/check_token/${token}`, null, "get");
  },

  /**
   * 사용자 로그아웃
   * @param userId 사용자 ID
   * @returns Promise<응답 데이터>
   */
  logout: function <T = any>(userId: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}/logout/${userId}`, null, "get");
  },

  /**
   * 세션 정보 조회
   * @returns Promise<응답 데이터>
   */
  getSessionInfo: function <T = any>(): Promise<T> {
    return fetchSingle(`${SERVER_URL}/session/info`, null, "get");
  },
};

export default ApiClient;
