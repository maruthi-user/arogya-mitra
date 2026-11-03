export const toOptions = (
  list = [],
  selectedValue,
  selectedLabel
) => {
  const options = list.map((item) => {

    if ("userID" in item && "fullName" in item) {
      return {
        label: `${item.fullName} (${item.userID})`,
        value: item.userID,
      };
    }

    if ("id" in item && "orgName" in item) {
      return {
        label: item.orgName,
        value: item.id,
      };
    }

    return {
      label: item.label ?? String(item.value ?? ""),
      value: item.value ?? "",
    };
  });

  if (
    selectedValue &&
    !options.some(
      (opt) => String(opt.value) === String(selectedValue)
    )
  ) {
    options.unshift({
      label: selectedLabel || String(selectedValue),
      value: selectedValue,
    });
  }

  return options;
};