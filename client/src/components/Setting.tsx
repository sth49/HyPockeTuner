import { NotificationService } from "../utils/NotificationService";
import { useAppStore } from "../stores/appStore";
import { useState } from "react";
import ApiClient from "../api/api";

const Settings: React.FC = () => {
  const setIsSubscribe = useAppStore((state) => state.setSubscribed);
  const isSubscribe = useAppStore((state) => state.isSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  // 테스트 푸시 알림 전송 함수 (수정된 버전)
  const handleTestPush = async () => {
    try {
      setTestLoading(true);

      // 현재 구독 정보 가져오기 (수정됨)
      const subscription = await NotificationService.getSubscription();

      if (!subscription) {
        console.error("구독 정보가 없습니다. 먼저 구독해주세요.");
        alert("구독 정보가 없습니다. 먼저 푸시 알림을 구독해주세요.");
        return;
      }

      console.log("테스트 푸시 알림 전송:", subscription);

      // 서버에 테스트 푸시 요청 (수정됨)
      const result = await ApiClient.testPush(JSON.stringify(subscription));

      console.log("테스트 푸시 결과:", result);

      // if (result?.success) {
      //   alert("테스트 푸시 알림이 전송되었습니다!");
      // } else {
      //   alert("테스트 푸시 알림 전송에 실패했습니다.");
      // }
    } catch (error) {
      console.error("테스트 푸시 알림 오류:", error);
      // alert("테스트 푸시 알림 전송 중 오류가 발생했습니다.");
    } finally {
      setTestLoading(false);
    }
  };

  // 구독 설정 함수
  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      const success = await NotificationService.setupPush();

      if (success) {
        setIsSubscribe(true);
        console.log("푸시 알림 구독 성공");
      } else {
        console.error("푸시 알림 구독 실패");
      }
    } catch (error) {
      console.error("푸시 알림 구독 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-4 bg-white gap-4 m-2">
      <div className="flex items-center justify-between">
        <p>Push Notification</p>
        <p>{isSubscribe ? "on" : "off"}</p>
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={handleSubscribe}
        disabled={isSubscribe || isLoading}
      >
        {isLoading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          "Subscribe for Push Notification"
        )}
      </button>

      <button
        className="btn btn-primary text-white w-full"
        onClick={handleTestPush}
        disabled={!isSubscribe || testLoading}
      >
        {testLoading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          "Push Notification Test"
        )}
      </button>
    </div>
  );
};

export default Settings;
