-- Normalize the legacy SUPER_ADMIN role before the later Role enum
-- reconciliation removes that value. The current application treats
-- MAIN_OFFICER as the administrative role.
--
-- The enum value is not present in databases created from the current initial
-- migration, so the dynamic check keeps this migration safe on fresh databases
-- as well as databases provisioned from older schema versions.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'Role'
          AND pg_enum.enumlabel = 'SUPER_ADMIN'
    ) THEN
        EXECUTE 'UPDATE "User" SET "role" = ''MAIN_OFFICER'' WHERE "role" = ''SUPER_ADMIN''';
        EXECUTE 'UPDATE "Invitation" SET "role" = ''MAIN_OFFICER'' WHERE "role" = ''SUPER_ADMIN''';
        EXECUTE 'UPDATE "DashboardViewShare" SET "sharedWithRole" = ''MAIN_OFFICER'' WHERE "sharedWithRole" = ''SUPER_ADMIN''';
    END IF;
END $$;
