-- Optional goal weight, used to draw the goal line on the weight chart
-- (MVP §8.3). Null means no goal set.

alter table public.profiles
  add column if not exists goal_weight_kg numeric(5, 2)
    check (goal_weight_kg is null or (goal_weight_kg > 0 and goal_weight_kg < 500));
