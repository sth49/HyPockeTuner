import { format, formatDistanceStrict } from "date-fns";
import { BandProps } from "./types";
import { formatting } from "../../utils/utils";

interface NodeDetailProps {
  data: BandProps;
}
const NodeDetail = ({ data }: NodeDetailProps) => {
  return (
    <>
      <div className="border-b border-gray-300 pb-3 flex items-end gap-2">
        <p className="text-xl font-bold text-gray-600 ">
          {data !== null ? `${data.data?.trials[0].event}` : "N/A"}
        </p>

        <p className="text-xs ">
          {data !== null
            ? `${format(data.startTime * 1000, "a HH:mm:ss")} - ${
                data.endTime ? format(data.endTime * 1000, "a HH:mm:ss") : "N/A"
              }`
            : "N/A"}
        </p>
        <p className="text-xs">
          ({formatDistanceStrict(data.endTime * 1000, data.startTime * 1000)})
        </p>
      </div>
      {data.data?.type !== "pseudo" ? (
        <div className="">
          <div className="w-[100%]">
            <p className="font-semibold mb-2 text-center">Evaluation Result</p>
            <div className="flex text-sm gap-1 flex-col">
              {(
                [
                  "id",
                  "event",
                  "loss",
                  "metric",
                  "budget",
                  // "startTime",
                  // "endTime",
                ] as const
              ).map((key) => (
                <div key={key} className="flex justify-between">
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  {key === "id"
                    ? String(data.data?.trials[0]?.id).slice(0, 3)
                    : //   key === "startTime"
                    //   ? data.data?.trials[0]?.startTime !== undefined
                    //     ? format(
                    //         new Date(
                    //           (data.data?.trials[0]?.startTime as number) * 1000
                    //         ),
                    //         "yyyy-MM-dd HH:mm:ss"
                    //       )
                    //     : "N/A"
                    //   : key === "endTime"
                    //   ? data.data?.trials[0]?.endTime !== undefined
                    //     ? format(
                    //         new Date(
                    //           (data.data?.trials[0]?.endTime as number) * 1000
                    //         ),
                    //         "yyyy-MM-dd HH:mm:ss"
                    //       )
                    //     : "N/A"
                    //   :
                    key === "loss"
                    ? data.data?.trials[0]?.loss !== undefined
                      ? String(data.data?.trials[0]?.loss)
                      : "N/A"
                    : key === "metric"
                    ? data.data?.trials[0]?.metric !== undefined
                      ? String(data.data?.trials[0]?.metric)
                      : "N/A"
                    : key === "budget"
                    ? data.data?.trials[0]?.budget !== undefined
                      ? String(data.data?.trials[0]?.budget)
                      : "N/A"
                    : key === "event"
                    ? `${data.data?.trials[0]?.event}`
                    : "N/A"}
                </div>
              ))}
            </div>
          </div>
          <div className="w-[100%]">
            {Object.keys(data.data?.trials[0].params).filter(
              (key) =>
                ![
                  "id",
                  "event",
                  "loss",
                  "metric",
                  "budget",
                  "start",
                  "end",
                  "bracket",
                  "round",
                  "index",
                ].includes(key)
            ).length > 0 && (
              <>
                <p className="font-semibold mb-2 text-center">
                  Hyperparameters
                </p>
                <div className="flex text-sm gap-1 flex-col">
                  {Object.entries(data.data?.trials[0].params)
                    .filter(
                      ([key]) =>
                        ![
                          "id",
                          "event",
                          "loss",
                          "metric",
                          "budget",
                          "start",
                          "end",
                          "bracket",
                          "round",
                          "index",
                        ].includes(key)
                    )
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}</span>
                        <span>
                          {value === true
                            ? "True"
                            : value === false
                            ? "False"
                            : Number(value) === value
                            ? formatting(value as number, "float") // 숫자일 경우 소수점 둘째 자리까지 포맷팅
                            : value === null
                            ? "N/A"
                            : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Pseudo Node Clicked!
        </div>
      )}
    </>
  );
};
export default NodeDetail;
