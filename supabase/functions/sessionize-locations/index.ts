import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sessionize Locations Edge Function
 * Converts raw location pings into sessions with dwell times
 * Runs periodically or on-demand to process recent visits
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const gapThresholdMinutes = body.gap_threshold_minutes || 10;

    console.log('Sessionizing locations for user:', user.id);

    // Call the database function to sessionize visits
    const { data: result, error: sessionError } = await supabase.rpc(
      'sessionize_recent_visits',
      {
        target_user_id: user.id,
        gap_threshold_minutes: gapThresholdMinutes,
      }
    );

    if (sessionError) {
      console.error('Error sessionizing:', sessionError);
      throw sessionError;
    }

    const sessionsCreated = result || 0;
    console.log(`Created ${sessionsCreated} sessions`);

    // Compute activity summaries for today
    if (sessionsCreated > 0) {
      const { error: summaryError } = await supabase.rpc('compute_activity_summary', {
        target_user_id: user.id,
      });

      if (summaryError) {
        console.error('Error computing summary:', summaryError);
      } else {
        console.log('Activity summaries updated');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions_created: sessionsCreated,
        message: `Created ${sessionsCreated} sessions and updated summaries`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sessionize-locations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
