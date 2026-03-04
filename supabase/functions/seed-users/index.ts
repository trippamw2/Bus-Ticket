import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { log } from '../_shared/logger.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const supabase = getSupabaseAdmin();

  try {
    const body = await req.json();
    const { email, password, role, name, phone, company_name } = body;

    if (!email || !password || !role) return errorResponse('Missing email, password, or role');

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) return errorResponse(authError.message, 500);

    const userId = authData.user.id;

    if (role === 'operator') {
      // Create operator record with same ID as auth user
      const { error: opError } = await supabase.from('operators').insert({
        id: userId,
        name: name || email,
        phone: phone || '',
        company_name: company_name || name || email,
        status: 'approved',
      });
      if (opError) {
        log('seed-users', 'operator-insert-error', { error: opError.message });
        return errorResponse(opError.message, 500);
      }
    }

    if (role === 'admin') {
      // Create admin_users record
      const { error: adminError } = await supabase.from('admin_users').insert({
        auth_user_id: userId,
        email,
        display_name: name || 'Admin',
        role_id: 'super_admin',
        permissions: {},
        is_active: true,
      });
      if (adminError) {
        log('seed-users', 'admin-insert-error', { error: adminError.message });
        return errorResponse(adminError.message, 500);
      }
    }

    log('seed-users', 'created', { email, role, userId });
    return jsonResponse({ success: true, userId, email, role }, 201);
  } catch (e) {
    log('seed-users', 'error', { message: String(e) });
    return errorResponse('Internal server error', 500);
  }
});
