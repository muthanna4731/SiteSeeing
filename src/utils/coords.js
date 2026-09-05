// Some rows were entered as packed degrees-minutes-seconds digits with the
// decimal point dropped: 12° 17' 25.1" became 121725.1 instead of 12.29031.
// Recover those, and reject anything that still isn't a usable coordinate so a
// single bad row can't drag the map's bounds across the globe.

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// Reads a packed DMS number back into decimal degrees. `degDigits` is how many
// leading digits hold the degrees (2 for latitude here, 2 for Mysuru longitude).
function unpackDms(value, degDigits) {
  const digits = Math.abs(value).toFixed(6).replace('.', '');
  const degrees = Number(digits.slice(0, degDigits));
  const minutes = Number(digits.slice(degDigits, degDigits + 2));
  const seconds = Number(`${digits.slice(degDigits + 2, degDigits + 4)}.${digits.slice(degDigits + 4, degDigits + 6)}`);
  // Minutes and seconds above 60 mean the source digits were wrong, not just
  // unpunctuated, and there's no way to guess what was meant.
  if (minutes >= 60 || seconds >= 60) return null;
  const decimal = degrees + minutes / 60 + seconds / 3600;
  return Math.sign(value) * decimal;
}

function normalize(value, limit, degDigits) {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!isFiniteNumber(num)) return null;
  if (Math.abs(num) <= limit) return num;
  const unpacked = unpackDms(num, degDigits);
  return unpacked !== null && Math.abs(unpacked) <= limit ? unpacked : null;
}

// Returns [lat, lng] usable by Leaflet, or null when the row can't be mapped.
export function toLatLng(property) {
  if (!property) return null;
  const lat = normalize(property.lat, 90, 2);
  const lng = normalize(property.lng, 180, 2);
  return lat === null || lng === null ? null : [lat, lng];
}

// Convenience for the common "give me only the mappable rows" case.
export function withLatLng(properties) {
  return properties
    .map((property) => ({ property, position: toLatLng(property) }))
    .filter((entry) => entry.position !== null);
}
