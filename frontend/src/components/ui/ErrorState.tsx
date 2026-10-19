import { useTranslation } from "react-i18next";
import { Button } from "./Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center" role="alert">
      <p className="text-red-700">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
