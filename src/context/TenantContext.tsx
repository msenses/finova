import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBranchesByOrg, getOpenPeriods, getUserOrganizations, Organization, Branch, FiscalPeriod } from '../services/tenant';

type TenantContextValue = {
  organizations: Organization[];
  branches: Branch[];
  periods: FiscalPeriod[];
  activeOrgId: string | null;
  activeBranchId: string | null;
  activePeriodId: string | null;
  setActiveOrgId: (id: string | null) => void;
  setActiveBranchId: (id: string | null) => void;
  setActivePeriodId: (id: string | null) => void;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);

  // Load organizations on mount
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const orgs = await getUserOrganizations();
      if (cancelled) return;
      setOrganizations(orgs);
      if (!activeOrgId && orgs.length) {
        setActiveOrgId(orgs[0].id);
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  // Load branches when active org changes
  useEffect(() => {
    let cancelled = false;
    const loadBranches = async () => {
      if (!activeOrgId) {
        setBranches([]);
        setActiveBranchId(null);
        return;
      }
      const data = await getBranchesByOrg(activeOrgId);
      if (cancelled) return;
      setBranches(data);
      if (data.length) {
        if (!activeBranchId || !data.find(b => b.id === activeBranchId)) {
          setActiveBranchId(data[0].id);
        }
      } else {
        setActiveBranchId(null);
      }
    };
    void loadBranches();
    return () => { cancelled = true; };
  }, [activeOrgId]);

  // Load periods when org or branch changes
  useEffect(() => {
    let cancelled = false;
    const loadPeriods = async () => {
      if (!activeOrgId) {
        setPeriods([]);
        setActivePeriodId(null);
        return;
      }
      const data = await getOpenPeriods({ orgId: activeOrgId, branchId: activeBranchId ?? undefined });
      if (cancelled) return;
      setPeriods(data);
      if (data.length) {
        if (!activePeriodId || !data.find(p => p.id === activePeriodId)) {
          setActivePeriodId(data[0].id);
        }
      } else {
        setActivePeriodId(null);
      }
    };
    void loadPeriods();
    return () => { cancelled = true; };
  }, [activeOrgId, activeBranchId]);

  const value = useMemo<TenantContextValue>(() => ({
    organizations,
    branches,
    periods,
    activeOrgId,
    activeBranchId,
    activePeriodId,
    setActiveOrgId,
    setActiveBranchId,
    setActivePeriodId,
  }), [organizations, branches, periods, activeOrgId, activeBranchId, activePeriodId]);

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}


