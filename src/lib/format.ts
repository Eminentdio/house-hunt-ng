// All money is stored as integer kobo. 1 naira = 100 kobo.
export const formatNaira = (kobo: number | null | undefined) =>
  "₦" + Math.round((kobo ?? 0) / 100).toLocaleString("en-NG");

export const nairaToKobo = (naira: number) => Math.round(naira * 100);
export const koboToNaira = (kobo: number) => Math.round(kobo) / 100;

// Platform fee is charged ON TOP of rent and paid by the tenant.
// NOTE: the real fee is always computed on the server at payment time; this is a preview only.
export const feeKobo = (rentKobo: number, rate: number) => Math.round(rentKobo * rate);

export const formatBytes = (bytes: number) =>
  bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";

export const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
