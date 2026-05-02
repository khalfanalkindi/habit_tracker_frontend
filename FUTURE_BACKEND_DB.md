# Planned backend / database work (not implemented yet)

Frontend currently stores profile, weight history, and calorie targets in **localStorage**. When you approve integration, align the API and MySQL schema roughly as follows.

## 1. User profile (height, targets, goal)

Store per `user_id`:

| Field | Type | Notes |
|--------|------|--------|
| `height_m` | `DECIMAL(4,2)` | Meters |
| `daily_calories_target` | `INT UNSIGNED` | Nullable until user sets |
| `weight_goal_kg` | `DECIMAL(5,1)` | Optional target weight |

Options: new table `user_profiles` (`user_id` PK FK → `users`) or columns on `users`. BMI can stay **computed** in app: `weight_kg / (height_m ** 2)` — no DB column required unless you want to cache it.

## 2. Weight history

New table `weight_entries` (or `user_weight_history`):

| Column | Type | Notes |
|--------|------|--------|
| `id` | `CHAR(36)` | UUID |
| `user_id` | `CHAR(36)` | FK → `users` |
| `logged_date` | `DATE` | Calendar day (same as frontend `YYYY-MM-DD`) |
| `weight_kg` | `DECIMAL(5,2)` | |
| `created_at` | `DATETIME` | Server time when row inserted = “sysdate” semantics |

Unique constraint optional: `(user_id, logged_date)` if at most one official weigh-in per day.

## 3. “Current weight”

Either latest row from `weight_entries` per user, or keep a denormalized `users.current_weight_kg` updated on each insert.

## 4. Calories over target

No extra table required for the alert itself. Optional: `daily_calorie_summary` or events table if you want history of over/under days.

## 5. API sketch (later)

- `GET/PATCH /me/profile` — height, daily_calories_target, weight_goal_kg  
- `GET/POST /me/weight` — list history; append entry (body: `weight_kg`, optional `logged_date`)  
- Dashboard aggregates can stay client-side or move to `GET /me/dashboard-summary`

Keep CORS and auth in mind when the frontend switches from `localStorage` to these endpoints.
