import {
  IoSettingsSharp,
  IoTrophy,
  IoCheckmarkDoneSharp,
  IoLogoUsd,
} from "react-icons/io5";
import {
  MdPageview,
  MdOutlineDescription,
  MdSettings,
  MdNotifications,
  MdNotificationsActive,
  MdNotificationAdd,
  MdWarningAmber,
  MdDeviceThermostat,
  MdDiscFull,
  MdArrowDownward,
  MdPlaylistAddCheck,
  MdChecklistRtl,
  MdAlarm,
  MdTrendingUp,
  MdShowChart,
  MdEditNotifications,
  MdHowToReg,
} from "react-icons/md";

import {
  MdAdjust,
  MdNumbers,
  MdOutlineSignalCellularAlt,
  MdCategory,
  MdTask,
} from "react-icons/md";
import { TbViewportNarrow } from "react-icons/tb";
import { RiFunctionAddFill } from "react-icons/ri";
import { FaCodeBranch, FaPause, FaPlay, FaEye } from "react-icons/fa6";
import { Type } from "../models/notification";

export type IconComponent = React.ComponentType<{ size?: number }>;

export const summaryIcons: Record<string, IconComponent> = {
  hparamLength: IoSettingsSharp,
  budget: IoLogoUsd,
  bestMetric: IoTrophy,
  doneTrials: IoCheckmarkDoneSharp,
  // lastUpdatedAt: PiClockClockwiseBold,
};

export const timelineIcons: Record<string, IconComponent> = {
  visibility: FaEye,
  push: MdNotificationsActive,
  addUserTrial: RiFunctionAddFill,
  addCondition: MdNotificationAdd,
  narrowConfigspace: TbViewportNarrow,
  redefineExperiment: FaCodeBranch,
  editCondition: MdEditNotifications,

  experimentPause: FaPause,
  experimentResume: FaPlay,
};

// export const timelineIcons: Record<string, IconComponent> = {
//   push: MdNotificationsActive,
//   addUserTrial: RiFunctionAddFill,
//   addCondition: MdNotificationAdd,
//   editCondition: MdNotificationsOff,
//   narrowConfigspace: TbViewportNarrow,
//   redefineConfigspace: FaCodeBranch,
//   experimentPause: FaPause,
//   experimentResume: FaPlay,
//   visibility: FaEye,
// };

export const navIcons: Record<string, IconComponent> = {
  overview: MdPageview,
  trials: MdOutlineDescription,
  refine: MdSettings,
  notification: MdNotifications,
};

export const hpTypeIcons: Record<string, IconComponent> = {
  constant: MdAdjust,
  uniform: MdNumbers,
  ordinal: MdOutlineSignalCellularAlt,
  unordered: MdCategory,
};

export const notiTypeIcons: Record<string, IconComponent> = {
  [Type.ExperimentStart]: FaPlay,
  [Type.ExperimentResume]: FaPlay,
  [Type.ExperimentPause]: FaPause,
  [Type.ExperimentFinish]: MdTask,
  [Type.MetricImproveBy]: MdTrendingUp,
  [Type.MetricImprove]: MdTrendingUp,
  [Type.MetricReach]: MdShowChart,
  [Type.BracketFinish]: MdPlaylistAddCheck,
  [Type.RoundFinish]: MdChecklistRtl,
  [Type.TrialFinish]: MdHowToReg,
  [Type.Timeout]: MdAlarm,
  [Type.ExceptionHappen]: MdWarningAmber,
  [Type.HighTemperature]: MdDeviceThermostat,
  [Type.LowUtilization]: MdArrowDownward,
  [Type.HighUsage]: MdDiscFull,
  // [Type.Custom]: TaskIcon,
};

// export const timelineIcons: Record<string, IconComponent> = {
//     push:
// };
