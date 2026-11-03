BEGIN;

-- Update existing assistant branding without replacing customized content.
UPDATE vuihoc."CAU_HINH_TRO_LY"
SET loichaomung = regexp_replace(loichaomung, '(VUIHOC)[[:space:]]+TUTOR\M', '\1', 'gi'),
    chidanhethong = regexp_replace(chidanhethong, '(VUIHOC)[[:space:]]+TUTOR\M', '\1', 'gi')
WHERE loichaomung ~* 'VUIHOC[[:space:]]+TUTOR\M'
   OR chidanhethong ~* 'VUIHOC[[:space:]]+TUTOR\M';

COMMIT;
