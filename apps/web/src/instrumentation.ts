export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initWebMonitoring } = await import('./lib/monitoring');
    await initWebMonitoring();
  }
}
