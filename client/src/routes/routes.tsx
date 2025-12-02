// src/routes/routes.tsx
import { lazy, Suspense } from "react";
import { type RouteObject } from "react-router";
import LoadingSpinner from "../components/LoadingSpinner";
import Layout from "./Layout";

const Setting = lazy(() => import("../components/Setting"));

const Workspace = lazy(() => import("../components/workspace/Workspace"));
const NewUserTrial = lazy(() => import("../components/NewUserTrial"));
// const NewExperiment1 = lazy(() => import("../pages/NewExperiment1"));
// const NewExperiment2 = lazy(() => import("../pages/NewExperiment2"));
const NewExperiment1 = lazy(
  () => import("../components/newExperiment/NewExperiment1")
);
const NewExperiment2 = lazy(
  () => import("../components/newExperiment/NewExperiment2")
);
const Overview = lazy(() => import("../components/Overview"));
const TrialView = lazy(() => import("../components/TrialView"));
const Refine = lazy(() => import("../components/Refine"));
const Notification = lazy(() => import("../components/Notification"));

const HpSpace = lazy(() => import("../components/HpSpace"));
const SelectTrials = lazy(() => import("../components/SelectTrials"));

const NewNotiCond = lazy(() => import("../components/NewNotiCond"));

const withSuspense = (
  Component: React.ComponentType,
  viewType: string,
  isNav?: boolean
) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Layout viewType={viewType} isNav={isNav}>
      <Component />
    </Layout>
  </Suspense>
);

export const routes: RouteObject[] = [
  {
    path: "/",
    element: withSuspense(Workspace, "workspace"),
  },
  {
    path: "/workspace",
    element: withSuspense(Workspace, "workspace"),
  },
  {
    path: "/experiment/new/1/:type",
    element: withSuspense(NewExperiment1, "experiment1"),
  },
  {
    path: "/experiment/new/2/:type",
    element: withSuspense(NewExperiment2, "experiment2"),
  },
  {
    path: "/setting",
    element: withSuspense(Setting, "setting"),
  },
  {
    path: "/main/overview",
    element: withSuspense(Overview, "overview", true),
  },
  {
    path: "/main/trials",
    element: withSuspense(TrialView, "trials", true),
  },
  {
    path: "/main/refine",
    element: withSuspense(Refine, "refine", true),
  },
  {
    path: "/select/:type",
    element: withSuspense(SelectTrials, "trialSelection"),
  },
  {
    path: "/refine/narrow/hpspace",
    element: withSuspense(HpSpace, "hyperparameterSpace"),
  },
  {
    path: "/main/notification",
    element: withSuspense(Notification, "notification", true),
  },
  {
    path: "/notification/add/:notiCondType",
    element: withSuspense(NewNotiCond, "notiCond"),
  },
  {
    path: "/trial/new",
    element: withSuspense(NewUserTrial, "userTrial"),
  },
  {
    path: "/trial/new/:id",
    element: withSuspense(NewUserTrial, "userTrial"),
  },
];
