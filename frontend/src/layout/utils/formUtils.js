export const getEmptyFormValues = (config) => {
  const values = {};

  // 🔥 safe access
  const fields = config?.fields || config?.form?.fields || [];

  fields.forEach((field) => {
    values[field.name] = field.defaultValue || "";
  });

  return values;
};