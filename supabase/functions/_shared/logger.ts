export function log(fn: string, action: string, data?: unknown) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), fn, action, ...(data ? { data } : {}) }));
}
