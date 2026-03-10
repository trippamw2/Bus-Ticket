import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('platform_settings').select('id').limit(1);
    return jsonResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: error ? 'unhealthy' : 'healthy',
    });
  } catch (e) {
    return jsonResponse({ status: 'error', message: String(e) }, 500);
  }
});
