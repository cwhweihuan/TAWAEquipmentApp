"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import type { EquipmentDTO } from "@/lib/types";
import { DEPARTMENTS, deptStyle, cn } from "@/lib/utils";
import { createEquipment, updateEquipment } from "@/app/actions/equipment";

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

export function EquipmentForm({ item }: { item?: EquipmentDTO }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const editing = !!item;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        if (editing) await updateEquipment(item!.id, fd);
        else await createEquipment(fd);
        router.push("/catalog");
        router.refresh();
      } catch (err) {
        setError((err as Error).message || "Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/catalog"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={15} /> Back to catalog
      </Link>
      <h1 className="mb-5 text-xl font-semibold tracking-tight text-gray-900">
        {editing ? `Edit #${item!.masterItemNo}` : "New equipment"}
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {/* basics */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Description" name="description" defaultValue={item?.description} required />
            </div>
            <Field label="Manufacturer" name="manufacturer" defaultValue={item?.manufacturer} />
            <Field label="Model" name="model" defaultValue={item?.model} />
            <Field label="Supply by" name="supplyBy" defaultValue={item?.supplyBy} placeholder="OWNER, G.C…" />
            <Field label="Install by" name="installBy" defaultValue={item?.installBy} />
          </div>

          {/* departments */}
          <div className="mt-4">
            <span className="text-xs font-medium text-gray-600">Departments</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((d) => {
                const checked = item?.departments.includes(d);
                const s = deptStyle(d);
                return (
                  <label
                    key={d}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700"
                  >
                    <input
                      type="checkbox"
                      name={`dept:${d}`}
                      defaultChecked={checked}
                      className="peer sr-only"
                    />
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                    {d}
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        {/* technical specs */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Technical specs</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Power" name="power" defaultValue={item?.power} />
            <Field label="Height" name="height" defaultValue={item?.height} />
            <Field label="NEMA" name="nema" defaultValue={item?.nema} />
            <Field label="Data / Phone" name="dataPhone" defaultValue={item?.dataPhone} />
            <Field label="Water — cold" name="waterCold" defaultValue={item?.waterCold} />
            <Field label="Water — hot" name="waterHot" defaultValue={item?.waterHot} />
            <Field label="Water — elev." name="waterElev" defaultValue={item?.waterElev} />
            <Field label="Gas — pipe" name="gasPipe" defaultValue={item?.gasPipe} />
            <Field label="Gas — BTU" name="gasBtu" defaultValue={item?.gasBtu} />
            <Field label="Gas — elev." name="gasElev" defaultValue={item?.gasElev} />
            <Field label="Floor sink" name="floorSink" defaultValue={item?.floorSink} />
          </div>
          <div className="mt-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Remarks</span>
              <textarea
                name="remarks"
                defaultValue={item?.remarks ?? ""}
                rows={2}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
        </section>

        {/* pdf */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Spec sheet (PDF)</h2>
          {editing && item?.pdfUrl && (
            <p className="mb-2 text-xs text-gray-500">
              A spec is already attached. Uploading a new file will replace it.
            </p>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 hover:bg-gray-100">
            <Upload size={16} />
            {fileName ?? "Choose a PDF to attach"}
            <input
              type="file"
              name="pdf"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/catalog"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 size={15} className="animate-spin" />}
            {editing ? "Save changes" : "Create equipment"}
          </button>
        </div>
      </form>
    </div>
  );
}
