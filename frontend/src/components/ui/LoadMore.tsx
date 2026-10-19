import { useTranslation } from "react-i18next";
import { Button } from "./Button";

export function LoadMore({
  hasMore,
  loading,
  onClick,
}: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-2">
      <Button variant="secondary" onClick={onClick} loading={loading}>
        {t("common.loadMore")}
      </Button>
    </div>
  );
}
