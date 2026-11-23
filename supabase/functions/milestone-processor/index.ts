import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

/**
 * Calculates calendar day streak (consecutive workout days) from a list of workout timestamps.
 */
function calculateStreakDays(timestamps: string[]): number {
  if (!timestamps.length) return 0;

  // Normalize all timestamps to YYYY-MM-DD calendar date strings
  const dateSet = new Set<string>();
  for (const ts of timestamps) {
    if (!ts) continue;
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        dateSet.add(d.toISOString().slice(0, 10));
      }
    } catch {
      // Ignore invalid date
    }
  }

  const sortedDates = Array.from(dateSet).sort().reverse();
  if (!sortedDates.length) return 0;

  let streak = 0;
  // Start from the most recent workout date
  let curr = new Date(sortedDates[0]);

  while (true) {
    const dateStr = curr.toISOString().slice(0, 10);
    if (dateSet.has(dateStr)) {
      streak++;
      // Move to previous day
      curr.setDate(curr.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    const { table, record, type } = payload;

    if (type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: `Ignored event type: ${type}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const awardedBadges: string[] = [];

    // =========================================================================
    // 1. WORKOUT INSERT: STREAK EVALUATION
    // =========================================================================
    if (table === "workouts") {
      const userId = record.user_id;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing user_id on workout record" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch user's completed or started workouts to calculate streak
      const { data: workouts, error: workoutErr } = await supabase
        .from("workouts")
        .select("started_at, completed_at, created_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      if (workoutErr) {
        console.error("Failed to query user workouts:", workoutErr);
      } else if (workouts && workouts.length > 0) {
        const timestamps = workouts.map(
          (w) => w.completed_at || w.started_at || w.created_at
        );
        const streakDays = calculateStreakDays(timestamps);

        console.log(`User ${userId} current streak: ${streakDays} consecutive days`);

        // Check for 30-Day Streak Milestone
        if (streakDays >= 30) {
          const { data: badge30 } = await supabase
            .from("badges")
            .select("id")
            .eq("slug", "30-day-streak")
            .maybeSingle();

          if (badge30?.id) {
            const { error: insertErr } = await supabase.from("user_badges").upsert(
              {
                user_id: userId,
                badge_id: badge30.id,
                metadata: {
                  streak_days: streakDays,
                  achieved_at: new Date().toISOString(),
                },
              },
              { onConflict: "user_id, badge_id" }
            );

            if (!insertErr) {
              awardedBadges.push("30-Day Streak");
            }
          }
        }

        // Also award 7-Day Warrior if streak >= 7
        if (streakDays >= 7) {
          const { data: badge7 } = await supabase
            .from("badges")
            .select("id")
            .eq("slug", "7-day-streak")
            .maybeSingle();

          if (badge7?.id) {
            await supabase.from("user_badges").upsert(
              {
                user_id: userId,
                badge_id: badge7.id,
                metadata: {
                  streak_days: streakDays,
                  achieved_at: new Date().toISOString(),
                },
              },
              { onConflict: "user_id, badge_id" }
            );
            awardedBadges.push("7-Day Warrior");
          }
        }

        // Award First Step if this is their first workout
        if (workouts.length === 1) {
          const { data: badgeFirst } = await supabase
            .from("badges")
            .select("id")
            .eq("slug", "first-workout")
            .maybeSingle();

          if (badgeFirst?.id) {
            await supabase.from("user_badges").upsert(
              {
                user_id: userId,
                badge_id: badgeFirst.id,
                metadata: { first_workout_id: record.id },
              },
              { onConflict: "user_id, badge_id" }
            );
            awardedBadges.push("First Step");
          }
        }
      }
    }

    // =========================================================================
    // 2. SET INSERT: PR & 100KG DEADLIFT MILESTONE EVALUATION
    // =========================================================================
    if (table === "sets" || table === "workout_sets") {
      const weight = Number(record.weight) || 0;
      const reps = Number(record.reps) || 0;
      const workoutExerciseId = record.workout_exercise_id;
      let userId = record.user_id;
      let exerciseId = record.exercise_id;
      let exerciseName = "";

      // Resolve exercise_id, exercise_name and user_id if needed
      if (workoutExerciseId) {
        const { data: weData } = await supabase
          .from("workout_exercises")
          .select("exercise_id, workout_id, exercises (id, name), workouts (user_id)")
          .eq("id", workoutExerciseId)
          .maybeSingle();

        if (weData) {
          exerciseId = exerciseId || weData.exercise_id;
          exerciseName = weData.exercises?.name || "";
          userId = userId || weData.workouts?.user_id;
        }
      }

      // If exerciseName is still empty, look up exercises table
      if (exerciseId && !exerciseName) {
        const { data: exData } = await supabase
          .from("exercises")
          .select("name")
          .eq("id", exerciseId)
          .maybeSingle();
        if (exData) {
          exerciseName = exData.name;
        }
      }

      if (userId && exerciseId && weight > 0) {
        // Query historical sets for this user on this exercise (excluding current set)
        // Check workout_sets first
        const { data: histSets } = await supabase
          .from("workout_sets")
          .select("weight, reps, id, workout_exercises!inner(exercise_id, workout_id, workouts!inner(user_id))")
          .eq("workout_exercises.exercise_id", exerciseId)
          .eq("workout_exercises.workouts.user_id", userId)
          .neq("id", record.id);

        let previousMaxWeight = 0;
        if (histSets && histSets.length > 0) {
          for (const s of histSets) {
            const w = Number(s.weight) || 0;
            if (w > previousMaxWeight) {
              previousMaxWeight = w;
            }
          }
        }

        // Logic 1: New PR Check (Weight higher than previous max)
        if (weight > previousMaxWeight && previousMaxWeight > 0) {
          const { data: prBadge } = await supabase
            .from("badges")
            .select("id")
            .eq("slug", "new-pr")
            .maybeSingle();

          if (prBadge?.id) {
            await supabase.from("user_badges").upsert(
              {
                user_id: userId,
                badge_id: prBadge.id,
                metadata: {
                  exercise_id: exerciseId,
                  exercise_name: exerciseName,
                  weight,
                  reps,
                  previous_max: previousMaxWeight,
                  achieved_at: new Date().toISOString(),
                },
              },
              { onConflict: "user_id, badge_id" }
            );
            awardedBadges.push(`New PR (${exerciseName}: ${weight}kg)`);
          }
        }

        // Logic 2: Deadlift 100kg Club Check
        const isDeadlift = exerciseName.toLowerCase().includes("deadlift");
        if (isDeadlift && weight >= 100) {
          const { data: clubBadge } = await supabase
            .from("badges")
            .select("id")
            .eq("slug", "100kg-club")
            .maybeSingle();

          if (clubBadge?.id) {
            const { error: clubErr } = await supabase.from("user_badges").upsert(
              {
                user_id: userId,
                badge_id: clubBadge.id,
                metadata: {
                  exercise_id: exerciseId,
                  exercise_name: exerciseName,
                  weight,
                  reps,
                  achieved_at: new Date().toISOString(),
                },
              },
              { onConflict: "user_id, badge_id" }
            );

            if (!clubErr) {
              awardedBadges.push("100kg Club");
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_table: table,
        awarded_badges: awardedBadges,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Milestone processor error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
