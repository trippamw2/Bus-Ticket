import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getSupabaseAdmin();
  const action = url.searchParams.get('action');

  try {
    // GET: dashboard stats or platform settings
    if (req.method === 'GET') {
      if (action === 'stats') {
        const [operators, bookings, payments, trips] = await Promise.all([
          supabase.from('operators').select('id', { count: 'exact' }),
          supabase.from('bookings').select('id, amount, status', { count: 'exact' }),
          supabase.from('payments').select('id, amount, status').eq('status', 'success'),
          supabase.from('trips').select('id', { count: 'exact' }),
        ]);

        const totalRevenue = payments.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
        const paidBookings = bookings.data?.filter(b => b.status === 'paid') || [];

        return jsonResponse({
          total_operators: operators.count || 0,
          total_bookings: bookings.count || 0,
          total_trips: trips.count || 0,
          total_revenue: totalRevenue,
          paid_bookings: paidBookings.length,
        });
      }

      if (action === 'settings') {
        const { data, error } = await supabase.from('platform_settings').select('*').limit(1).single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse(data);
      }

      // Default: list operators with status filter
      const status = url.searchParams.get('status');
      let query = supabase.from('operators').select('*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // PUT: update platform settings or operator status/commission
    if (req.method === 'PUT') {
      const body = await req.json();

      if (action === 'settings') {
        const { id, ...updates } = body;
        if (!id) return errorResponse('Missing settings id');
        const { data, error } = await supabase.from('platform_settings').update(updates).eq('id', id).select().single();
        if (error) return errorResponse(error.message, 500);
        log('admin-service', 'update-settings', updates);
        return jsonResponse(data);
      }

      if (action === 'operator') {
        const { id, status, commission_percent } = body;
        if (!id) return errorResponse('Missing operator id');
        const updates: Record<string, unknown> = {};
        if (status) updates.status = status;
        if (commission_percent !== undefined) updates.commission_percent = commission_percent;
        const { data, error } = await supabase.from('operators').update(updates).eq('id', id).select().single();
        if (error) return errorResponse(error.message, 500);
        log('admin-service', 'update-operator', { id, ...updates });
        return jsonResponse(data);
      }

      return errorResponse('Missing action parameter');
    }

    // POST: initialize platform settings
    if (req.method === 'POST' && action === 'init-settings') {
      const { data, error } = await supabase.from('platform_settings').insert({}).select().single();
      if (error) return errorResponse(error.message, 500);
      log('admin-service', 'init-settings', { id: data.id });
      return jsonResponse(data, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('admin-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
