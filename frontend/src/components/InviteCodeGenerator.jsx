import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

export default function InviteCodeGenerator({ patient }) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [patientEmail, setPatientEmail] = useState(patient?.email || "");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [qrBase64, setQrBase64] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  const generateCode = async () => {
    // DEBUG — check what patient looks like
    console.log("patient prop:", patient);
    console.log("patient._id:", patient?._id);
    console.log("patient.id:", patient?.id);

    // Use whichever ID field exists
    const patientId = patient?._id || patient?.id;
    if (!patientId) {
      toast({ title: "Error", description: "Patient ID missing. Check console.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/patient-portal/invite', {
        patient_id: patientId,
        patient_name: patient.name,
      });
      console.log("Invite response:", res.data);
      setInviteCode(res.data.code);
      setQrBase64("");
      toast({ title: "Invite code generated!", description: "Valid for 72 hours." });
    } catch (err) {
      console.error("Invite error:", err);
      console.error("Response:", err?.response?.data);
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to generate code.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = () => {
    const baseUrl = window.location.origin;
    const msg = `Hi ${patient.name}! Your AyuCare invite code is: ${inviteCode}\nRegister here: ${baseUrl}/patient/register?code=${inviteCode}`;
    navigator.clipboard.writeText(msg);
    toast({ title: "Copied!", description: "Invite message copied to clipboard." });
  };

  const sendEmail = async () => {
    if (!patientEmail) {
      toast({ title: "Email required", description: "Enter patient's email address.", variant: "destructive" });
      return;
    }
    setSendingEmail(true);
    try {
      const res = await api.post("/patient-portal/invite/send-email", {
        invite_code: inviteCode,
        patient_name: patient.name,
        patient_email: patientEmail,
      });
      setQrBase64(res.data.qr_base64);
      toast({ title: "Email sent! 📧", description: `Invite sent to ${patientEmail}` });
      setShowEmailForm(false);
    } catch (err) {
      console.error("Email error:", err?.response?.data);
      toast({
        title: "Failed to send email",
        description: err?.response?.data?.detail || "Check SMTP settings in .env",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Card className="border border-green-100">
      <CardHeader>
        <CardTitle className="text-green-800 text-base">🔗 Patient Portal Invite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!inviteCode ? (
          <Button
            onClick={generateCode}
            disabled={loading}
            className="bg-green-700 hover:bg-green-800 w-full"
          >
            {loading ? "Generating..." : "Generate Invite Code"}
          </Button>
        ) : (
          <>
            <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">INVITE CODE</p>
              <p className="text-3xl font-bold tracking-widest text-green-700">{inviteCode}</p>
              <p className="text-xs text-gray-400 mt-1">Valid for 72 hours</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyMessage} className="flex-1">
                📋 Copy Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailForm(!showEmailForm)}
                className="flex-1 border-green-300 text-green-700"
              >
                📧 Send Email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setInviteCode(""); setQrBase64(""); }}
                className="text-gray-400"
              >
                ↺ New
              </Button>
            </div>

            {showEmailForm && (
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  placeholder="patient@email.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={sendEmail}
                  disabled={sendingEmail}
                  className="bg-green-700 hover:bg-green-800"
                >
                  {sendingEmail ? "Sending..." : "Send"}
                </Button>
              </div>
            )}

            {qrBase64 && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500 mb-2">QR Code (patient can scan to register)</p>
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="QR Code"
                  className="w-36 h-36 mx-auto rounded-lg border border-green-100 shadow-sm"
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}