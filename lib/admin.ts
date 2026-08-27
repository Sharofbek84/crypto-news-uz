/** Admin email ro‘yxati: Vercel env ADMIN_EMAILS=email1@x.com,email2@y.com */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = getAdminEmails()
  if (list.length === 0) return false
  return list.includes(email.toLowerCase().trim())
}
