-- === CARS THEME MIGRATION ===
-- Run this in Supabase SQL Editor for project: miflbztkdctpibawermj
-- This migration is idempotent (safe to re-run)

-- === CAR TIERS & LEVELS ===
create table if not exists car_tiers (
  tier_key text primary key,         -- beater … godspeed
  display  text not null,
  hp_base  numeric not null,         -- was FP
  fuel     integer not null,         -- was AM
  grip_pct numeric not null          -- was CE%
);

insert into car_tiers (tier_key, display, hp_base, fuel, grip_pct) values
  ('beater','Beater',4,2,2.0),
  ('street','Street',12,4,3.0),
  ('sport','Sport',36,8,4.5),
  ('supercar','Supercar',108,16,6.75),
  ('hypercar','Hypercar',324,32,10.125),
  ('prototype','Prototype',972,64,15.1875),
  ('godspeed','Godspeed',2916,128,22.78125)
on conflict (tier_key) do update
set display=excluded.display, hp_base=excluded.hp_base, fuel=excluded.fuel, grip_pct=excluded.grip_pct;

create table if not exists car_level_multipliers (
  level int primary key check (level between 1 and 3),
  mult  numeric not null
);

insert into car_level_multipliers(level, mult) values
  (1, 1.00), (2, 1.15), (3, 1.30)
on conflict (level) do update set mult=excluded.mult;

-- === PLAYER UNITS: add car fields ===
alter table if exists player_units
  add column if not exists tier_key text references car_tiers(tier_key),
  add column if not exists level int default 1 check (level between 1 and 3),
  add column if not exists hp_base numeric,
  add column if not exists grip_pct numeric,
  add column if not exists fuel int;

-- Backfill mapping (old rarity/unit_type → new tier_key stats)
update player_units u
set tier_key = coalesce(u.tier_key, 
  case u.unit_type
    when 'common'      then 'beater'
    when 'uncommon'    then 'street'
    when 'rare'        then 'sport'
    when 'ultra_rare'  then 'supercar'
    when 'epic'        then 'hypercar'
    when 'legendary'   then 'prototype'
    when 'mythic'      then 'godspeed'
    else 'beater'
  end),
    level   = coalesce(u.level, 1),
    hp_base = (select ct.hp_base from car_tiers ct where ct.tier_key =
               coalesce(u.tier_key, 
                 case u.unit_type
                   when 'common'      then 'beater'
                   when 'uncommon'    then 'street'
                   when 'rare'        then 'sport'
                   when 'ultra_rare'  then 'supercar'
                   when 'epic'        then 'hypercar'
                   when 'legendary'   then 'prototype'
                   when 'mythic'      then 'godspeed'
                   else 'beater' end)),
    grip_pct = (select ct.grip_pct from car_tiers ct where ct.tier_key =
               coalesce(u.tier_key, 
                 case u.unit_type
                   when 'common'      then 'beater'
                   when 'uncommon'    then 'street'
                   when 'rare'        then 'sport'
                   when 'ultra_rare'  then 'supercar'
                   when 'epic'        then 'hypercar'
                   when 'legendary'   then 'prototype'
                   when 'mythic'      then 'godspeed'
                   else 'beater' end)),
    fuel    = (select ct.fuel from car_tiers ct where ct.tier_key =
               coalesce(u.tier_key, 
                 case u.unit_type
                   when 'common'      then 'beater'
                   when 'uncommon'    then 'street'
                   when 'rare'        then 'sport'
                   when 'ultra_rare'  then 'supercar'
                   when 'epic'        then 'hypercar'
                   when 'legendary'   then 'prototype'
                   when 'mythic'      then 'godspeed'
                   else 'beater' end))
where tier_key is null or hp_base is null;

-- === VERIFICATION ===
-- Run these to verify migration success:
-- select * from car_tiers order by hp_base;
-- select * from car_level_multipliers order by level;
-- select id, tier_key, level, hp_base, grip_pct, fuel from player_units limit 10;


