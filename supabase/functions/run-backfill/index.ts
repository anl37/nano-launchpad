import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Run Backfill Edge Function
 * Executes backfill operations for sessions and patterns
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const lookbackHours = body.lookback_hours || 336; // 14 days default
    const gapThreshold = body.gap_threshold_minutes || 10;

    console.log(`Starting backfill: ${lookbackHours}h lookback, ${gapThreshold}min gap`);

    // Run sessionization
    const { data: sessionsResult, error: sessionsError } = await supabase.rpc(
      'sessionize_recent_visits',
      {
        target_user_id: null,
        gap_threshold_minutes: gapThreshold,
        lookback_hours: lookbackHours,
      }
    );

    if (sessionsError) {
      console.error('Sessionization error:', sessionsError);
      throw sessionsError;
    }

    const sessionsCreated = sessionsResult || 0;
    console.log(`✓ Created ${sessionsCreated} sessions`);

    // Update activity patterns from sessions
    const { data: patternsResult, error: patternsError } = await supabase.rpc(
      'update_activity_patterns_from_sessions',
      {
        target_user_id: null,
        lookback_days: Math.ceil(lookbackHours / 24),
      }
    );

    if (patternsError) {
      console.error('Patterns update error:', patternsError);
      throw patternsError;
    }

    const patternsUpdated = patternsResult || 0;
    console.log(`✓ Updated ${patternsUpdated} patterns`);

    // Get counts for verification
    const { count: visitCount } = await supabase
      .from('location_visits')
      .select('*', { count: 'exact', head: true });

    const { count: sessionCount } = await supabase
      .from('location_sessions')
      .select('*', { count: 'exact', head: true });

    const { count: patternCount } = await supabase
      .from('activity_patterns')
      .select('*', { count: 'exact', head: true });

    return new Response(
      JSON.stringify({
        success: true,
        sessions_created: sessionsCreated,
        patterns_updated: patternsUpdated,
        current_counts: {
          visits: visitCount,
          sessions: sessionCount,
          patterns: patternCount,
        },
        message: `Backfill complete: ${sessionsCreated} sessions, ${patternsUpdated} patterns`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Backfill error:', error);
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
