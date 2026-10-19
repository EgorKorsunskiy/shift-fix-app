import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TabContent, TabList, TabTrigger, TabsRoot } from "@/components/ui/Tabs";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { NowList } from "./NowList";
import { OpenShiftsBanner } from "./OpenShiftsBanner";

const Calendar = lazy(() => import("./Calendar").then((module) => ({ default: module.Calendar })));

export default function HomePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "calendar" ? "calendar" : "now";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
      <OpenShiftsBanner />
      <TabsRoot
        value={tab}
        onValueChange={(value) => {
          const next = new URLSearchParams(params);
          if (value === "calendar") next.set("tab", "calendar");
          else next.delete("tab");
          setParams(next);
        }}
      >
        <TabList>
          <TabTrigger value="now">{t("home.tabNow")}</TabTrigger>
          <TabTrigger value="calendar">{t("home.tabCalendar")}</TabTrigger>
        </TabList>
        <TabContent value="now" className="pt-4">
          <NowList />
        </TabContent>
        <TabContent value="calendar" className="pt-4">
          <Suspense fallback={<ListSkeleton />}>
            <Calendar />
          </Suspense>
        </TabContent>
      </TabsRoot>
    </div>
  );
}
