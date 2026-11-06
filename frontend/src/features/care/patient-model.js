// UI transformations only: service records and locations are supplied by the API.
export function filterServices(services, filters = {}) {
  const query = (filters.query || '').trim().toLocaleLowerCase();
  return services.filter(service =>
    (!filters.kind || service.kind === filters.kind) &&
    (!filters.village || service.coverage.includes(filters.village)) &&
    (filters.accepting !== 'yes' || service.available) &&
    [service.title, service.titleTe, service.organization, service.description].join(' ').toLocaleLowerCase().includes(query)
  ).sort((a, b) => {
    const price = filters.sort === 'feeAsc' ? Number(a.totalFee??a.fee) - Number(b.totalFee??b.fee)
      : filters.sort === 'feeDesc' ? Number(b.totalFee??b.fee) - Number(a.totalFee??a.fee) : 0;
    return price || String(a.title).localeCompare(String(b.title)) || String(a.id).localeCompare(String(b.id));
  });
}
