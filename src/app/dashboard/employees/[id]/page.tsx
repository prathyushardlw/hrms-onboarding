"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthFetch } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowLeft, Pencil, CheckCircle, X, ExternalLink } from "lucide-react";
import type { Employee } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  active:     "bg-green-100 text-green-700",
  probation:  "bg-yellow-100 text-yellow-700",
  notice:     "bg-orange-100 text-orange-700",
  resigned:   "bg-gray-100 text-gray-500",
  terminated: "bg-red-100 text-red-600",
};

const STATUSES = [
  { value: "active",     label: "Active" },
  { value: "probation",  label: "On Probation" },
  { value: "notice",     label: "On Notice" },
  { value: "resigned",   label: "Resigned" },
  { value: "terminated", label: "Terminated" },
];

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract",  label: "Contract" },
  { value: "intern",    label: "Intern" },
];

type Section = "personal" | "work" | "compensation" | "bank" | "emergency";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [manager, setManager] = useState<Employee | null>(null);
  const [colleagues, setColleagues] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await authFetch(`/api/employees/${id}`);
    if (!res.success) { router.replace("/dashboard/employees"); return; }
    setEmployee(res.data);

    // Load manager + colleagues for manager selector
    const allRes = await authFetch("/api/employees");
    if (allRes.success) {
      const all: Employee[] = allRes.data;
      setColleagues(all.filter((e) => e.id !== id));
      if (res.data.managerId) {
        setManager(all.find((e) => e.id === res.data.managerId) ?? null);
      }
    }
    setLoading(false);
  }, [id, authFetch, router]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (section: Section) => {
    setForm({ ...employee });
    setEditing(section);
  };

  const save = async () => {
    if (!employee) return;
    setSaving(true);
    const res = await authFetch(`/api/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    if (res.success) {
      setEmployee(res.data);
      if (res.data.managerId) {
        setManager(colleagues.find((e) => e.id === res.data.managerId) ?? null);
      } else {
        setManager(null);
      }
    }
    setEditing(null);
    setSaving(false);
  };

  const field = (key: keyof Employee) => (
    <input
      value={(form[key] as string) ?? ""}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  );

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>;
  if (!employee) return null;

  const Section = ({ title, section, children }: { title: string; section: Section; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {editing === section ? (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              <CheckCircle className="h-3.5 w-3.5" />{saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button onClick={() => startEdit(section)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Pencil className="h-4 w-4" /></button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const Row = ({ label, value, editEl }: { label: string; value?: string | null; editEl?: React.ReactNode }) => (
    <div className="flex items-start py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="w-44 text-sm text-gray-500 flex-shrink-0 pt-0.5">{label}</span>
      <span className="flex-1 text-sm text-gray-900">{editing ? editEl : (value || <span className="text-gray-300">—</span>)}</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/employees" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-700 font-bold text-xl flex items-center justify-center flex-shrink-0">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[employee.status]}`}>
                  {STATUSES.find(s => s.value === employee.status)?.label}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                <span className="font-mono font-medium text-gray-700">{employee.employeeId}</span>
                {" · "}{employee.designation}{" · "}{employee.department}
              </p>
            </div>
          </div>
        </div>
        {employee.onboardingId && (
          <Link href={`/dashboard/onboarding/${employee.onboardingId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex-shrink-0">
            <ExternalLink className="h-4 w-4" /> Onboarding
          </Link>
        )}
      </div>

      {/* Employment Status quick-change */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Employment Status:</span>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s.value}
              onClick={async () => {
                const res = await authFetch(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify({ status: s.value }) });
                if (res.success) setEmployee(res.data);
              }}
              className={`px-3 py-1 rounded-lg text-sm border transition-colors ${employee.status === s.value ? STATUS_COLORS[s.value] + " border-transparent font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Personal Info */}
      <Section title="Personal Information" section="personal">
        <Row label="Full Name" value={employee.name} editEl={field("name")} />
        <Row label="Email" value={employee.email} editEl={field("email")} />
        <Row label="Phone" value={employee.phone} editEl={field("phone")} />
        <Row label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null}
          editEl={<input type="date" value={(form.dateOfBirth as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />} />
        <Row label="Address" value={employee.address} editEl={<textarea value={(form.address as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />} />
      </Section>

      {/* Work Info */}
      <Section title="Work Information" section="work">
        <Row label="Employee ID" value={employee.employeeId} editEl={<span className="text-sm font-mono text-gray-500">{employee.employeeId}</span>} />
        <Row label="Department" value={employee.department} editEl={field("department")} />
        <Row label="Designation" value={employee.designation} editEl={field("designation")} />
        <Row label="Employment Type" value={EMPLOYMENT_TYPES.find(t => t.value === employee.employmentType)?.label}
          editEl={<select value={(form.employmentType as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value as Employee["employmentType"] }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>} />
        <Row label="Joining Date" value={new Date(employee.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          editEl={<input type="date" value={(form.joiningDate as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />} />
        <Row label="Reports To" value={manager ? `${manager.name} (${manager.employeeId})` : undefined}
          editEl={<select value={(form.managerId as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value || undefined }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">— No manager —</option>
            {colleagues.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId}) · {e.designation}</option>)}
          </select>} />
      </Section>

      {/* Compensation */}
      <Section title="Compensation" section="compensation">
        <Row label="CTC" value={employee.ctc} editEl={field("ctc")} />
      </Section>

      {/* Bank Details */}
      <Section title="Bank Details" section="bank">
        <Row label="Bank Name" value={employee.bankName} editEl={field("bankName")} />
        <Row label="Account Number" value={employee.accountNumber} editEl={field("accountNumber")} />
        <Row label="IFSC Code" value={employee.ifscCode} editEl={field("ifscCode")} />
      </Section>

      {/* Emergency Contact */}
      <Section title="Emergency Contact" section="emergency">
        <Row label="Name" value={employee.emergencyContactName} editEl={field("emergencyContactName")} />
        <Row label="Phone" value={employee.emergencyContactPhone} editEl={field("emergencyContactPhone")} />
        <Row label="Relation" value={employee.emergencyContactRelation} editEl={field("emergencyContactRelation")} />
      </Section>
    </div>
  );
}
