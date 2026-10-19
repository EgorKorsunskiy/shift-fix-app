import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { AbsenceType, CurrentShift } from "@/api/types";
import { createAbsence } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { brusselsLocalInputToApi, endOfTodayApi, nowApiUtc, utcToBrusselsInput } from "@/lib/dates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const schema = z
  .object({
    type: z.enum(["sick", "vacation", "unavailable"]),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
  })
  .refine((value) => brusselsLocalInputToApi(value.endsAt) > brusselsLocalInputToApi(value.startsAt), {
    path: ["endsAt"],
    message: "endAfterStart",
  });

type FormValues = z.infer<typeof schema>;

export function MarkAbsentDialog({
  shift,
  open,
  onOpenChange,
}: {
  shift: CurrentShift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (open) form.reset(defaults());
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!shift) throw new Error("missing shift");
      return createAbsence({
        workerId: shift.workerId,
        type: values.type,
        startsAt: brusselsLocalInputToApi(values.startsAt),
        endsAt: brusselsLocalInputToApi(values.endsAt),
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["shifts"] });
      const first = result.openedShiftIds[0];
      if (first === undefined) {
        toast.success(t("absence.noneAffected"));
        onOpenChange(false);
        return;
      }
      toast.success(t("absence.saved"));
      onOpenChange(false);
      navigate(`/shifts/${first}/replacements`, {
        state: shift ? { absentName: `${shift.firstName} ${shift.lastName}` } : undefined,
      });
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : undefined;
      toast.error(t(errorMessageKey(code)));
    },
  });

  const types: AbsenceType[] = ["sick", "vacation", "unavailable"];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("absence.title")}
      description={shift ? `${shift.firstName} ${shift.lastName}. ${t("absence.intro")}` : t("absence.intro")}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label={t("absence.type")}>
          <SelectField
            value={form.watch("type")}
            onValueChange={(value) => form.setValue("type", value as AbsenceType)}
            options={types.map((type) => ({ value: type, label: t(`absenceType.${type}`) }))}
          />
        </Field>
        <Field label={t("absence.starts")} htmlFor="absence-start">
          <Input id="absence-start" type="datetime-local" {...form.register("startsAt")} />
        </Field>
        <Field label={t("absence.ends")} htmlFor="absence-end" error={form.formState.errors.endsAt ? t("absence.endAfterStart") : undefined}>
          <Input id="absence-end" type="datetime-local" {...form.register("endsAt")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("absence.cancel")}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {t("absence.confirm")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function defaults(): FormValues {
  return {
    type: "sick",
    startsAt: utcToBrusselsInput(nowApiUtc()),
    endsAt: utcToBrusselsInput(endOfTodayApi()),
  };
}
