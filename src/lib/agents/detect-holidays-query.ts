export function isUpcomingHolidaysQuery(text: string): boolean {
  return /วันหยุด|นักขัตฤกษ์|holiday|เทศกาล/i.test(text);
}
