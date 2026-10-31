-- Keep existing payslips consistent with the server-owned company identity.
UPDATE payrolls
SET company_phone_snapshot = '6281324937038/+6285319094079'
WHERE company_phone_snapshot IS NULL OR BTRIM(company_phone_snapshot) <> '6281324937038/+6285319094079';
