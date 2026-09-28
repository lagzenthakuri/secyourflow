CREATE OR REPLACE FUNCTION secyourflow_enforce_asset_relationship_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_org_id TEXT;
  child_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO parent_org_id FROM "Asset" WHERE "id" = NEW."parentAssetId";
  SELECT "organizationId" INTO child_org_id FROM "Asset" WHERE "id" = NEW."childAssetId";

  IF parent_org_id IS NULL OR child_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parentAssetId/childAssetId for AssetRelationship';
  END IF;

  IF NEW."organizationId" <> parent_org_id OR NEW."organizationId" <> child_org_id THEN
    RAISE EXCEPTION 'AssetRelationship organization mismatch with parent/child assets';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_asset_relationship_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_asset_relationship_org_guard
    BEFORE INSERT OR UPDATE OF "organizationId", "parentAssetId", "childAssetId"
    ON "AssetRelationship"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_asset_relationship_org();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secyourflow_enforce_asset_group_member_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  group_org_id TEXT;
  asset_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO group_org_id FROM "AssetGroup" WHERE "id" = NEW."groupId";
  SELECT "organizationId" INTO asset_org_id FROM "Asset" WHERE "id" = NEW."assetId";

  IF group_org_id IS NULL OR asset_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid groupId/assetId for AssetGroupMember';
  END IF;

  IF group_org_id <> asset_org_id THEN
    RAISE EXCEPTION 'AssetGroupMember organization mismatch between group and asset';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_asset_group_member_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_asset_group_member_org_guard
    BEFORE INSERT OR UPDATE OF "groupId", "assetId"
    ON "AssetGroupMember"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_asset_group_member_org();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secyourflow_enforce_plan_vulnerability_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  plan_org_id TEXT;
  vulnerability_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO plan_org_id FROM "RemediationPlan" WHERE "id" = NEW."planId";
  SELECT "organizationId" INTO vulnerability_org_id FROM "Vulnerability" WHERE "id" = NEW."vulnerabilityId";

  IF plan_org_id IS NULL OR vulnerability_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid planId/vulnerabilityId for RemediationPlanVulnerability';
  END IF;

  IF plan_org_id <> vulnerability_org_id THEN
    RAISE EXCEPTION 'RemediationPlanVulnerability organization mismatch between plan and vulnerability';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_plan_vulnerability_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_plan_vulnerability_org_guard
    BEFORE INSERT OR UPDATE OF "planId", "vulnerabilityId"
    ON "RemediationPlanVulnerability"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_plan_vulnerability_org();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secyourflow_enforce_risk_register_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  asset_org_id TEXT;
  vulnerability_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO asset_org_id FROM "Asset" WHERE "id" = NEW."assetId";
  SELECT "organizationId" INTO vulnerability_org_id FROM "Vulnerability" WHERE "id" = NEW."vulnerabilityId";

  IF asset_org_id IS NULL OR vulnerability_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid assetId/vulnerabilityId for RiskRegister';
  END IF;

  IF NEW."organizationId" <> asset_org_id OR NEW."organizationId" <> vulnerability_org_id THEN
    RAISE EXCEPTION 'RiskRegister organization mismatch with linked asset/vulnerability';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_risk_register_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_risk_register_org_guard
    BEFORE INSERT OR UPDATE OF "organizationId", "assetId", "vulnerabilityId"
    ON "RiskRegister"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_risk_register_org();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secyourflow_enforce_remediation_evidence_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  vulnerability_org_id TEXT;
  plan_org_id TEXT;
BEGIN
  IF NEW."vulnerabilityId" IS NOT NULL THEN
    SELECT "organizationId" INTO vulnerability_org_id FROM "Vulnerability" WHERE "id" = NEW."vulnerabilityId";

    IF vulnerability_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid vulnerabilityId for RemediationEvidence';
    END IF;

    IF NEW."organizationId" <> vulnerability_org_id THEN
      RAISE EXCEPTION 'RemediationEvidence organization mismatch with vulnerability';
    END IF;
  END IF;

  IF NEW."planId" IS NOT NULL THEN
    SELECT "organizationId" INTO plan_org_id FROM "RemediationPlan" WHERE "id" = NEW."planId";

    IF plan_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid planId for RemediationEvidence';
    END IF;

    IF NEW."organizationId" <> plan_org_id THEN
      RAISE EXCEPTION 'RemediationEvidence organization mismatch with plan';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_remediation_evidence_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_remediation_evidence_org_guard
    BEFORE INSERT OR UPDATE OF "organizationId", "planId", "vulnerabilityId"
    ON "RemediationEvidence"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_remediation_evidence_org();
  END IF;
END;
$$;
