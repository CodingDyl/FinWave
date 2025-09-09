// generate one correlation id per tab
let cid = crypto.randomUUID();
export function getCorrelationId() {
  return cid;
}
