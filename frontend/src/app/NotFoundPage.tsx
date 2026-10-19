import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t("common.notFound")}
      action={
        <Link to="/" className={buttonClass({ variant: "secondary" })}>
          {t("common.goHome")}
        </Link>
      }
    />
  );
}
