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
  if (rateLimit(`vendors:${ip}`)) return errorResponse('Rate limit exceeded', 429);

  try {
    // GET: list operators or get one with their buses and routes
    if (req.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        const [operator, buses, routes] = await Promise.all([
          supabase.from('operators').select('*').eq('id', id).single(),
          supabase.from('buses').select('*').eq('operator_id', id),
          supabase.from('routes').select('*').eq('operator_id', id),
        ]);
        if (operator.error) return errorResponse('Operator not found', 404);
        return jsonResponse({ ...operator.data, buses: buses.data, routes: routes.data });
      }

      const { data, error } = await supabase.from('operators').select('*');
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // POST: register operator (B2B onboarding)
    if (req.method === 'POST') {
      const body = await req.json();
      // B2B fields
      const { 
        name,  // contact person name
        phone,  // required for notifications
        company_name,
        company_address,
        company_reg_number,
        contact_email,
        contact_person
      } = body;
      
      if (!name || !phone) return errorResponse('Missing required fields: name and phone are required');
      
      const { data, error } = await supabase.from('operators').insert({
        name,
        phone,
        company_name: company_name || name,  // fallback to name if no company name
        company_address,
        company_reg_number,
        contact_email,
        contact_person: contact_person || name,  // fallback
      }).select().single();
      
      if (error) return errorResponse(error.message, 500);
      log('vendors-service', 'register-b2b', { id: data.id, company_name: data.company_name });
      return jsonResponse(data, 201);
    }

    // PUT: update operator or manage buses
    if (req.method === 'PUT') {
      const body = await req.json();
      const { entity } = body; // 'operator' or 'bus'

      if (entity === 'bus') {
        const { id, ...updates } = body;
        if (!id) return errorResponse('Missing bus id');
        const { data, error } = await supabase.from('buses').update(updates).eq('id', id).select().single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse(data);
      }

      // Default: update operator
      const { id, ...updates } = body;
      if (!id) return errorResponse('Missing operator id');
      const { data, error } = await supabase.from('operators').update(updates).eq('id', id).select().single();
      if (error) return errorResponse(error.message, 500);
      log('vendors-service', 'update', { id });
      return jsonResponse(data);
    }

    // POST bus (via action param)
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { operator_id, plate_number, capacity } = body;
      if (!operator_id || !plate_number || !capacity) return errorResponse('Missing bus fields');
      const { data, error } = await supabase.from('buses').insert({ operator_id, plate_number, capacity }).select().single();
      if (error) return errorResponse(error.message, 500);
      log('vendors-service', 'add-bus', { id: data.id });
      return jsonResponse(data, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    log('vendors-service', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
