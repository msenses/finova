import { supabase } from '../lib/supabaseClient';

export type Organization = { id: string; name: string };
export type Branch = { id: string; code: string; name: string; org_id: string; active: boolean };
export type FiscalPeriod = {
  id: string;
  code: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  org_id: string;
  branch_id: string | null;
  is_open: boolean;
};

export async function getUserOrganizations(): Promise<Organization[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user?.id) return [];
  const { data: memberships, error: memErr } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id);
  if (memErr || !memberships?.length) return [];
  const orgIds = memberships.map((m: any) => m.org_id).filter(Boolean);
  if (!orgIds.length) return [];
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', orgIds);
  return (orgs as Organization[]) ?? [];
}

export async function getBranchesByOrg(orgId: string): Promise<Branch[]> {
  if (!orgId) return [];
  const { data } = await supabase
    .from('branches')
    .select('id, code, name, org_id, active')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('code', { ascending: true });
  return (data as Branch[]) ?? [];
}

export async function getOpenPeriods(params: { orgId: string; branchId?: string | null }): Promise<FiscalPeriod[]> {
  const { orgId, branchId } = params;
  if (!orgId) return [];
  let query = supabase
    .from('fiscal_periods')
    .select('id, code, start_date, end_date, org_id, branch_id, is_open')
    .eq('org_id', orgId)
    .eq('is_open', true)
    .order('start_date', { ascending: false });
  if (branchId) query = query.eq('branch_id', branchId);
  const { data } = await query;
  return (data as FiscalPeriod[]) ?? [];
}


