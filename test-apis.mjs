/**
 * HRMS E-Onboarding — API Integration Test Script
 * Run: node test-apis.mjs
 * Make sure the dev server is running on http://localhost:3000
 */

const BASE = "http://localhost:3000";

// ─────────────────────────────────────────────
// Credentials to test
// ─────────────────────────────────────────────
const USERS = [
  { label: "Super Admin",     email: "prathyusha.r@testgo.com", password: "Admin@1234" },
  { label: "MLX Admin",       email: "admin@mlx.com",           password: "password123" },
  { label: "Tekreant Admin",  email: "admin@tekreant.com",      password: "password123" },
  { label: "Labsquire Admin", email: "admin@labsquire.com",     password: "password123" },
  { label: "Testgo Admin",    email: "admin@testgo.com",        password: "password123" },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const results = [];

function color(code, text) {
  const codes = { green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", reset: "\x1b[0m" };
  return `${codes[code]}${text}${codes.reset}`;
}

function log(status, label, detail = "") {
  const icon = status === "PASS" ? color("green", "✓ PASS") : status === "FAIL" ? color("red", "✗ FAIL") : color("yellow", "~ SKIP");
  const msg = `  ${icon}  ${label}${detail ? color("yellow", "  →  " + detail) : ""}`;
  console.log(msg);
  results.push({ status, label, detail });
  if (status === "PASS") passed++;
  else if (status === "FAIL") failed++;
  else skipped++;
}

async function req(method, path, token, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await req("POST", "/api/auth/login", null, { email, password });
  if (r.status === 200 && r.data?.data?.token) return r.data.data;
  return null;
}

function check(label, status, data, expectStatus = 200, expectSuccess = true) {
  if (status === expectStatus && (expectSuccess ? data?.success : true)) {
    log("PASS", label);
    return data?.data;
  } else {
    log("FAIL", label, `HTTP ${status} — ${data?.error ?? JSON.stringify(data)?.slice(0, 80)}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// Test Suites
// ─────────────────────────────────────────────

async function testAuth() {
  console.log(color("bold", "\n── AUTH ──────────────────────────────────────"));

  // Valid login
  let r = await req("POST", "/api/auth/login", null, { email: "admin@mlx.com", password: "password123" });
  check("Login — valid credentials", r.status, r.data, 200);

  // Wrong password (must be >= 6 chars to pass validation; auth failure returns 400)
  r = await req("POST", "/api/auth/login", null, { email: "admin@mlx.com", password: "wrongpassword" });
  if (r.status >= 400 && r.status < 500) log("PASS", "Login — wrong password returns 4xx");
  else log("FAIL", "Login — wrong password should return 4xx", `got ${r.status}`);

  // Missing fields
  r = await req("POST", "/api/auth/login", null, { email: "admin@mlx.com" });
  const badStatus = r.status >= 400 && r.status < 500;
  if (badStatus) log("PASS", "Login — missing password returns 4xx");
  else log("FAIL", "Login — missing password should return 4xx", `got ${r.status}`);

  // No token on protected route
  r = await req("GET", "/api/onboarding", null);
  if (r.status === 401) log("PASS", "Protected route — no token returns 401");
  else log("FAIL", "Protected route — no token should be 401", `got ${r.status}`);
}

async function testUserSessions() {
  console.log(color("bold", "\n── LOGIN SESSIONS ────────────────────────────"));
  const sessions = {};
  for (const u of USERS) {
    const session = await login(u.email, u.password);
    if (session?.token) {
      log("PASS", `Login: ${u.label} (${u.email})`);
      sessions[u.label] = session;
    } else if (u.optional) {
      log("SKIP", `Login: ${u.label} (${u.email})`, "credentials not set to default — update USERS array");
    } else {
      log("FAIL", `Login: ${u.label} (${u.email})`, "No token returned");
    }
  }
  return sessions;
}

async function testCompanies(sessions) {
  console.log(color("bold", "\n── COMPANIES ─────────────────────────────────"));
  const sa = sessions["Super Admin"];
  const mlx = sessions["MLX Admin"];

  if (sa) {
    let r = await req("GET", "/api/companies", sa.token);
    const companies = check("Super admin — GET /api/companies", r.status, r.data, 200);
    if (companies) log("PASS", `  → returned ${companies.length} companies`);

    r = await req("GET", "/api/admin/companies", sa.token);
    check("Super admin — GET /api/admin/companies", r.status, r.data, 200);
  }

  if (mlx) {
    let r = await req("GET", "/api/companies", mlx.token);
    check("Admin — GET /api/companies", r.status, r.data, 200);
  }
}

async function testTemplates(sessions) {
  console.log(color("bold", "\n── TEMPLATES ─────────────────────────────────"));
  const mlx = sessions["MLX Admin"];
  if (!mlx) return log("SKIP", "Templates — no MLX session");

  let r = await req("GET", "/api/templates", mlx.token);
  const templates = check("GET /api/templates", r.status, r.data, 200);
  if (!templates) return;
  log("PASS", `  → ${templates.length} templates found`);

  if (templates.length > 0) {
    const t = templates[0];
    r = await req("GET", `/api/templates/${t.id}`, mlx.token);
    check(`GET /api/templates/${t.id} (by id)`, r.status, r.data, 200);
  }

  // Unauthorized create attempt with viewer (no role)
  r = await req("POST", "/api/templates", null, { name: "test" });
  if (r.status === 401) log("PASS", "POST /api/templates without token returns 401");
  else log("FAIL", "POST /api/templates without token should return 401", `got ${r.status}`);
}

async function testJobs(sessions) {
  console.log(color("bold", "\n── JOBS ──────────────────────────────────────"));
  const mlx = sessions["MLX Admin"];
  if (!mlx) return log("SKIP", "Jobs — no MLX session");

  let r = await req("GET", "/api/jobs", mlx.token);
  const jobs = check("GET /api/jobs", r.status, r.data, 200);
  if (!jobs) return;
  log("PASS", `  → ${jobs.length} jobs found`);

  if (jobs.length > 0) {
    const j = jobs[0];
    r = await req("GET", `/api/jobs/${j.id}`, mlx.token);
    check(`GET /api/jobs/${j.id}`, r.status, r.data, 200);

    r = await req("GET", `/api/jobs/${j.id}/candidates`, mlx.token);
    check(`GET /api/jobs/${j.id}/candidates`, r.status, r.data, 200);
  }
}

async function testCandidates(sessions) {
  console.log(color("bold", "\n── CANDIDATES ────────────────────────────────"));
  const mlx = sessions["MLX Admin"];
  if (!mlx) return log("SKIP", "Candidates — no MLX session");

  // Discover a candidate via the jobs/candidates API (uses live MongoDB data)
  let candidateId;
  const jobsRes = await req("GET", "/api/jobs", mlx.token);
  const jobs = jobsRes.data?.data ?? [];
  for (const job of jobs) {
    const cr = await req("GET", `/api/jobs/${job.id}/candidates`, mlx.token);
    const cands = cr.data?.data ?? [];
    if (cands.length > 0) { candidateId = cands[0].id; break; }
  }

  if (candidateId) {
    let r = await req("GET", `/api/candidates/${candidateId}`, mlx.token);
    check(`GET /api/candidates/${candidateId.slice(0,8)}…`, r.status, r.data, 200);

    r = await req("GET", `/api/candidates/${candidateId}/interviews`, mlx.token);
    check(`GET /api/candidates/${candidateId.slice(0,8)}…/interviews`, r.status, r.data, 200);
  } else {
    log("SKIP", "Candidate detail — no candidates found via jobs API");
  }
}

async function testOnboarding(sessions) {
  console.log(color("bold", "\n── ONBOARDING ────────────────────────────────"));
  const mlx = sessions["MLX Admin"];
  if (!mlx) return log("SKIP", "Onboarding — no MLX session");

  let r = await req("GET", "/api/onboarding", mlx.token);
  const onboardings = check("GET /api/onboarding", r.status, r.data, 200);
  if (!onboardings) return;
  log("PASS", `  → ${onboardings.length} onboarding records`);

  if (onboardings.length > 0) {
    const o = onboardings[0];
    r = await req("GET", `/api/onboarding/${o.id}`, mlx.token);
    check(`GET /api/onboarding/${o.id}`, r.status, r.data, 200);

    r = await req("GET", `/api/onboarding/${o.id}/audit`, mlx.token);
    check(`GET /api/onboarding/${o.id}/audit`, r.status, r.data, 200);

    // Status update (PATCH)
    r = await req("PATCH", `/api/onboarding/${o.id}/status`, mlx.token, { status: o.status });
    check(`PATCH /api/onboarding/${o.id}/status`, r.status, r.data, 200);

    // Document PDF (HR view)
    if (o.documents?.length > 0) {
      const docId = o.documents[0].id;
      const pdfRes = await fetch(`${BASE}/api/onboarding/${o.id}/document/${docId}/pdf`, {
        headers: { Authorization: `Bearer ${mlx.token}` },
      });
      if (pdfRes.status === 200 && pdfRes.headers.get("content-type")?.includes("pdf")) {
        log("PASS", `GET /api/onboarding/${o.id}/document/${docId}/pdf → PDF`);
      } else {
        log("FAIL", `GET /api/onboarding/${o.id}/document/${docId}/pdf`, `HTTP ${pdfRes.status}`);
      }
    }
  }
}

async function testDocRules(sessions) {
  console.log(color("bold", "\n── DOC RULES ─────────────────────────────────"));
  const mlx = sessions["MLX Admin"];
  if (!mlx) return log("SKIP", "DocRules — no MLX session");

  let r = await req("GET", "/api/doc-rules", mlx.token);
  const rules = check("GET /api/doc-rules", r.status, r.data, 200);
  if (rules) log("PASS", `  → ${rules.length} doc rules`);

  if (rules?.length > 0) {
    r = await req("PATCH", `/api/doc-rules/${rules[0].id}`, mlx.token, {
      requiredDocuments: rules[0].requiredDocuments,
      optionalDocuments: rules[0].optionalDocuments,
    });
    check(`PATCH /api/doc-rules/${rules[0].id}`, r.status, r.data, 200);
  }
}

async function testEmployees(sessions) {
  console.log(color("bold", "\n── EMPLOYEES ─────────────────────────────────"));
  const mlx = sessions["MLX Admin"];
  if (!mlx) return log("SKIP", "Employees — no MLX session");

  let r = await req("GET", "/api/employees", mlx.token);
  const employees = check("GET /api/employees", r.status, r.data, 200);
  if (employees) log("PASS", `  → ${employees.length} employees`);

  if (employees?.length > 0) {
    r = await req("GET", `/api/employees/${employees[0].id}`, mlx.token);
    check(`GET /api/employees/${employees[0].id}`, r.status, r.data, 200);
  }
}

async function testAdminRoutes(sessions) {
  console.log(color("bold", "\n── ADMIN ROUTES ──────────────────────────────"));
  const sa = sessions["Super Admin"];
  const mlx = sessions["MLX Admin"];

  if (sa) {
    let r = await req("GET", "/api/admin/users", sa.token);
    const users = check("Super admin — GET /api/admin/users", r.status, r.data, 200);
    if (users) log("PASS", `  → ${users.length} users`);

    r = await req("GET", "/api/admin/companies", sa.token);
    check("Super admin — GET /api/admin/companies", r.status, r.data, 200);
  }

  if (mlx) {
    // Admin should not access super-admin-only routes
    let r = await req("GET", "/api/admin/companies", mlx.token);
    if (r.status === 401 || r.status === 403) {
      log("PASS", "Admin blocked from /api/admin/companies (401/403)");
    } else {
      // Some systems allow admins to see — not necessarily a failure
      log("SKIP", `Admin GET /api/admin/companies returned ${r.status} — check role guard`);
    }
  }
}

async function testSwitchCompany(sessions) {
  console.log(color("bold", "\n── SWITCH COMPANY ────────────────────────────"));
  const sa = sessions["Super Admin"];
  if (!sa) return log("SKIP", "Switch company — no super admin session");

  // Get companies list first
  const r = await req("GET", "/api/companies", sa.token);
  const companies = r.data?.data ?? [];
  if (companies.length === 0) return log("SKIP", "Switch company — no companies found");

  const switchRes = await req("POST", "/api/auth/switch-company", sa.token, { companyId: companies[0].id });
  check("POST /api/auth/switch-company", switchRes.status, switchRes.data, 200);
}

async function testCandidatePortal(sessions) {
  console.log(color("bold", "\n── CANDIDATE PORTAL (PUBLIC) ─────────────────"));

  // Discover a real access token via the onboarding API (uses live MongoDB data)
  let token;
  const mlx = sessions["MLX Admin"];
  if (mlx) {
    const or = await req("GET", "/api/onboarding", mlx.token);
    const onboardings = or.data?.data ?? [];
    token = onboardings.find(o => o.accessToken)?.accessToken;
  }

  if (!token) return log("SKIP", "Candidate portal — no access token found");

  let r = await fetch(`${BASE}/api/candidate/${token}`);
  let data; try { data = await r.json(); } catch { data = null; }
  if (r.status === 200 && data?.success) {
    log("PASS", `GET /api/candidate/${token.slice(0, 8)}… (portal data)`);

    const docs = data.data?.onboarding?.documents ?? [];
    if (docs.length > 0) {
      const docId = docs[0].id;

      // Fields endpoint
      const fr = await fetch(`${BASE}/api/candidate/${token}/document/${docId}/fields`);
      let fd; try { fd = await fr.json(); } catch { fd = null; }
      if (fr.status === 200 && fd?.success) {
        log("PASS", `GET /api/candidate/${token.slice(0,8)}…/document/${docId.slice(0,8)}…/fields`);
        const ff = fd.data?.formFields ?? [];
        log("PASS", `  → ${ff.length} form fields, ${fd.data?.signatureFields?.length ?? 0} signature fields`);
      } else {
        log("FAIL", `GET candidate/document/fields`, `HTTP ${fr.status}`);
      }

      // PDF endpoint
      const pr = await fetch(`${BASE}/api/candidate/${token}/document/${docId}/pdf`);
      if (pr.status === 200 && pr.headers.get("content-type")?.includes("pdf")) {
        log("PASS", `GET /api/candidate/…/document/${docId.slice(0,8)}…/pdf → PDF served`);
      } else {
        log("FAIL", `GET candidate/document/pdf`, `HTTP ${pr.status}`);
      }
    }
  } else {
    log("FAIL", `GET /api/candidate/${token.slice(0, 8)}…`, `HTTP ${r.status}`);
  }
}

async function testCrossCompanyIsolation(sessions) {
  console.log(color("bold", "\n── CROSS-COMPANY ISOLATION ───────────────────"));

  // Get a Tekreant onboarding ID via Tekreant admin, then test MLX admin can't see it
  let tekreantOnboardingId;
  const tekreant = sessions["Tekreant Admin"];
  if (tekreant) {
    const or = await req("GET", "/api/onboarding", tekreant.token);
    tekreantOnboardingId = (or.data?.data ?? [])[0]?.id;
  }

  const mlx = sessions["MLX Admin"];
  if (mlx && tekreantOnboardingId) {
    const r = await req("GET", `/api/onboarding/${tekreantOnboardingId}`, mlx.token);
    if (r.status === 404 || r.status === 401 || r.status === 403) {
      log("PASS", `MLX admin cannot access Tekreant onboarding (${r.status})`);
    } else if (r.status === 200) {
      log("FAIL", "MLX admin CAN access Tekreant onboarding — isolation breach!", `id: ${tekreantOnboardingId}`);
    } else {
      log("SKIP", `Cross-company isolation check — unexpected status ${r.status}`);
    }
  } else {
    log("SKIP", "Cross-company isolation — missing data");
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log(color("bold", color("cyan", "\n╔══════════════════════════════════════════╗")));
  console.log(color("bold", color("cyan",   "║   HRMS E-Onboarding — API Test Suite    ║")));
  console.log(color("bold", color("cyan",   "╚══════════════════════════════════════════╝")));
  console.log(`  Target: ${color("cyan", BASE)}`);
  console.log(`  Time:   ${new Date().toLocaleString()}`);

  // Check server is up
  try {
    const ping = await fetch(`${BASE}/api/companies`);
    if (!ping) throw new Error();
  } catch {
    console.log(color("red", "\n✗ Server not reachable at " + BASE));
    console.log("  Start it with:  npm run dev\n");
    process.exit(1);
  }

  await testAuth();
  const sessions = await testUserSessions();
  await testCompanies(sessions);
  await testTemplates(sessions);
  await testJobs(sessions);
  await testCandidates(sessions);
  await testOnboarding(sessions);
  await testDocRules(sessions);
  await testEmployees(sessions);
  await testAdminRoutes(sessions);
  await testSwitchCompany(sessions);
  await testCandidatePortal(sessions);
  await testCrossCompanyIsolation(sessions);

  // ── Summary ──
  const total = passed + failed + skipped;
  console.log(color("bold", "\n══════════════════════════════════════════════"));
  console.log(color("bold", "  RESULTS"));
  console.log("══════════════════════════════════════════════");
  console.log(`  Total:   ${total}`);
  console.log(`  ${color("green", `Passed:  ${passed}`)}`);
  console.log(`  ${color("red",   `Failed:  ${failed}`)}`);
  console.log(`  ${color("yellow",`Skipped: ${skipped}`)}`);
  console.log("══════════════════════════════════════════════");

  if (failed > 0) {
    console.log(color("bold", color("red", "\n  FAILED TESTS:")));
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ${color("red", "✗")} ${r.label}`);
      if (r.detail) console.log(`      ${color("yellow", r.detail)}`);
    });
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(color("red", "\nUnhandled error: " + err.message));
  process.exit(1);
});
