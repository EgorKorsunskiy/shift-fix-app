import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getContactInfo } from "@/api/endpoints";
import { queryKeys } from "@/api/keys";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PopoverRoot } from "@/components/ui/Popover";

export function ContactButton({ workerId }: { workerId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.contact(workerId),
    queryFn: () => getContactInfo(workerId),
    enabled: open,
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <PopoverRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) queryClient.removeQueries({ queryKey: queryKeys.contact(workerId) });
      }}
      trigger={
        <Button variant="ghost" type="button">
          {open ? t("replacements.hideContact") : t("replacements.showContact")}
        </Button>
      }
    >
      {query.isLoading ? <p className="text-slate-500">{t("common.loading")}</p> : null}
      {query.isError ? (
        <p className="text-red-700">
          {t(errorMessageKey(query.error instanceof ApiError ? query.error.code : undefined))}
        </p>
      ) : null}
      <ul className="space-y-2">
        {query.data?.channels.map((channel) => (
          <li key={channel.type} className="space-y-1">
            <span className="flex items-center gap-2 text-xs text-slate-500">
              {t(`channel.${channel.type}`)}
              {channel.isPreferred ? <Badge tone="accent">{t("replacements.preferred")}</Badge> : null}
            </span>
            <ChannelAddress type={channel.type} address={channel.address} />
          </li>
        ))}
      </ul>
    </PopoverRoot>
  );
}

function ChannelAddress({ type, address }: { type: string; address: string }) {
  if (type === "email") {
    return (
      <a className="text-indigo-700 underline" href={`mailto:${address}`}>
        {address}
      </a>
    );
  }
  if (type === "phone" || type === "sms" || type === "whatsapp") {
    return (
      <a className="text-indigo-700 underline" href={`tel:${address}`}>
        {address}
      </a>
    );
  }
  return <p>{address}</p>;
}
