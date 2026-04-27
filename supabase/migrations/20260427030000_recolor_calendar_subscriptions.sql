-- One-time recolor: existing calendar_subscriptions all converged on similar
-- pastel colors from Google. Replace with a curated vibrant palette indexed
-- by hash of the calendar's external_id. Deterministic and idempotent.
-- (Intentionally clobbers existing colors — sidebar feature is new and users
-- haven't yet had time to customize.)
update calendar_subscriptions
   set color = (array[
     '#ef4444','#f97316','#eab308','#84cc16','#22c55e','#10b981',
     '#14b8a6','#06b6d4','#3b82f6','#8b5cf6','#d946ef','#ec4899'
   ])[1 + (abs(hashtext(external_id)) % 12)]
 where external_provider = 'google';
