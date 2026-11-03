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

export function requestGuidance(request, language = 'en') {
  const messages = {
    pending: ['ఇంకా నిర్ధారణ కాలేదు. సేవాదారు అంగీకారం కోసం వేచి ఉండండి.', 'Awaiting provider acceptance. Your request is not confirmed yet.'],
    accepted: request.mode === 'callback'
      ? ['తిరిగి కాల్ అభ్యర్థన అంగీకరించారు. ఇది సందర్శన నిర్ధారణ కాదు.', 'Your callback request was accepted. Contact the provider to agree on the next steps.']
      : request.kind === 'ambulance'
        ? ['ఆపరేటర్ అభ్యర్థనను అంగీకరించారు. వాహనం మరియు పికప్ వివరాలను నేరుగా నిర్ధారించండి.', 'The operator accepted the request. Confirm the vehicle and pickup directly; this platform does not track dispatch.']
        : ['సేవాదారు అంగీకరించారు. చూపిన తేదీ మరియు సమయానికి సిద్ధంగా ఉండండి.', 'The provider accepted your service request. Prepare for the listed date and time.'],
    in_progress: ['సేవ ప్రారంభమైంది.', 'The provider has started the service.'],
    completed: ['సేవ పూర్తయినట్లు సేవాదారు నమోదు చేశారు.', 'The provider marked this service completed.'],
    rejected: ['కారణాన్ని స్థితి చరిత్రలో చూడండి. మరో సేవను వెతకవచ్చు.', 'Read the reason in the status timeline. You can browse other services.'],
    cancelled: ['ఈ అభ్యర్థన రద్దయింది. కొత్త అభ్యర్థన విడిగా పంపాలి.', 'This request was cancelled. Any replacement requires a new request.'],
    expired: ['ఆమోదానికి ముందే గడువు ముగిసింది. కొత్త సమయం ఎంచుకోండి.', 'The request expired before acceptance. Check availability before requesting again.']
  };
  return messages[request.status]?.[language === 'te' ? 0 : 1] || request.status;
}
