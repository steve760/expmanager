// Invite a new user (SuperAdmin only). Creates auth user + profile, optionally adds to organisation_members.
// Deploy: supabase functions deploy invite-user --no-verify-jwt
// Call from app with Authorization: Bearer <user JWT> and body: { email, full_name?, organisation_id?, role? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: userError,
    } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', caller.id)
      .single();
    if (!profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: SuperAdmin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const email = body?.email?.trim();
    const fullName = body?.full_name?.trim() ?? null;
    const organisationId = body?.organisation_id?.trim() || null;
    const role = body?.role && ['admin', 'member', 'client_user'].includes(body.role) ? body.role : null;

    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: inviteData,
      error: inviteError,
    } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });

    if (inviteError) {
      if (inviteError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'User already exists. Add them to a client from the Admin users table.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: inviteError.message ?? 'Invite failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = inviteData?.user?.id;
    if (newUserId) {
      await supabaseAdmin.from('profiles').upsert(
        { id: newUserId, email, full_name: fullName, is_super_admin: false },
        { onConflict: 'id' }
      );
      if (organisationId && role) {
        await supabaseAdmin.from('organisation_members').insert({
          user_id: newUserId,
          organisation_id: organisationId,
          role,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: newUserId, message: 'Invitation sent to ' + email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
