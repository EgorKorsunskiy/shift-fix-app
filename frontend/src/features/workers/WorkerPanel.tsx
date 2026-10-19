import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useBlocker } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkerDetail } from "@/api/types";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { queryKeys } from "@/api/keys";
import { QualificationChips } from "@/components/domain/QualificationChips";
import { Button, buttonClass } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SelectField } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { formatEur } from "@/lib/money";
import { formatIsoDate } from "@/lib/dates";
import { QUALIFICATION_CATALOG } from "@/lib/qualifications";
import { patchWorker } from "./api";
import { diffWorker, toFormValues, workerFormSchema, type WorkerFormValues } from "./schema";

const CHANNELS = ["telegram", "sms", "whatsapp", "email", "phone"] as const;

export function WorkerPanel({ worker }: { worker: WorkerDetail }) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerFormSchema),
    defaultValues: toFormValues(worker),
  });
  const qualifications = useFieldArray({ control: form.control, name: "qualifications" });
  const channels = useFieldArray({ control: form.control, name: "contactChannels" });
  const [confirmOff, setConfirmOff] = useState(false);

  const blocker = useBlocker(editing && form.formState.isDirty);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(t("workers.unsaved"))) blocker.proceed();
    else blocker.reset();
  }, [blocker, t]);

  useEffect(() => {
    if (!editing || !form.formState.isDirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [editing, form.formState.isDirty]);

  const mutation = useMutation({
    mutationFn: (values: WorkerFormValues) => {
      const patch = diffWorker(worker, values);
      if (!patch) return Promise.resolve(worker);
      return patchWorker(worker.workerId, patch);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.worker(worker.workerId), updated);
      void queryClient.invalidateQueries({ queryKey: ["workers"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history(worker.workerId) });
      form.reset(toFormValues(updated));
      setEditing(false);
      toast.success(t("workers.saved"));
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : undefined;
      form.setError("root", { message: t(errorMessageKey(code)) });
    },
  });

  const values = form.watch();

  if (!editing) {
    return (
      <div className="space-y-3 border-t border-slate-200 px-4 py-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label={t("workers.contract")} value={t(`contract.${worker.contractType}`)} />
          <Item label={t("workers.contractHours")} value={t("workers.hoursPerWeek", { hours: worker.contractHoursPerWeek })} />
          <Item label={t("workers.hourlyRate")} value={formatEur(worker.hourlyRateCents, i18n.language)} />
          <Item label={t("workers.priority")} value={String(worker.priorityFactor)} />
          <Item label={t("workers.language")} value={t(`language.${worker.language}`)} />
          <Item label={t("workers.active")} value={worker.isActive ? t("common.yes") : t("common.no")} />
          {worker.contractType === "student" ? (
            <Item label={t("workers.studentHours")} value={String(worker.studentHoursExternalYtd)} />
          ) : null}
          <Item label={t("workers.workedThisWeek")} value={t("common.hoursShort", { hours: worker.workedHoursThisWeek })} />
        </dl>
        <div>
          <p className="mb-1 font-medium">{t("workers.qualifications")}</p>
          <QualificationChips items={worker.qualifications} />
          <ul className="mt-1 text-slate-500">
            {worker.qualifications.map((item) => (
              <li key={item.code}>
                {item.name}
                {": "}
                {item.validUntil ? formatIsoDate(item.validUntil, i18n.language) : t("workers.neverExpires")}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium">{t("workers.channels")}</p>
          <ul className="space-y-1">
            {worker.contactChannels.map((channel) => (
              <li key={channel.type} className="flex flex-wrap items-center gap-2">
                <span>{t(`channel.${channel.type}`)}</span>
                <ChannelValue type={channel.type} address={channel.address} />
                {channel.isPreferred ? <Badge tone="accent">{t("replacements.preferred")}</Badge> : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            {t("workers.edit")}
          </Button>
          <Link to={`/workers/${worker.workerId}/history`} className={buttonClass({ variant: "ghost" })}>
            {t("workers.history")}
          </Link>
        </div>
      </div>
    );
  }

  const qualError = form.formState.errors.qualifications?.message;
  const channelError = form.formState.errors.contactChannels?.message;

  return (
    <form
      className="space-y-4 border-t border-slate-200 px-4 py-4"
      onSubmit={form.handleSubmit((next) => mutation.mutate(next))}
    >
      {form.formState.errors.root?.message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-red-700" role="alert">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("workers.firstName")} htmlFor="firstName" error={textError(form.formState.errors.firstName?.message, t)}>
          <Input id="firstName" {...form.register("firstName")} />
        </Field>
        <Field label={t("workers.lastName")} htmlFor="lastName" error={textError(form.formState.errors.lastName?.message, t)}>
          <Input id="lastName" {...form.register("lastName")} />
        </Field>
        <Field label={t("workers.contract")}>
          <SelectField
            value={values.contractType}
            onValueChange={(value) => {
              form.setValue("contractType", value as WorkerFormValues["contractType"], { shouldDirty: true });
              if (value !== "student") form.setValue("studentHoursExternalYtd", 0, { shouldDirty: true });
            }}
            options={(["full_time", "part_time", "student"] as const).map((type) => ({
              value: type,
              label: t(`contract.${type}`),
            }))}
          />
        </Field>
        <Field label={t("workers.language")}>
          <SelectField
            value={values.language}
            onValueChange={(value) => form.setValue("language", value as WorkerFormValues["language"], { shouldDirty: true })}
            options={(["nl", "fr", "en"] as const).map((language) => ({
              value: language,
              label: t(`language.${language}`),
            }))}
          />
        </Field>
        <Field label={t("workers.contractHours")} htmlFor="hours" error={textError(form.formState.errors.contractHoursPerWeek?.message, t)}>
          <Input id="hours" type="number" min={0} step="0.5" {...form.register("contractHoursPerWeek", { valueAsNumber: true })} />
        </Field>
        <Field label={t("workers.hourlyRate")} htmlFor="rate" error={textError(form.formState.errors.hourlyRateEur?.message, t)}>
          <Input id="rate" type="number" min={0} step="0.01" {...form.register("hourlyRateEur", { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label={t("workers.priority")} hint={t("workers.priorityHint")}>
        <SegmentedControl
          label={t("workers.priority")}
          value={values.priorityFactor}
          options={[0, 1, 2, 3]}
          onChange={(value) => form.setValue("priorityFactor", value, { shouldDirty: true, shouldValidate: true })}
        />
      </Field>
      <Field
        label={t("workers.studentHours")}
        htmlFor="studentHours"
        error={textError(form.formState.errors.studentHoursExternalYtd?.message, t)}
      >
        <Input
          id="studentHours"
          type="number"
          min={0}
          step="0.5"
          disabled={values.contractType !== "student"}
          {...form.register("studentHoursExternalYtd", { valueAsNumber: true })}
        />
      </Field>
      <Toggle
        label={t("workers.active")}
        checked={values.isActive}
        onCheckedChange={(checked) => {
          if (!checked && worker.isActive) {
            setConfirmOff(true);
            return;
          }
          form.setValue("isActive", checked, { shouldDirty: true });
        }}
      />
      <p className="text-slate-500">
        {t("workers.workedThisWeek")}: {t("common.hoursShort", { hours: worker.workedHoursThisWeek })}
      </p>

      <fieldset className="space-y-2">
        <legend className="font-medium">{t("workers.qualifications")}</legend>
        {qualError ? <p className="text-red-700">{t(`validation.${qualError}`, { defaultValue: qualError })}</p> : null}
        {qualifications.fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <SelectField
              value={values.qualifications[index]?.code ?? ""}
              onValueChange={(value) => form.setValue(`qualifications.${index}.code`, value, { shouldDirty: true })}
              options={QUALIFICATION_CATALOG.map((item) => ({
                value: item.code,
                label: t(`qualifications.${item.code}`, { defaultValue: item.name }),
              }))}
            />
            <Input type="date" aria-label={t("workers.expires")} {...form.register(`qualifications.${index}.validUntil`)} />
            <Button type="button" variant="ghost" onClick={() => qualifications.remove(index)}>
              {t("workers.remove")}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const used = new Set(values.qualifications.map((item) => item.code));
            const next = QUALIFICATION_CATALOG.find((item) => !used.has(item.code));
            if (!next) return;
            qualifications.append({ code: next.code, validUntil: "" });
          }}
        >
          {t("workers.addQualification")}
        </Button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium">{t("workers.channels")}</legend>
        {channelError ? <p className="text-red-700">{t(`validation.${channelError}`, { defaultValue: channelError })}</p> : null}
        {channels.fields.map((field, index) => (
          <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
            <SelectField
              value={values.contactChannels[index]?.type ?? "phone"}
              onValueChange={(value) =>
                form.setValue(`contactChannels.${index}.type`, value as WorkerFormValues["contactChannels"][number]["type"], {
                  shouldDirty: true,
                })
              }
              options={CHANNELS.map((type) => ({ value: type, label: t(`channel.${type}`) }))}
            />
            <Input aria-label={t("workers.address")} {...form.register(`contactChannels.${index}.address`)} />
            <Button
              type="button"
              variant={values.contactChannels[index]?.isPreferred ? "primary" : "secondary"}
              onClick={() => {
                values.contactChannels.forEach((_, channelIndex) => {
                  form.setValue(`contactChannels.${channelIndex}.isPreferred`, channelIndex === index, { shouldDirty: true });
                });
              }}
            >
              {t("replacements.preferred")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => channels.remove(index)}>
              {t("workers.remove")}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const used = new Set(values.contactChannels.map((item) => item.type));
            const next = CHANNELS.find((type) => !used.has(type));
            if (!next) return;
            channels.append({ type: next, address: "", isPreferred: values.contactChannels.length === 0 });
          }}
        >
          {t("workers.addChannel")}
        </Button>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" loading={mutation.isPending}>
          {t("workers.save")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            form.reset(toFormValues(worker));
            setEditing(false);
          }}
        >
          {t("workers.cancel")}
        </Button>
      </div>

      <Modal open={confirmOff} onOpenChange={setConfirmOff} title={t("workers.deactivateTitle")} description={t("workers.deactivateBody", { name: `${worker.firstName} ${worker.lastName}` })}>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmOff(false)}>
            {t("workers.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              form.setValue("isActive", false, { shouldDirty: true });
              setConfirmOff(false);
            }}
          >
            {t("workers.deactivateConfirm")}
          </Button>
        </div>
      </Modal>
    </form>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ChannelValue({ type, address }: { type: string; address: string }) {
  if (type === "email") return <a className="text-indigo-700 underline" href={`mailto:${address}`}>{address}</a>;
  if (type === "phone" || type === "sms" || type === "whatsapp") {
    return <a className="text-indigo-700 underline" href={`tel:${address}`}>{address}</a>;
  }
  return <span>{address}</span>;
}

function textError(message: string | undefined, t: (key: string) => string): string | undefined {
  if (!message) return undefined;
  return t(`validation.${message}`);
}
