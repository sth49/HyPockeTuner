/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotiCondPair } from "../models/notification";
import { useExperimentStore } from "../stores/experimentStore";
import { useAuthStore } from "../stores/authStore";
import { SERVER_URL } from "./const";
// import { NotiCondPair } from "./models/noti-cond-pair";
// import { useCurrExp } from "./store";



function normalizeUrl(path: string): string {
  
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
  console.log(`[fetchSingle] ${method.toUpperCase()} request:`, url);
  console.log("[fetchSingle] Headers:", headers);

  if (payload) {
    console.log("[fetchSingle] Payload:", payload);
    console.log("[fetchSingle] Serialized payload:", JSON.stringify(payload));
  }

  if (!payload) {
    return fetch(url, {
      method: "GET",
      headers,
      mode: "cors",
    }).then(async (res) => {
      console.log(`[fetchSingle] GET response status: ${res.status} ${res.statusText}`);

      if (res.status === 401) {
        console.error("[fetchSingle] Authentication failed, logging out");
        const { logout } = useAuthStore.getState();
        logout();
        window.location.reload();
        throw new Error("Authentication required");
      }

      const responseData = await res.json();
      console.log("[fetchSingle] GET response data:", responseData);
      return responseData;
    }).catch(error => {
      console.error("[fetchSingle] GET request error:", error);
      throw error;
    });
  }

  return fetch(url, {
    method: method,
    headers,
    body: JSON.stringify(payload),
    mode: "cors",
  }).then(async (res) => {
    console.log(`[fetchSingle] ${method.toUpperCase()} response status: ${res.status} ${res.statusText}`);

    if (res.status === 401) {
      console.error("[fetchSingle] Authentication failed, logging out");
      const { logout } = useAuthStore.getState();
      logout();
      window.location.reload();
      throw new Error("Authentication required");
    }

    const responseData = await res.json();
    console.log(`[fetchSingle] ${method.toUpperCase()} response data:`, responseData);
    return responseData;
  }).catch(error => {
    console.error(`[fetchSingle] ${method.toUpperCase()} request error:`, error);
    throw error;
  });
}

function fetchMultiple(urls: string[]) {
  return Promise.all(urls.map((url) => fetchSingle(url)));
}


const ApiClient = {
  /**
   
   
   
   */
  call: function <T = any>(urls: string[]): Promise<T[]> {
    const fullUrls = urls.map((url) => SERVER_URL + url);
    return fetchMultiple(fullUrls);
  },

  /**
   
   
   
   */
  cluster: function <T = any>(threshold: number): Promise<T> {
    return fetchSingle(
      `${SERVER_URL}/cluster?threshold=${threshold}`,
      null,
      "get"
    );
  },

  /**
   
   
   
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
   
   
   
   */
  postTrial: function <T = any>(hparams: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}trial/user`, hparams);
  },

  postVisibility: function <T = any>(
    userId: string,
    isViewing: boolean
  ): Promise<T> {
    const data = {
      userId: userId || "user1",
      page: window.location.pathname + window.location.search,
      isViewing: isViewing,
      timestamp: Date.now() / 1000,
    };
    console.log("Sending visibility data:", data);

    return fetchSingle(`${SERVER_URL}visibility`, data);
  },

  /**
   
   
   
   */
  configureSpace: function <T = any>(config: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/configure_space`, config);
  },

  /**
   
   
   
   */
  confirmNotiCondPair: function <T = any>(id: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/confirm_noti_cond_pair`, { id });
  },

  /**
   
   
   
   */
  testNoti: function <T = any>(content: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}/test_noti`, { content });
  },

  /**
   
   
   
   */
  project: function <T = any>(perp: number): Promise<T> {
    return fetchSingle(`${SERVER_URL}/project`, { perp });
  },

  /**
   
   
   
   */
  // src/utils/api.ts
  

  registerSubscription: function <T = any>(subscription: any): Promise<T> {
    console.log("[ApiClient] registerSubscription called");
    console.log("[ApiClient] Subscription data:", subscription);
    console.log("[ApiClient] Request URL:", normalizeUrl("subscribe"));

    return fetchSingle(normalizeUrl("subscribe"), subscription, "post")
      .then(response => {
        console.log("[ApiClient] registerSubscription response:", response);
        return response;
      })
      .catch(error => {
        console.error("[ApiClient] registerSubscription error:", error);
        throw error;
      });
  },

  testPush: function <T = any>(subscription: any): Promise<T> {
    return fetchSingle(normalizeUrl("test/push"), subscription, "post").catch(
      (error) => {
        console.warn("Test push API call failed:", error);
        throw error;
      }
    );
  },

  /**
   
   
   
   */
  rerun: function <T = any>(config: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/rerun`, config);
  },

  /**
   
   
   
   
   */
  log: function <T = any>(event_name: string, data: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/log`, { event_name, data });
  },

  /**
   
   
   
   */
  //   testPush: function <T = any>(data: any): Promise<T> {
  //     return fetchSingle<T>(`${SERVER_URL}/test/push`, data, "post");
  //   },

  /**
   
   
   
   */
  capture: function <T = any>(data: any): Promise<T> {
    return fetchSingle(`${SERVER_URL}/capture`, data, "post");
  },

  /**
   
   
   
   */
  login: function <T = any>(userId: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}login/${userId}`, null, "get");
  },

  /**
   
   
   
   
   */
  addUser: function <T = any>(userId: string, password: string): Promise<T> {
    return fetchSingle(
      `${SERVER_URL}add_user/${userId}/${password}`,
      null,
      "get"
    );
  },

  /**
   
   
   
   */
  checkToken: function <T = any>(token: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}/check_token/${token}`, null, "get");
  },

  /**
   
   
   
   */
  logout: function <T = any>(userId: string): Promise<T> {
    return fetchSingle(`${SERVER_URL}/logout/${userId}`, null, "get");
  },

  /**
   
   
   */
  getSessionInfo: function <T = any>(): Promise<T> {
    return fetchSingle(`${SERVER_URL}/session/info`, null, "get");
  },
};

export default ApiClient;
