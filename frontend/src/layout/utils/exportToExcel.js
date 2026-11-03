// xlsx is ~300kB minified; loaded only when an export actually runs instead
// of bundled into every page that renders an export button.
export const exportToExcel = async ({
  data = [],
  fileName = "Export",
  sheetName = "Sheet1",
}) => {
  if (!data?.length) {
    return;
  }

  const XLSX = await import("xlsx");

  const worksheet = XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName
  );

  XLSX.writeFile(
    workbook,
    `${fileName}.xlsx`
  );
};