import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@layout/ui/button";
import Form from "@layout/form/Form";
import FormLayout from "@layout/form/FormLayout";
import { buildFields } from "@layout/form/DynamicForm";

/**
 * Config-driven filter pop-up. Same field format as DynamicForm
 * (text, number, date, select, checkbox ... with options / optionsKey):
 *
 *   {
 *     "title": "Filter items",
 *     "columns": 2,
 *     "fields": [
 *       { "name": "category", "label": "Category", "type": "select", "options": ["Hardware", "Software"] },
 *       { "name": "minQty", "label": "Min quantity", "type": "number" }
 *     ]
 *   }
 *
 * Centred like every form; Esc or a double-click on the backdrop closes it.
 * Apply calls onApply(values) with only the filled-in fields; Reset calls it
 * with {}.
 */
export const countActiveFilters = (values = {}) =>
  Object.values(values).filter((v) => v !== "" && v !== null && v !== undefined && v !== false).length;

const clean = (values) =>
  Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false)
  );

export default function ConfigFilter({ config, values = {}, optionSources, isOpen, onClose, onApply }) {
  const empty = useMemo(
    () => Object.fromEntries((config.fields || []).map((f) => [f.name, f.type === "checkbox" ? false : ""])),
    [config]
  );
  const methods = useForm({ defaultValues: { ...empty, ...values } });
  const fields = useMemo(
    () => buildFields({ ...config, fields: (config.fields || []).map((f) => ({ ...f, required: false })) }, optionSources),
    [config, optionSources]
  );

  useEffect(() => {
    if (isOpen) methods.reset({ ...empty, ...values });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const apply = (v) => {
    onApply?.(clean(v));
    onClose?.();
  };
  const reset = () => {
    methods.reset(empty);
    onApply?.({});
    onClose?.();
  };

  const formId = `filter-${config.id || "form"}`;

  return (
    <FormLayout isOpen={isOpen} onClose={onClose} title={config.title || "Filters"} size={config.size || "md"}>
      <Form config={fields} methods={methods} onSubmit={apply} columns={config.columns || 2} formId={formId} />
      <div className="mt-5 flex justify-between gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={reset}>
          Reset
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Apply filters
          </Button>
        </div>
      </div>
    </FormLayout>
  );
}
