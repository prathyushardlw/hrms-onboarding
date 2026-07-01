"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { CheckCircle, Loader2, PenLine, RotateCcw, Type } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with canvas
const SignaturePad = dynamic(() => Promise.resolve(SignatureCanvas), { ssr: false });

interface OfferDetails {
  offer: {
    id: string;
    designation: string;
    department: string;
    ctc: string;
    joiningDate: string;
    additionalTerms?: string;
    status: string;
    signedAt?: string;
  };
  candidateName: string;
  companyName: string;
  jobTitle: string;
}

export default function OfferSignPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signMode, setSignMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const sigRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    fetch(`/api/offer-sign/${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          if (res.data.offer.signedAt) {
            setDone(true);
            setSignedAt(res.data.offer.signedAt);
          }
        } else {
          setError(res.error ?? "Invalid or expired link");
        }
      })
      .catch(() => setError("Failed to load offer"))
      .finally(() => setLoading(false));
  }, [token]);

  const generateTypedSignature = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 460; canvas.height = 140;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.font = "italic 52px 'Brush Script MT', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async () => {
    let signatureDataUrl: string;
    if (signMode === "draw") {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        alert("Please draw your signature first");
        return;
      }
      signatureDataUrl = sigRef.current.toDataURL("image/png");
    } else {
      if (!typedName.trim()) {
        alert("Please type your name to sign");
        return;
      }
      signatureDataUrl = generateTypedSignature();
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/offer-sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setDone(true);
        setSignedAt(json.data.signedAt);
      } else {
        setError(json.error ?? "Failed to submit signature");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Link Invalid</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { offer, candidateName, companyName } = data;
  const joiningStr = new Date(offer.joiningDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Offer Accepted!</h2>
          <p className="text-gray-500 text-sm mb-6">
            You have digitally signed your offer letter from <strong>{companyName}</strong>.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Signed as</span><span className="font-medium">{candidateName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Designation</span><span className="font-medium">{offer.designation}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Joining</span><span className="font-medium">{joiningStr}</span></div>
            {signedAt && (
              <div className="flex justify-between"><span className="text-gray-500">Signed at</span><span className="font-medium">{new Date(signedAt).toLocaleString()}</span></div>
            )}
          </div>
          <p className="mt-4 text-xs text-gray-400">A signed copy has been recorded. You may close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-700 rounded-xl mb-3">
            <span className="text-white text-xl">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Offer Letter</h1>
          <p className="text-gray-500 text-sm mt-1">{companyName}</p>
        </div>

        {/* Offer details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Dear <strong>{candidateName}</strong>,</p>
          <p className="text-sm text-gray-600 mb-5">
            We are pleased to offer you the following position at <strong>{companyName}</strong>. Please review and sign below to confirm your acceptance.
          </p>
          <div className="divide-y divide-gray-100">
            {[
              ["Designation", offer.designation],
              ["Department", offer.department],
              ["CTC", offer.ctc],
              ["Date of Joining", joiningStr],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2.5 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          {offer.additionalTerms && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Additional Terms</p>
              <p>{offer.additionalTerms}</p>
            </div>
          )}
        </div>

        {/* Signature section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Sign to Accept</h3>
          <p className="text-xs text-gray-400 mb-4">Your signature will be recorded with a timestamp and IP address for verification purposes.</p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSignMode("draw")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${signMode === "draw" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              <PenLine className="h-3.5 w-3.5" /> Draw
            </button>
            <button
              onClick={() => setSignMode("type")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${signMode === "type" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              <Type className="h-3.5 w-3.5" /> Type
            </button>
          </div>

          {signMode === "draw" ? (
            <div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                <SignaturePad
                  ref={sigRef}
                  canvasProps={{ width: 520, height: 150, className: "w-full" }}
                  backgroundColor="transparent"
                  penColor="#111827"
                />
              </div>
              <button onClick={() => sigRef.current?.clear()} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            </div>
          ) : (
            <div>
              <input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ fontFamily: "'Brush Script MT', cursive", fontSize: "28px" }}
              />
              <p className="mt-1 text-xs text-gray-400">This typed signature is legally binding.</p>
            </div>
          )}
        </div>

        {/* Consent + submit */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          By clicking <strong>Sign &amp; Accept</strong>, you confirm that you have read and agree to the terms of this offer letter. Your signature, timestamp, and IP address will be recorded.
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
          {submitting ? "Signing…" : "Sign & Accept Offer"}
        </button>
      </div>
    </div>
  );
}
