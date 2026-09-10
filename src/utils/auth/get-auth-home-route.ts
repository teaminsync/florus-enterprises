export function getAuthHomeRoute(profile: { role: 'admin' | 'trade'; password_set: boolean }): string {
  if (profile.role === 'admin') return '/admin';
  if (!profile.password_set) return '/trade/set-password';
  return '/trade/dashboard';
}
