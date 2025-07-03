import ApiClient from "../api/api";

// src/utils/PageTracker.ts
export interface PageViewData {
  userId: string;
  page: string;
  isViewing: boolean;
  timestamp: number;
}

export class PageTracker {
  private userId: string;
  private currentPage: string = "";
  private isViewing: boolean = true;
  private previousIsViewing: boolean = true; // 이전 상태를 추적
  private logTimer: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  private getCurrentPage(): string {
    return window.location.pathname + window.location.search;
  }

  private logPageView(
    page: string,
    isViewing: boolean,
    forceLog: boolean = false
  ) {
    const data: PageViewData = {
      userId: this.userId,
      page,
      isViewing,
      timestamp: Date.now() / 1000, // 초 단위로 변환
    };

    console.log(
      `📄 Page: ${page} - ${isViewing ? "Viewing" : "Not Viewing"}`,
      data
    );

    // forceLog가 true이거나, visibility 상태가 실제로 변경된 경우에만 서버로 전송
    if (forceLog || this.previousIsViewing !== isViewing) {
      this.sendToServer(data);
      this.previousIsViewing = isViewing; // 이전 상태 업데이트
    }
  }

  private async sendToServer(data: PageViewData) {
    try {
      await ApiClient.postVisibility(data);
    } catch (error) {
      console.error("Failed to send page view data:", error);
    }
  }

  private handleVisibilityChange = () => {
    this.isViewing = !document.hidden;
    // visibility 변경 시에만 전송 (상태 비교는 logPageView에서 처리)
    this.logPageView(this.currentPage, this.isViewing);
  };

  private handlePageChange = () => {
    const newPage = this.getCurrentPage();
    if (newPage !== this.currentPage) {
      // 이전 페이지 종료 로그 (페이지 변경이므로 강제 전송)
      if (this.currentPage) {
        this.logPageView(this.currentPage, false, true);
      }

      // 새 페이지 시작 로그 (페이지 변경이므로 강제 전송)
      this.currentPage = newPage;
      this.logPageView(this.currentPage, this.isViewing, true);
    }
  };

  public start() {
    console.log("🚀 Starting page tracker for user:", this.userId);

    // 초기 페이지 설정 (최초 시작이므로 강제 전송)
    this.currentPage = this.getCurrentPage();
    this.logPageView(this.currentPage, true, true);

    // 페이지 가시성 변화 감지 (탭 전환, 최소화 등)
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // 페이지 변경 감지 (SPA 라우팅)
    window.addEventListener("popstate", this.handlePageChange);

    // 정기적인 heartbeat는 제거 (visibility 변화시에만 전송하므로)
    // 만약 heartbeat이 필요하다면 아래 주석을 해제하되, 상태가 같으면 전송하지 않음
    /*
    this.logTimer = setInterval(() => {
      if (this.isViewing) {
        this.logPageView(this.currentPage, true); // 상태가 같으면 전송되지 않음
      }
    }, 60000);
    */
  }

  public stop() {
    console.log("🛑 Stopping page tracker");

    // 종료 로그 (종료이므로 강제 전송)
    this.logPageView(this.currentPage, false, true);

    // 이벤트 리스너 제거
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    window.removeEventListener("popstate", this.handlePageChange);

    // 타이머 정리
    if (this.logTimer) {
      clearInterval(this.logTimer);
    }
  }

  public updatePage(page: string) {
    // React Router 등에서 수동으로 페이지 변경 알림
    if (page !== this.currentPage) {
      if (this.currentPage) {
        this.logPageView(this.currentPage, false, true); // 페이지 변경이므로 강제 전송
      }
      this.currentPage = page;
      this.logPageView(this.currentPage, this.isViewing, true); // 페이지 변경이므로 강제 전송
    }
  }

  public getCurrentStatus() {
    return {
      page: this.currentPage,
      isViewing: this.isViewing,
    };
  }
}
