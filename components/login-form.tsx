/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import authService from "@/services/auth.service";
import { toast } from "sonner";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { set } from "lodash";
import ChangePasswordDialog from "./change-password";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordReset, setPasswordReset] = useState(false);
  const[dialogOpen, setDialogOpen] = useState(false);
  const[emailForReset, setEmailForReset] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // setError("");
    setLoading(true);

    try {
      const res = await authService.login({ email, password });
      console.log("Login response:", res.data.user);
      if (res.success && res.data.user) {
        const userData = {
          id: res.data.user.id,
          name: res.data.user.name,
          email: res.data.user.email,
          role: res.data.user.role,
        };
        document.cookie = `user=${JSON.stringify(
          userData
        )}; path=/; max-age=604800`;
        const { needsPasswordChange } = res.data.user;
      console.log("Needs Password Change:", needsPasswordChange);

          if (needsPasswordChange) {
            setDialogOpen(true);
          } else {
            // Only go to dashboard if no password change is needed
            router.push("/dashboard");
          }
      }
    } catch (err: any) {
      let msg = err?.response?.data?.msg || "Invalid email or password";

      // Remove [body] or similar prefixes
      msg = msg.replace(/^\[.*?\]\s*/, ""); 

      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  // Handle password reset 
  const handlePasswordReset = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!emailForReset) {
    toast.error("Email required");
    return;
  }

  setLoading(true);
  try {
    const res = await authService.forgotPassword(emailForReset);
     console.log(res.data)
    // Check if backend actually sent email
    if (res.data===null) {
      toast.error("Email not found");
      return;
    }

    toast.success("Email sent successfully!");
    setEmailForReset(""); // reset input
  } catch (err: any) {
    toast.error(err?.response?.data?.msg || err.message || "Failed to send email");
  } finally {
    setLoading(false);
  }
};

  return (
  <div className="flex flex-col gap-6 w-full">
      {/* --------------------- PASSWORD RESET FORM -------------------- */}
      {passwordReset && (
        <form onSubmit={handlePasswordReset} className="flex flex-col items-center text-center gap-4">

          <h1 className="text-2xl font-semibold text-gray-800">
            Password recovery
          </h1>

          <p className="text-sm text-muted-foreground max-w-xs">
           Enter your email and we email you a password recovery code.
          </p>

          <Field>
            <Input
              type="email"
              placeholder="Your Email"
              required
              value={emailForReset}
              onChange={(e) => setEmailForReset(e.target.value)}
            />
          </Field>


          <Button type="submit" disabled={loading} className="w-full h-11 mt-2">
            {loading ? "Processing..." : "Reset Password"}
          </Button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => setPasswordReset(false)}
            className="flex items-center gap-2 mt-4 text-gray-700 hover:text-primary"
          >
            <ArrowLeft size={22} className="cursor-pointer" />
            <span>Back to Login</span>
          </button>

          <p className="mt-4 text-sm text-gray-400">Your Privacy Choices 🛡️</p>
        </form>
      )}

      {/* -------------------------- LOGIN FORM ------------------------ */}
      {!passwordReset && (
        <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
         
         <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Enter your credentials to access Indirex Studio
          </p></div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-md flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              placeholder="you@inditronics.com"
              value={email}
              onChange={(e) => {setEmail(e.target.value);setError("");}}
              required
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Password</FieldLabel>

              <p
                onClick={() => {setPasswordReset(true);setError("");}}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Forgot password?
              </p>
            </div>

            <InputGroup>
              <InputGroupInput
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Button type="submit" className="w-full h-11">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Internal tool for authorized personnel only
          </p>
        </form>
      )}
      <ChangePasswordDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}