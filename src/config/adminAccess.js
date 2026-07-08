export const ALLOWED_ADMIN_EMAILS = [
  "studioelhassani@gmail.com",
  "elhassanilive@gmail.com",
];

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isAllowedAdminEmail(email) {
  return ALLOWED_ADMIN_EMAILS.includes(normalizeEmail(email));
}
