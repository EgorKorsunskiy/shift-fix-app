import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Layout } from "./Layout";
import { NotFoundPage } from "./NotFoundPage";

const HomePage = lazy(() => import("@/features/home/HomePage"));
const ReplacementsPage = lazy(() => import("@/features/replacements/ReplacementsPage"));
const WorkersPage = lazy(() => import("@/features/workers/WorkersPage"));
const HistoryPage = lazy(() => import("@/features/history/HistoryPage"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<ListSkeleton />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: "shifts/:shiftId/replacements",
        element: (
          <Suspense fallback={<ListSkeleton />}>
            <ReplacementsPage />
          </Suspense>
        ),
      },
      {
        path: "workers",
        element: (
          <Suspense fallback={<ListSkeleton />}>
            <WorkersPage />
          </Suspense>
        ),
      },
      {
        path: "workers/:workerId/history",
        element: (
          <Suspense fallback={<ListSkeleton />}>
            <HistoryPage />
          </Suspense>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
