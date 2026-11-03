import React, { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { ChevronDown, X, FolderPlus, } from "lucide-react";
import { SelectTrigger, Select, SelectValue, SelectContent, SelectItem } from "@layout/ui/select";
import { createPortal } from "react-dom";
import Loaders from "@layout/feedback/Loader";
import { SearchableSelect } from "@layout/filters/GenericFilter";

/* Enterprise Design System Input Style - exported so screens that render
 * their own controls around a <Form> (e.g. the reports generate modal's
 * Module/Report pickers) match the shared form field-for-field instead of
 * re-declaring a near-copy that drifts. */
export const FORM_INPUT_STYLE =
  "w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition duration-200";

export const FORM_LABEL_STYLE =
  "text-sm font-semibold text-foreground flex items-center gap-2";

const Form = ({ config, onSubmit, columns = 2, methods, onClientSearch, formMode, formId = "dynamic-form", selectedLabels, onFileAlreadyExists, dropdownLoading = false, }) => {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, dirtyFields },


  } = methods;  // Destructure methods from props

  const fields = Array.isArray(config) ? config : config?.fields || [];
  const fileInputRefs = useRef({});

  const baseInputStyle = FORM_INPUT_STYLE;
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };  //from 1 to 4 columns

  const colSpanClasses = {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
  };



  const getLabel = (field) => {
    if (!field.dynamicLabel) return field.label;

    const value = watch(field.dynamicLabel.field);

    return field.dynamicLabel.format
      ? field.dynamicLabel.format(
        value,
        watch() // all form values
      )
      : field.label;
  };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Date bounds. A date field may set:
  //   minDate / maxDate: "today" | "oneMonthFromToday" (max only)
  //   minDateField / maxDateField: name of another field whose value is the bound
  // Need a business rule (e.g. a payroll cycle)? Pass getMinDate(watch) /
  // getMaxDate(watch) functions on the field config.
  const getMinDate = (field) => {
    if (field.type !== "date") return undefined;
    if (typeof field.getMinDate === "function") return field.getMinDate(watch);
    if (field.minDate === "today") return formatLocalDate(new Date());
    if (field.minDateField) return watch(field.minDateField);
    return undefined;
  };

  const getMaxDate = (field) => {
    if (field.type !== "date") return undefined;
    if (typeof field.getMaxDate === "function") return field.getMaxDate(watch);
    if (field.maxDate === "today") return formatLocalDate(new Date());
    if (field.maxDate === "oneMonthFromToday") {
      const date = new Date();
      date.setMonth(date.getMonth() + 2);
      return formatLocalDate(date);
    }
    if (field.maxDateField) return watch(field.maxDateField);
    return undefined;
  };


  const shouldShowField = (field) => {
    if (!field.showWhen) return true;

    const selectedValue =
      field.showWhen.field === "__mode__"
        ? formMode
        : watch(field.showWhen.field);
    const condition = field.showWhen.value;

    return Array.isArray(condition)
      ? condition.includes(selectedValue)
      : selectedValue === condition;
  };

  const shouldEnableField = (field) => {
    if (!field.enableWhen) return true;

    const value = watch(field.enableWhen.field);

    return Array.isArray(field.enableWhen.value)
      ? field.enableWhen.value.includes(value)
      : value === field.enableWhen.value;
  };

  const shouldDisableField = (field) => {
    const autoFilled = isAutoFilledField(field);

    if (field.enableWhen) {
      return !shouldEnableField(field);
    }

    if (autoFilled) return true;

    if (field.disableWhen) {
      const value = watch(field.disableWhen.field);

      return Array.isArray(field.disableWhen.value)
        ? field.disableWhen.value.includes(value)
        : value === field.disableWhen.value;
    }

    return field.disabled || false;
  };


  // Helper to detect backend autofill
  const isAutoFilledField = (field) => {
    const isDirty = dirtyFields?.[field.name];
    const value = watch(field.name);
    const isEmpty = (value) =>
      value === null || value === undefined || value === "";
    return field.lockOnFill && isEmpty && !isDirty;
  };

  const renderField = (field) => {
    const isAutoFilled = isAutoFilledField(field);


    switch (field.type) {

      /* TEXT + DATE + PASSWORD */
      case "text":
      case "date":
      case "password":
        return (
          <div
            key={field.name}
            className={`space-y-1 ${colSpanClasses[field.colSpan] || "md:col-span-1"}`}>
            <label className=" text-sm font-semibold text-foreground flex items-center gap-2">
              {getLabel(field)}
              {field.required && (<span className="text-destructive">*</span>)}
            </label>

            <input
              type={field.type}
              min={field.type === "date" ? getMinDate(field) : undefined}
              max={field.type === "date" ? getMaxDate(field) : undefined}
              autoComplete={field.type === "password" ? "new-password" : "off"}
              placeholder={field.placeholder || ""}
              {...register(field.name, {
                required: field.required,
                ...field.validation,
                ...(field.uppercase
                  ? {
                    setValueAs: (value) =>
                      typeof value === "string"
                        ? value.toUpperCase()
                        : value,
                  }
                  : {}),
                ...(field.numeric
                  ? {
                    setValueAs: (value) =>
                      typeof value === "string"
                        ? value.replace(/\D/g, "")
                        : value,
                  }
                  : {}),
              })}
              style={{
                textTransform: field.uppercase ? "uppercase" : undefined,
              }}
              inputMode={field.numeric ? "numeric" : undefined}
              disabled={shouldDisableField(field)}
              onClick={field.type === "date" ? (e) => {
                e.target.showPicker?.();
              } : undefined}
              onKeyDown={field.numeric ? (e) => {
                const allowedKeys = [
                  "Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight",
                  "ArrowUp", "ArrowDown", "Home", "End", "Enter"
                ];
                const isNumberKey = e.key >= "0" && e.key <= "9";
                const isModifier = e.ctrlKey || e.metaKey || e.altKey;

                if (!isNumberKey && !allowedKeys.includes(e.key) && !isModifier) {
                  e.preventDefault();
                }
              } : undefined}
              className={`${baseInputStyle}
              ${shouldDisableField(field)
                  ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                  : ""
                }
                ${errors[field.name]
                  ? "border-destructive focus:ring-destructive"
                  : ""
                }
              `}
            />
            {errors[field.name] && (
              <p className="text-xs text-destructive">
                {errors[field.name]?.message || `${field.label} is required`}
              </p>
            )}
          </div>
        );

      case "email":
        return (
          <div
            key={field.name}
            className={`space-y-1 ${`md:col-span-${field.colSpan || 1}`}`}
          >
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              {getLabel(field)}
              {field.required && (
                <span className="text-destructive">*</span>
              )}
            </label>

            <input
              type="email"
              autoComplete="off"
              placeholder={field.placeholder || "Enter email"}
              {...register(field.name, {
                required: field.required
                  ? `${field.label} is required`
                  : false,
                pattern: {
                  value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                  message: "Please enter a valid email address",
                },
                ...field.validation,
              })}
              disabled={shouldDisableField(field)}
              className={`${baseInputStyle}
          ${isAutoFilled
                  ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 cursor-not-allowed"
                  : ""
                }
          ${errors[field.name]
                  ? "border-destructive focus:ring-destructive"
                  : ""
                }`}
            />

            {errors[field.name] && (
              <p className="text-xs text-destructive">
                {errors[field.name]?.message}
              </p>
            )}
          </div>
        );

      /* CUSTOM: field.render({ watch, control, setValue, field }) returns any node */
      case "custom": {
        if (typeof field.render !== "function") return null;
        const node = field.render({ watch, control, setValue, field });
        if (!node) return null;
        return (
          <div
            key={field.name}
            className={`space-y-1 md:col-span-${field.colSpan || 1}`}
          >
            {node}
          </div>
        );
      }

      /* NUMBER */
      case "number":
        const isDisabled = shouldDisableField(field);

        return (
          <div
            key={field.name}
            className={`space-y-1 md:col-span-${field.colSpan || 1}`}
          >
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              {field.icon && <field.icon className="h-4 w-4 text-primary" />}
              {getLabel(field)}
            </label>

            <div className="flex items-center gap-4">

              {/* INPUT */}
              <input
                type="number"
                {...register(field.name, {
                  required: field.required && `${getLabel(field)} is required`,
                  // valueAsNumber: true,
                  setValueAs: (value) => (value === "" ? undefined : Number(value)),
                })}
                disabled={isDisabled}
                placeholder=""
                onFocus={(e) => {
                  if (e.target.value === "0") {
                    e.target.value = "";
                  }
                }}
                className={`${baseInputStyle} no-spinner ${isDisabled
                  ? "bg-muted text-muted-foreground dark:bg-gray-700 cursor-not-allowed"
                  : ""
                  }`}
              />

              {/* INLINE CHECKBOX */}
              {field.inlineCheckbox && (
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input
                    type="checkbox"
                    {...register(field.inlineCheckbox.name)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                  {field.inlineCheckbox.label}
                </label>
              )}
            </div>

            {errors[field.name] && (
              <p className="text-xs text-destructive">
                {errors[field.name].message}
              </p>
            )}
          </div>
        );
      /* TEXTAREA */
      case "textarea":
        return (
          <div
            key={field.name}
            className={`space-y-0.5 ${colSpanClasses[field.colSpan] || "md:col-span-1"
              }`}
          >
            <label className="text-sm font-semibold text-foreground flex items-center gap-1">
              {field.icon && <field.icon className="h-4 w-4 text-primary" />}
              {getLabel(field)}
              {field.required && (
                <span className="text-destructive">*</span>
              )}
            </label>

            <textarea
              rows={4}
              {...register(field.name, {
                required: field.required,
              })}
              disabled={shouldDisableField(field)}
              style={{
                minHeight: 80,
                maxHeight: 180
              }}
              className={`${baseInputStyle}
  ${shouldDisableField(field)
                  ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                  : ""
                }
  ${errors[field.name]
                  ? "border-destructive focus:ring-destructive"
                  : ""
                }`}
            />

            {errors[field.name] && (
              <p className="text-xs text-destructive">
                {getLabel(field)} is required
              </p>
            )}
          </div>
        );

      /* SELECT */
      case "select":
        return (
          <div
            key={field.name}
            className={`space-y-1 ${colSpanClasses[field.colSpan] || "md:col-span-1"}`}
          >
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              {field.icon && <field.icon className="h-4 w-4 text-primary" />}
              {getLabel(field)}
              {field.required && (
                <span className="text-destructive">*</span>
              )}
            </label>

            <Controller
              name={field.name}
              control={control}
              rules={{
                required: field.required && `${getLabel(field)} is required`,
              }}
              render={({ field: controllerField }) => {
                const isAutoFilled = isAutoFilledField(field);

                // =========================
                // MULTI SELECT WITH SEARCH
                // =========================
                // if (field.multiple) {
                //   const selectedValues = controllerField.value || [];
                //   const [open, setOpen] = React.useState(false);
                //   const [search, setSearch] = React.useState("");
                //   const dropdownRef = React.useRef(null);
                //   const debounceRef = React.useRef(null);
                //   const [highlightedIndex, setHighlightedIndex] = React.useState(0);
                //   React.useEffect(() => {
                //     setHighlightedIndex(0);
                //   }, [search]);

                //   React.useEffect(() => {
                //     const handleClickOutside = (event) => {
                //       if (
                //         dropdownRef.current &&
                //         !dropdownRef.current.contains(event.target)
                //       ) {
                //         setOpen(false);
                //       }
                //     };

                //     document.addEventListener("mousedown", handleClickOutside);

                //     return () => {
                //       document.removeEventListener("mousedown", handleClickOutside);
                //     };
                //   }, []);

                //   const toggleValue = (value) => {
                //     if (isAutoFilled) return;

                //     if (selectedValues.includes(value)) {
                //       controllerField.onChange(
                //         selectedValues.filter((v) => v !== value)
                //       );
                //     } else {
                //       controllerField.onChange([...selectedValues, value]);
                //     }
                //   };

                //   // const filteredOptions = field.options?.filter((opt) => {
                //   //   const optionValue = typeof opt === "string" ? opt : opt.value;
                //   //   const optionLabel = typeof opt === "string" ? opt : opt.label;

                //   //   const q = search.toLowerCase();

                //   //   return (
                //   //     String(optionLabel).toLowerCase().includes(q) ||
                //   //     String(optionValue).toLowerCase().includes(q)
                //   //   );
                //   // });
                //   const rawList = optionsMap[field.name] || field.options || [];

                //   const options = React.useMemo(
                //     () => toOptions(rawList),
                //     [rawList]
                //   );

                //   const filteredOptions = options.filter((opt) => {
                //     const q = search.toLowerCase();

                //     return (
                //       opt.label.toLowerCase().includes(q) ||
                //       String(opt.value).toLowerCase().includes(q)
                //     );
                //   });

                //   return (
                //     <div ref={dropdownRef} className="relative">
                //       <div
                //         className={`${baseInputStyle} flex flex-wrap items-center gap-3 md:gap-2 min-h-[40px] ${isAutoFilled
                //           ? "bg-gray-200 pointer-events-none"
                //           : "cursor-pointer"
                //           }`}
                //         onClick={() => {
                //           setOpen(!open);

                //           if (!open) {
                //             loadOptions(field, "");
                //           }
                //         }}


                //       >
                //         {selectedValues.length === 0 && (
                //           <span className="text-muted-foreground">
                //             Select {field.label}
                //           </span>
                //         )}

                //         {selectedValues.map((val) => {
                //           const matchedOption = options.find((opt) => {
                //             return String(opt.value) === String(val);
                //           });

                //           const displayLabel = matchedOption?.label || val;

                //           return (
                //             <span
                //               key={val}
                //               className="flex items-center gap-1 border rounded px-1.5 py-0.5 text-xs bg-muted"
                //             >
                //               {displayLabel}

                //               <button
                //                 type="button"
                //                 onClick={(e) => {
                //                   e.stopPropagation();
                //                   toggleValue(val);
                //                 }}
                //                 className="text-red-500"
                //               >
                //                 ✕
                //               </button>
                //             </span>
                //           );
                //         })}

                //         <ChevronDown className="ml-auto h-3.5 w-3.5 opacity-50" />
                //       </div>

                //       {open && !isAutoFilled && (
                //         <div className="absolute z-50 mt-1 w-full border bg-popover text-popover-foreground rounded-md shadow-md p-2">
                //           {field.searchable && (
                //             <input
                //               type="text"
                //               placeholder="Search..."
                //               value={search}
                //               onChange={(e) => {
                //                 const value = e.target.value;

                //                 setSearch(value);

                //                 clearTimeout(debounceRef.current);

                //                 debounceRef.current = setTimeout(() => {
                //                   loadOptions(field, value);
                //                 }, 300);
                //               }}
                //               onKeyDown={(e) => {
                //                 if (!filteredOptions?.length) return;

                //                 switch (e.key) {
                //                   case "ArrowDown":
                //                     e.preventDefault();
                //                     setOpen(true);
                //                     setHighlightedIndex((prev) =>
                //                       prev < filteredOptions.length - 1 ? prev + 1 : prev
                //                     );
                //                     break;

                //                   case "ArrowUp":
                //                     e.preventDefault();
                //                     setHighlightedIndex((prev) =>
                //                       prev > 0 ? prev - 1 : 0
                //                     );
                //                     break;

                //                   case "Enter":
                //                     e.preventDefault();

                //                     if (open && filteredOptions[highlightedIndex]) {
                //                       const selected = filteredOptions[highlightedIndex];

                //                       const optionValue =
                //                         typeof selected === "string"
                //                           ? selected
                //                           : selected.value;

                //                       toggleValue(optionValue);
                //                     }
                //                     break;

                //                   case "Escape":
                //                     setOpen(false);
                //                     break;
                //                 }
                //               }}
                //               onMouseDown={(e) => e.stopPropagation()}
                //               className="mb-2 h-9 w-full rounded-md border px-2 text-sm outline-none bg-background"
                //               autoFocus
                //             />
                //           )}

                //           <div className="max-h-[40vh] overflow-auto">
                //             {filteredOptions?.length === 0 ? (
                //               <div className="px-2 py-2 text-sm text-muted-foreground">
                //                 No option found
                //               </div>
                //             ) : (
                //               filteredOptions?.map((opt, index) => {
                //                 const optionValue =
                //                   typeof opt === "string" ? opt : opt.value;
                //                 const optionLabel =
                //                   typeof opt === "string" ? opt : opt.label;

                //                 return (
                //                   <label
                //                     key={String(optionValue)}
                //                     className="flex items-center gap-3 md:gap-2 cursor-pointer py-1 hover:bg-muted rounded px-1"
                //                   >
                //                     <input
                //                       type="checkbox"
                //                       checked={selectedValues.includes(optionValue)}
                //                       onChange={() => toggleValue(optionValue)}
                //                     />

                //                     {optionLabel}
                //                   </label>
                //                 );
                //               })
                //             )}
                //           </div>
                //         </div>
                //       )}
                //     </div>
                //   );
                // }

                // =========================
                // SEARCHABLE SINGLE SELECT
                // =========================
                if (field.searchable) {
                  return (
                    <SearchableSelect
                      id={`form-${field.name}`}
                      value={controllerField.value}
                      onChange={controllerField.onChange}
                      asyncOptions={field.dataSource}
                      pageSize={field.pageSize ?? 10}
                      minSearchLength={field.minSearchLength}
                      placeholder={`Search ${field.label}`}
                      disabled={shouldDisableField(field)}
                      multiple={field.multiple}
                    />
                  );
                }

                // =========================
                // NORMAL SINGLE SELECT
                // =========================
                return (
                  <Select
                    value={
                      controllerField.value !== undefined
                        ? String(controllerField.value)
                        : ""
                    }
                    onValueChange={(value) => {
                      controllerField.onChange(value);
                    }}
                    onOpenChange={(open) => {
                      if (open) {
                        field.onOpen?.();
                      }
                    }}
                  >
                    <SelectTrigger
                      disabled={shouldDisableField(field)}
                      className={`${baseInputStyle} ${shouldDisableField(field) || isAutoFilled ? "bg-gray-200 dark:bg-gray-700 pointer-events-none opacity-70" : ""
                        }`}
                    >
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>

                    <SelectContent className="max-h-60 overflow-y-auto">
                      {field.options?.map((opt) => {
                        const optionValue =
                          typeof opt === "string" ? opt : opt.value;

                        const optionLabel =
                          typeof opt === "string" ? opt : opt.label;

                        const optionDisabled =
                          typeof opt === "string" ? false : opt.disabled;

                        if (optionValue === undefined || optionValue === null) {
                          return null;
                        }

                        return (
                          <SelectItem
                            key={String(optionValue)}
                            value={String(optionValue)}
                            disabled={optionDisabled}
                            className="data-[disabled]:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground"
                          >
                            {optionLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                );
              }}
            />

            {errors[field.name] && (
              <p className="text-xs text-destructive">
                {errors[field.name]?.message ||
                  `${getLabel(field)} is required`}
              </p>
            )}
          </div>
        );

      case "file":
        return (
          <div key={field.name} className="space-y-1">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              {field.icon && <field.icon className="h-4 w-4 text-primary" />}
              {getLabel(field)}
              {field.required && (
                <span className="text-destructive">*</span>
              )}
            </label>

            <Controller
              name={field.name}
              control={control}
              rules={{
                required: field.required && `${getLabel(field)} is required`,
              }}
              render={({ field: controllerField }) => {
                const files = controllerField.value || [];

                const fileList = Array.isArray(files)
                  ? files
                  : files
                    ? [files]
                    : [];
                {
                  fileList[0]?.existing ? (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Existing file
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ({(fileList[0]?.size / 1024).toFixed(1)} KB)
                    </span>
                  )
                }

                return (
                  <div className="space-y-1">

                    <input
                      id={field.name}
                      type="file"
                      ref={(el) => (fileInputRefs.current[field.name] = el)}
                      multiple={false}
                      accept={
                        field.accept ||
                        ".pdf,.xls,.xlsx,.csv,image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      }
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        if (fileList.length > 0) {
                          onFileAlreadyExists?.();
                          e.target.value = "";
                          return;
                        }
                        // controllerField.onChange(selectedFile);
                        controllerField.onChange(selectedFile ? [selectedFile] : []);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor={field.name}
                      className="
                  flex
                  items-center
                  justify-between
                  border
                  border-input
                  rounded-md
                  px-3
                  py-2
                  min-h-[42px]
                  cursor-pointer
                  hover:border-primary
                  transition
                "
                    >
                      <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <FolderPlus className="h-4 w-4 text-primary shrink-0" />

                        {fileList.length > 0 ? (
                          field.multiple ? (
                            <>
                              <span className="truncate text-sm font-medium">
                                {fileList[0].name}
                              </span>

                              {fileList.length === 1 ? (
                                fileList[0]?.size ? (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    ({(fileList[0].size / 1024).toFixed(1)} KB)
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    Existing file
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  +{fileList.length - 1} more
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="truncate text-sm font-medium">
                                {fileList[0].name}
                              </span>

                              {/* <span className="text-xs text-muted-foreground whitespace-nowrap">
                                ({(fileList[0].size / 1024).toFixed(1)} KB)
                              </span> */}
                              {fileList[0]?.size ? (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  ({(fileList[0].size / 1024).toFixed(1)} KB)
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  Existing file
                                </span>
                              )}
                            </>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Choose File...
                          </span>
                        )}
                      </div>

                      {fileList.length > 0 && (
                        <button
                          type="button"
                          className="ml-3 text-red-500 hover:text-red-600 font-semibold"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            controllerField.onChange(null);

                            if (fileInputRefs.current[field.name]) {
                              fileInputRefs.current[field.name].value = "";
                            }
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </label>
                  </div>
                );
              }}
            />

            {errors[field.name] && (
              <p className="text-xs text-destructive">
                {errors[field.name].message}
              </p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.name} className="flex items-center gap-3 md:gap-2">
            <input
              type="checkbox"
              {...register(field.name)}
              className="h-3.5 w-3.5 cursor-pointer"
            />
            <label className="text-sm font-semibold">
              {field.icon && <field.icon className="h-4 w-4 text-primary" />}
              {getLabel(field)}
            </label>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">

      <form onSubmit={handleSubmit(onSubmit)}
        id={formId}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="pb-6 md:pb-2"
      >

        {Array.isArray(fields?.[0]?.fields) ? (
          fields.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`grid ${gridCols[row.columns] || gridCols[2]
                } gap-1 sm:gap-2 mb-4`}
            >
              {row.fields
                .filter((field) => !field.hidden && shouldShowField(field))
                .map((field) => renderField(field))}
            </div>
          ))
        ) : (
          <div
            className={`grid ${gridCols[columns] || gridCols[2]
              } gap-1 sm:gap-2`}
          >
            {fields?.filter((field) => !field.hidden && shouldShowField(field)).map((field) => renderField(field))}
          </div>
        )}
      </form>
    </div>
  );
};

export default Form;