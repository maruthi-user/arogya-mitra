import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader } from "lucide-react";
import { Button } from "@layout/ui/button";
import Form from "./Form";
import FormLayout from "./FormLayout";

/**
 * ONE form for every application. Describe the form in a JSON/JS config and
 * render it - no JSX per form:
 *
 *   {
 *     "id": "item",
 *     "title": "Add item",              // or { "create": "Add item", "edit": "Edit item" }
 *     "size": "md",                     // sm | md | lg | xl
 *     "columns": 2,                     // 1-4
 *     "submitLabel": "Save",            // or { "create": "...", "edit": "..." }
 *     "cancelLabel": "Cancel",
 *     "fields": [
 *       { "name": "name", "label": "Name", "type": "text", "required": true,
 *         "validation": { "minLength": 3, "maxLength": 60 } },
 *       { "name": "email", "label": "Email", "type": "email" },
 *       { "name": "category", "label": "Category", "type": "select",
 *         "options": ["A", "B"] },                       // static options
 *       { "name": "owner", "label": "Owner", "type": "select",
 *         "optionsKey": "owners" },                      // options passed at runtime
 *       { "name": "code", "label": "Code", "type": "text",
 *         "validation": { "pattern": "^[A-Z]{3}-\\d+$", "patternMessage": "Use AAA-123" } },
 *       { "name": "notes", "label": "Notes", "type": "textarea", "colSpan": 2 },
 *       { "name": "other", "label": "Other", "type": "text",
 *         "showWhen": { "field": "category", "value": "A" } }
 *     ]
 *   }
 *
 * Field types: text, email, password, number, date, textarea, select, file,
 * checkbox. Per-field keys: name, label, type, required, placeholder,
 * options / optionsKey, defaultValue, colSpan, disabled, showWhen, enableWhen,
 * validation { minLength, maxLength, min, max, pattern, patternMessage }.
 *
 * Usage:
 *   <DynamicForm
 *     config={itemForm}
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onSubmit={async (values) => { await save(values); }}   // close on success
 *     initialValues={row}            // omit for "create", pass a record to edit
 *     optionSources={{ owners: [...] }}
 *   />
 * The form is always shown centred; Esc or a double-click on the backdrop
 * closes it. If onSubmit throws, the form stays open and shows the error.
 */

const pick = (value, mode) =>
  value && typeof value === "object" ? value[mode] ?? value.create ?? "" : value ?? "";

const toRules = (field) => {
  const v = field.validation || {};
  const rules = {};
  const label = field.label || field.name;
  if (v.minLength != null)
    rules.minLength = { value: v.minLength, message: `${label} must be at least ${v.minLength} characters` };
  if (v.maxLength != null)
    rules.maxLength = { value: v.maxLength, message: `${label} must be at most ${v.maxLength} characters` };
  if (v.min != null) rules.min = { value: v.min, message: `${label} must be at least ${v.min}` };
  if (v.max != null) rules.max = { value: v.max, message: `${label} must be at most ${v.max}` };
  if (v.pattern)
    rules.pattern = {
      value: new RegExp(v.pattern),
      message: v.patternMessage || `${label} is not in the expected format`,
    };
  return rules;
};

/** Turn the JSON field list into what <Form> expects. */
export const buildFields = (config, optionSources = {}) =>
  (config.fields || []).map((f) => {
    const { optionsKey, defaultValue: _d, ...rest } = f;
    const out = { ...rest, validation: toRules(f) };
    if (optionsKey) out.options = optionSources[optionsKey] || [];
    return out;
  });

const buildDefaults = (config, initialValues) => {
  const base = {};
  for (const f of config.fields || []) {
    base[f.name] = f.defaultValue ?? (f.type === "checkbox" ? false : "");
  }
  return { ...base, ...(initialValues || {}) };
};

export default function DynamicForm({
  config,
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  optionSources,
  loading = false,
  mode,
}) {
  const resolvedMode = mode || (initialValues ? "edit" : "create");
  const methods = useForm({ defaultValues: buildDefaults(config, initialValues) });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      methods.reset(buildDefaults(config, initialValues));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialValues, config]);

  const fields = useMemo(() => buildFields(config, optionSources), [config, optionSources]);
  const formId = `form-${config.id || "dynamic"}`;
  const busy = submitting || loading;

  const handleSubmit = async (values) => {
    setError("");
    setSubmitting(true);
    try {
      const result = await onSubmit?.(values, { mode: resolvedMode });
      if (result !== false) onClose?.();
    } catch (e) {
      const detail = e?.data?.message || e?.message;
      setError(typeof detail === "string" && detail ? detail : "Could not save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      closeOnEscape={!busy}
      closeOnBackdropDoubleClick={!busy}
      title={pick(config.title, resolvedMode)}
      size={config.size || "md"}
    >
      <Form
        config={fields}
        methods={methods}
        onSubmit={handleSubmit}
        columns={config.columns || 2}
        formId={formId}
        formMode={resolvedMode}
      />
      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          {config.cancelLabel || "Cancel"}
        </Button>
        <Button type="submit" form={formId} disabled={busy} className="min-w-24 gap-2">
          {busy && <Loader className="h-4 w-4 animate-spin" />}
          {pick(config.submitLabel, resolvedMode) || "Save"}
        </Button>
      </div>
    </FormLayout>
  );
}
