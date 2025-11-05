import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompatibilityRequest {
  targetUserId: string;
}

interface ActivityPattern {
  place_type: string;
  time_of_day: string;
  day_type: string;
  frequency_score: number;
}

// Calculate interest similarity (0-1 scale)
function calculateInterestScore(userInterests: string[], targetInterests: string[]): number {
  if (!userInterests || !targetInterests || userInterests.length === 0 || targetInterests.length === 0) {
    return 0;
  }
  
  const commonInterests = userInterests.filter(i => targetInterests.includes(i));
  // Normalize by the expected 3 interests
  return Math.min(commonInterests.length / 3, 1);
}

// Calculate behavioral similarity based on activity patterns (0-1 scale)
function calculateBehaviorScore(userPatterns: ActivityPattern[], targetPatterns: ActivityPattern[]): number {
  if (!userPatterns || !targetPatterns || userPatterns.length === 0 || targetPatterns.length === 0) {
    return 0;
  }

  let totalSimilarity = 0;
  let comparisonCount = 0;

  // Create maps for quick lookup
  const targetMap = new Map<string, number>();
  targetPatterns.forEach(p => {
    const key = `${p.place_type}_${p.time_of_day}_${p.day_type}`;
    targetMap.set(key, p.frequency_score);
  });

  // Compare overlapping patterns
  userPatterns.forEach(userPattern => {
    const key = `${userPattern.place_type}_${userPattern.time_of_day}_${userPattern.day_type}`;
    const targetScore = targetMap.get(key);
    
    if (targetScore !== undefined) {
      // Both users have this pattern - calculate similarity
      const diff = Math.abs(userPattern.frequency_score - targetScore);
      const similarity = 1 - diff; // Higher score when frequencies are similar
      totalSimilarity += similarity;
      comparisonCount++;
    }
  });

  return comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
}

// Calculate feedback score based on past meetup ratings (0-1 scale)
async function calculateFeedbackScore(
  supabase: any,
  userId: string,
  targetUserId: string
): Promise<number> {
  // Get all matches between these two users
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .or(`uid_a.eq.${userId},uid_b.eq.${userId}`)
    .or(`uid_a.eq.${targetUserId},uid_b.eq.${targetUserId}`);

  if (!matches || matches.length === 0) {
    return 0.5; // Neutral score if no history
  }

  const matchIds = matches.map((m: any) => m.id);

  // Get feedback from both users
  const { data: feedback } = await supabase
    .from('meetup_feedback')
    .select('rating')
    .in('match_id', matchIds);

  if (!feedback || feedback.length === 0) {
    return 0.5; // Neutral if no feedback
  }

  // Average rating normalized to 0-1 (assuming ratings are 1-5)
  const avgRating = feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / feedback.length;
  return (avgRating - 1) / 4; // Normalize 1-5 to 0-1
}

// Adaptive weight calculation based on data availability
function adaptWeights(
  baseWeights: { interest: number; behavior: number; feedback: number },
  dataPoints: number
): { interest: number; behavior: number; feedback: number } {
  // Start with high interest weight, gradually shift to behavior/feedback
  // dataPoints represents number of location visits + feedback entries
  
  if (dataPoints < 10) {
    // Very early stage - rely heavily on interests
    return { interest: 0.8, behavior: 0.15, feedback: 0.05 };
  } else if (dataPoints < 50) {
    // Early stage - start incorporating behavior
    return { interest: 0.6, behavior: 0.3, feedback: 0.1 };
  } else if (dataPoints < 100) {
    // Mid stage - balanced
    return { interest: 0.4, behavior: 0.4, feedback: 0.2 };
  } else {
    // Mature stage - rely more on behavior and feedback
    return { interest: 0.3, behavior: 0.4, feedback: 0.3 };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Get user from JWT
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

    const { targetUserId }: CompatibilityRequest = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing targetUserId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calculating compatibility:', { userId: user.id, targetUserId });

    // Get both profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, interests')
      .in('id', [user.id, targetUserId]);

    if (!profiles || profiles.length !== 2) {
      return new Response(JSON.stringify({ error: 'Profiles not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userProfile = profiles.find((p: any) => p.id === user.id);
    const targetProfile = profiles.find((p: any) => p.id === targetUserId);

    // Get activity patterns for both users
    const { data: userPatterns } = await supabase
      .from('activity_patterns')
      .select('*')
      .eq('user_id', user.id);

    const { data: targetPatterns } = await supabase
      .from('activity_patterns')
      .select('*')
      .eq('user_id', targetUserId);

    // Get or create compatibility weights for user
    let { data: weights } = await supabase
      .from('compatibility_weights')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!weights) {
      // Initialize weights if they don't exist
      const { data: newWeights } = await supabase
        .from('compatibility_weights')
        .insert({ user_id: user.id })
        .select()
        .single();
      weights = newWeights;
    }

    // Calculate individual scores
    const interestScore = calculateInterestScore(
      userProfile?.interests || [],
      targetProfile?.interests || []
    );

    const behaviorScore = calculateBehaviorScore(
      userPatterns || [],
      targetPatterns || []
    );

    const feedbackScore = await calculateFeedbackScore(supabase, user.id, targetUserId);

    // Get data points count for adaptive weighting
    const dataPointsCount = (userPatterns?.length || 0) + (weights?.data_points_count || 0);

    // Calculate adaptive weights
    const adaptiveWeights = adaptWeights(
      {
        interest: weights?.interest_weight || 0.7,
        behavior: weights?.behavior_weight || 0.2,
        feedback: weights?.feedback_weight || 0.1,
      },
      dataPointsCount
    );

    // Calculate final weighted score (0-100)
    const finalScore = Math.round(
      (interestScore * adaptiveWeights.interest +
        behaviorScore * adaptiveWeights.behavior +
        feedbackScore * adaptiveWeights.feedback) *
        100
    );

    // Update weights in database
    await supabase
      .from('compatibility_weights')
      .update({
        interest_weight: adaptiveWeights.interest,
        behavior_weight: adaptiveWeights.behavior,
        feedback_weight: adaptiveWeights.feedback,
        data_points_count: dataPointsCount,
      })
      .eq('user_id', user.id);

    console.log('Compatibility calculated:', {
      finalScore,
      breakdown: {
        interest: Math.round(interestScore * 100),
        behavior: Math.round(behaviorScore * 100),
        feedback: Math.round(feedbackScore * 100),
      },
      weights: adaptiveWeights,
      dataPoints: dataPointsCount,
    });

    return new Response(
      JSON.stringify({
        targetUserId,
        score: finalScore,
        breakdown: {
          interestScore: Math.round(interestScore * 100),
          behaviorScore: Math.round(behaviorScore * 100),
          feedbackScore: Math.round(feedbackScore * 100),
        },
        weights: adaptiveWeights,
        dataPoints: dataPointsCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in calculate-compatibility:', error);
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
