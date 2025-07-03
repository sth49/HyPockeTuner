/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotiCondPair } from "../models/notification";
import { useExperimentStore } from "../stores/experimentStore";
import { SERVER_URL } from "./const";
// import { NotiCondPair } from "./models/noti-cond-pair";
// import { useCurrExp } from "./store";

// 응답 타입 정의 (실제 API 응답 구조에 맞게 조정 필요)

function normalizeUrl(path: string): string {
  // path가 이미 슬래시로 시작하는 경우 슬래시 중복 방지
  const normalizedPath = path.startsWith("/") ? path : `${path}`;
  return `${SERVER_URL}${normalizedPath}`;
}

function fetchSingle(url: string, payload?: any, method = "post") {
  if (!payload) return fetch(url).then((res) => res.json());

  return fetch(url, {
    method: method,
    headers: new Headers({
      Accpet: "application/json, text/plain, */*",
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
    mode: "cors",
  }).then((res) => {
    return res.json();
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
  addExperiment: function <T = any>(exp: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}new_exp/add`, exp);
  },

  /**
   * 실행할 새 실험을 추가합니다
   * @param exp 실험 데이터
   * @returns Promise<응답 데이터>
   */
  addLaunchExperiment: function <T = any>(exp: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}new_exp/add_launch`, exp);
  },

  /**
   * 조건을 추가합니다
   * @param notiCondPair 알림-조건 쌍
   * @returns Promise<응답 데이터>
   */
  addCondition: function <T = any>(notiCondPair: NotiCondPair): Promise<T> {
    const expId = useExperimentStore.getState().expId;
    if (!expId) {
      return Promise.reject(new Error("현재 활성화된 실험이 없습니다"));
    }

    const data = {
      ...notiCondPair.toJSON(),
      exp_id: expId,
    };

    return fetchSingle<T>(`${SERVER_URL}add_condition`, data);
  },

  /**
   * 조건을 편집합니다
   * @param notiId 알림 ID
   * @param active 활성화 상태
   * @returns Promise<응답 데이터>
   */
  //   editCondition: function <T = any>(
  //     notiId: string,
  //     active: boolean
  //   ): Promise<T> {
  //     const currExp = useCurrExp.getState().currExp;
  //     if (!currExp || !currExp.id) {
  //       return Promise.reject(new Error("현재 활성화된 실험이 없습니다"));
  //     }

  //     const data = {
  //       id: notiId,
  //       active: active,
  //       exp_id: currExp.id,
  //     };

  //     return fetchSingle<T>(`${SERVER_URL}/edit_condition`, data);
  //   },

  /**
   * 조건을 제거합니다
   * @param notiCondPair 알림-조건 쌍
   * @returns Promise<응답 데이터>
   */
  //   removeCondition: function <T = any>(notiCondPair: NotiCondPair): Promise<T> {
  //     const currExp = useCurrExp.getState().currExp;
  //     if (!currExp || !currExp.id) {
  //       return Promise.reject(new Error("현재 활성화된 실험이 없습니다"));
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
      return Promise.reject(new Error("현재 활성화된 실험이 없습니다"));
    }
    // if (!currExp || !currExp.id) {
    //   return Promise.reject(new Error("현재 활성화된 실험이 없습니다"));
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

  postVisibility: function <T = any>(data: any): Promise<T> {
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
    // 서버의 /subscribe 엔드포인트로 구독 정보 전송
    return fetchSingle(normalizeUrl("subscribe"), subscription, "post");
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
};

export default ApiClient;
