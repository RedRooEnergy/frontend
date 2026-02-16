import type { SessionState } from "./store";

export type SupplierRole = SessionState["role"];

export type SupplierNavItem = {
  key: string;
  href: string;
  roles: SupplierRole[];
  readOnlyRoles?: SupplierRole[];
};

export type SupplierNavGroup = {
  key: string;
  items: SupplierNavItem[];
};

const SUPPLIER_NAV_GROUPS: SupplierNavGroup[] = [
  {
    key: "nav.group.overview",
    items: [{ key: "nav.dashboard", href: "/dashboard/supplier", roles: ["supplier", "admin"] }],
  },
  {
    key: "nav.group.profile",
    items: [
      { key: "nav.companyProfile", href: "/dashboard/supplier/profile", roles: ["supplier", "admin"] },
      { key: "nav.compliance", href: "/dashboard/supplier/compliance", roles: ["supplier", "admin"] },
      { key: "nav.accreditationWizard", href: "/dashboard/supplier/accreditation-wizard", roles: ["supplier", "admin"] },
      { key: "nav.compliancePartners", href: "/dashboard/supplier/compliance-partners", roles: ["supplier", "admin"] },
    ],
  },
  {
    key: "nav.group.orders",
    items: [
      {
        key: "nav.orders",
        href: "/dashboard/supplier/orders",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
      {
        key: "nav.commercial",
        href: "/dashboard/supplier/commercial",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
    ],
  },
  {
    key: "nav.group.shipping",
    items: [
      {
        key: "nav.shipping",
        href: "/dashboard/supplier/shipments",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["supplier", "regulator"],
      },
    ],
  },
  {
    key: "nav.group.finance",
    items: [
      {
        key: "nav.payments",
        href: "/dashboard/supplier/payments",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["supplier", "regulator"],
      },
      {
        key: "nav.returns",
        href: "/dashboard/supplier/returns-disputes",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
    ],
  },
  {
    key: "nav.group.listings",
    items: [
      { key: "nav.products", href: "/dashboard/supplier/products", roles: ["supplier", "admin"] },
      { key: "nav.promotions", href: "/dashboard/supplier/promotions", roles: ["supplier", "admin"] },
    ],
  },
  {
    key: "nav.group.documents",
    items: [
      {
        key: "nav.documents",
        href: "/dashboard/supplier/documents",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
    ],
  },
  {
    key: "nav.group.communication",
    items: [
      {
        key: "nav.messages",
        href: "/dashboard/supplier/messages",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
      {
        key: "nav.emails",
        href: "/dashboard/supplier/emails",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
      {
        key: "nav.wechat",
        href: "/dashboard/supplier/wechat",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
    ],
  },
  {
    key: "nav.group.insights",
    items: [{ key: "nav.analytics", href: "/dashboard/supplier/analytics", roles: ["supplier", "admin"] }],
  },
  {
    key: "nav.group.governance",
    items: [
      {
        key: "nav.risk",
        href: "/dashboard/supplier/risk-audit",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["supplier", "regulator"],
      },
    ],
  },
  {
    key: "nav.group.account",
    items: [
      { key: "nav.security", href: "/dashboard/supplier/security", roles: ["supplier", "admin"] },
      {
        key: "nav.legal",
        href: "/dashboard/supplier/legal",
        roles: ["supplier", "admin", "regulator"],
        readOnlyRoles: ["regulator"],
      },
      { key: "nav.support", href: "/dashboard/supplier/support", roles: ["supplier", "admin"] },
    ],
  },
];

export function getSupplierNavGroups(role: SupplierRole): SupplierNavGroup[] {
  return SUPPLIER_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

export function getSupplierRouteAccess(pathname: string, role: SupplierRole) {
  const match = SUPPLIER_NAV_GROUPS.flatMap((group) => group.items).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  if (!match && pathname.startsWith("/dashboard/supplier")) {
    return {
      allowed: role !== "regulator",
      readOnly: role === "regulator",
      item: null,
    };
  }
  if (!match) {
    return { allowed: true, readOnly: false, item: null };
  }
  return {
    allowed: match.roles.includes(role),
    readOnly: match.readOnlyRoles?.includes(role) ?? false,
    item: match,
  };
}

export function getSupplierRole(session: SessionState | null): SupplierRole {
  return session?.role ?? "supplier";
}
