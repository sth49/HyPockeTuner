import HeaderText from "../common/HeaderText";
import { useEffect, useState } from "react";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { useExperimentStore } from "../../stores/experimentStore";
import { Push } from "../../types/experiment";
// import {notiTypeIcons } as
import { notiTypeIcons } from "../../utils/icon"; // Uncomment if you have icons for notifications
import { format } from "date-fns";
import { formatDate, formatDistance } from "../../utils/formatting";
const PushView = () => {
  const [page, setPage] = useState(1);
  const push = useExperimentStore((state) => state.push);
  const [data, setData] = useState<Push[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      // Simulate fetching data from an API or store
      const startIndex = (page - 1) * 5;
      const endIndex = startIndex + 5;
      // push를 최신순으로
      const newData = push.slice().reverse().slice(startIndex, endIndex);
      // .map((item) => ({
      //   ...item,
      //   time: new Date(item.time), // Ensure time is a Date object
      // }));
      console.log("newData", newData);
      // newData.sort((a, b) => {
      //   return new Date(b.time).getTime() - new Date(a.time).getTime();
      // });
      setData(newData);
    };
    fetchData();
  }, [page, push, push.length]); // Re-fetch data when page changes or push length changes
  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      <HeaderText text="Notifications" />
      <ul className="list h-[300px]">
        {data.length > 0 ? (
          data.map((item, index) => {
            const Icon = notiTypeIcons[item.type] || null;
            return (
              <li
                className="h-[60px] bg-white flex items-center"
                style={{
                  borderBottom: "1px solid #e5e7eb",
                }}
                key={index}
              >
                <div className="w-[10%] flex items-center justify-center">
                  {Icon && <Icon size={24} />}
                </div>
                <div className="flex flex-col justify-center items-start w-[90%]">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs">
                    {item.content} | {formatDate(item.time)} (
                    {formatDistance(item.time)} ago)
                  </p>
                </div>
              </li>
            );
          })
        ) : (
          <li
            className="h-[60px] bg-white flex items-center justify-center"
            style={{
              borderBottom: "1px solid #e5e7eb", // Tailwind's gray-200
            }}
          >
            <p className="text-gray-500">No push notifications</p>
          </li>
        )}
      </ul>
      <div className="flex w-full justify-center items-center gap-2">
        <button
          className="btn btn-sm btn-ghost"
          disabled={page <= 1}
          onClick={() => {
            if (page > 1) setPage(page - 1);
          }}
        >
          <IoIosArrowBack className="size-4" />
        </button>
        <p
          className="text-sm text-gray-600"
          style={{
            width: "30px",
            textAlign: "center",
          }}
        >
          {page}
        </p>
        <button
          className=" btn btn-sm btn-ghost"
          disabled={
            page * 5 >= push.length // Disable if there are no more items to show
          }
          //   style={{
          //     backgroundColor: "white",
          //   }}
          onClick={() => {
            setPage(page + 1);
          }}
        >
          <IoIosArrowForward className="size-4" />
        </button>
      </div>
    </div>
  );
};

export default PushView;
