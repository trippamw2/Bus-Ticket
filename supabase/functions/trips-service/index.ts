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
  if (rateLimit(`trips:${ip}`)) return errorResponse('Rate limit exceeded', 429);

  try {
    if (req.method === 'GET') {
      const routeId = url.searchParams.get('route_id');
      const date = url.searchParams.get('date');

      let query = supabase.from('trips')
        .select('*, routes(origin, destination, one_way_price, return_price), buses(plate_number, capacity)')
        .eq('status', 'active');
      if (routeId) query = query.eq('route_id', routeId);
      if (date) query = query.eq('travel_date', date);

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      log('trips-service', 'list', { count: data?.length });
      return jsonResponse(data);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { route_id, bus_id, travel_date, total_seats } = body;
      if (!route_id || !bus_id || !travel_date || !total_seats) {
        return errorResponse('Missing required fields');
      }
      const { data, error } = await supabase.from('trips').insert({
        route_id, bus_id, travel_date, total_seats, available_seats: total_seats,
      }).select().single();
      if (error) return errorResponse(error.message, 500);
      log('trips-service', 'create', { id: data.id });
      return jsonResponse(data, 201);
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;
      if (!id) return errorResponse('Missing trip id');
      const { data, error } = await supabase.from('trips').update(updates).eq('id', id).select().single();
      if (error) return errorResponse(error.message, 500);
      log('trips-service', 'update', { id });
      return jsonResponse(data);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('trips-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
