"use strict";

// Política común de consulta. Las decisiones de administración y respuesta siguen
// protegidas por las comprobaciones de servidor propias de cada aplicación.
const DASHBOARDS = Object.freeze(["forms","competencia","redmine","impacto_social"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/;
const normalized = value => String(value || "").trim().toLowerCase();

function validateGrant(grant) {
  const dashboard = normalized(grant?.dashboard);
  const kind = normalized(grant?.kind);
  const subject = normalized(grant?.subject);
  if (!DASHBOARDS.includes(dashboard)) throw new Error("INVALID_DASHBOARD");
  if (kind !== "email" && kind !== "domain") throw new Error("INVALID_KIND");
  if (!(kind === "email" ? EMAIL_RE : DOMAIN_RE).test(subject)) throw new Error("INVALID_SUBJECT");
  return {dashboard, kind, subject, enabled: grant.enabled === true};
}

function canReadDashboard(user, dashboard, grants) {
  const email = normalized(user?.email);
  const target = normalized(dashboard);
  if (!user?.emailVerified || !EMAIL_RE.test(email) || !DASHBOARDS.includes(target)) return false;
  if (!Array.isArray(grants)) return false;
  return grants.some(grant => {
    let rule;
    try { rule = validateGrant(grant); } catch (_) { return false; }
    if (!rule.enabled || rule.dashboard !== target) return false;
    return rule.kind === "email" ? email === rule.subject : email.slice(email.lastIndexOf("@")) === rule.subject;
  });
}

module.exports = {DASHBOARDS,validateGrant,canReadDashboard};
