-- Fix R16 kickoff times (match_numbers 73-88)
-- Based on official FIFA 2026 schedule. All times in UTC (CEST = UTC+2).

UPDATE matches SET kickoff = '2026-06-29 20:30:00+00' WHERE match_number = 73; -- GER vs PAR
UPDATE matches SET kickoff = '2026-06-30 21:00:00+00' WHERE match_number = 74; -- FRA vs SWE
UPDATE matches SET kickoff = '2026-06-28 19:00:00+00' WHERE match_number = 75; -- RSA vs CAN
UPDATE matches SET kickoff = '2026-06-30 01:00:00+00' WHERE match_number = 76; -- NED vs MAR
UPDATE matches SET kickoff = '2026-07-02 23:00:00+00' WHERE match_number = 77; -- POR vs CRO
UPDATE matches SET kickoff = '2026-07-02 19:00:00+00' WHERE match_number = 78; -- ESP vs AUT
UPDATE matches SET kickoff = '2026-07-02 00:00:00+00' WHERE match_number = 79; -- USA vs BIH
UPDATE matches SET kickoff = '2026-07-01 20:00:00+00' WHERE match_number = 80; -- BEL vs SEN
UPDATE matches SET kickoff = '2026-06-29 17:00:00+00' WHERE match_number = 81; -- BRA vs JPN
UPDATE matches SET kickoff = '2026-06-30 17:00:00+00' WHERE match_number = 82; -- CIV vs NOR
UPDATE matches SET kickoff = '2026-07-01 01:00:00+00' WHERE match_number = 83; -- MEX vs ECU
UPDATE matches SET kickoff = '2026-07-01 16:00:00+00' WHERE match_number = 84; -- ENG vs COD
UPDATE matches SET kickoff = '2026-07-03 22:00:00+00' WHERE match_number = 85; -- ARG vs CPV
UPDATE matches SET kickoff = '2026-07-03 18:00:00+00' WHERE match_number = 86; -- AUS vs EGY
UPDATE matches SET kickoff = '2026-07-03 03:00:00+00' WHERE match_number = 87; -- SUI vs ALG
UPDATE matches SET kickoff = '2026-07-04 01:30:00+00' WHERE match_number = 88; -- COL vs GHA
