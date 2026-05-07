export const fmt = (n) => {
  if (n == null) return '—'
  return '৳' + Number(n).toLocaleString('en-BD', { maximumFractionDigits: 0 })
}
