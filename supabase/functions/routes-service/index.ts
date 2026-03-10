import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';
import { rateLimit } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getSupabaseAdmin();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (rateLimit(`routes:${ip}`)) return errorResponse('Rate limit exceeded', 429);

  try {
    // GET: list active routes, optional filter by origin/destination
    if (req.method === 'GET') {
      const origin = url.searchParams.get('origin');
      const destination = url.searchParams.get('destination');
      const operatorId = url.searchParams.get('operator_id');

      let query = supabase.from('routes').select('*, operators(name)').eq('status', 'active');
      if (origin) query = query.ilike('origin', `%${origin}%`);
      if (destination) query = query.ilike('destination', `%${destination}%`);
      if (operatorId) query = query.eq('operator_id', operatorId);

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      log('routes-service', 'list', { count: data?.length });
      return jsonResponse(data);
    }

    // POST: create a route
    if (req.method === 'POST') {
      const body = await req.json();
      const { operator_id, origin, destination, one_way_price, return_price } = body;
      if (!operator_id || !origin || !destination || !one_way_price || !return_price) {
        return errorResponse('Missing required fields');
      }
      const { data, error } = await supabase.from('routes').insert({
        operator_id, origin, destination, one_way_price, return_price,
      }).select().single();
      if (error) return errorResponse(error.message, 500);
      log('routes-service', 'create', { id: data.id });
      return jsonResponse(data, 201);
    }

    // PUT: update a route
    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;
      if (!id) return errorResponse('Missing route id');
      const { data, error } = await supabase.from('routes').update(updates).eq('id', id).select().single();
      if (error) return errorResponse(error.message, 500);
      log('routes-service', 'update', { id });
      return jsonResponse(data);
    }

    // DELETE: deactivate a route
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return errorResponse('Missing route id');
      const { error } = await supabase.from('routes').update({ status: 'inactive' }).eq('id', id);
      if (error) return errorResponse(error.message, 500);
      log('routes-service', 'deactivate', { id });
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('routes-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
