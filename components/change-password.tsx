import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
// import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import authService from "@/services/auth.service";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangePasswordDialog = ({ open, onOpenChange }: ChangePasswordDialogProps) => {
//   const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const router = useRouter();
  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!oldPassword) {
      newErrors.oldPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsLoading(true);

  try {
    const changePasswordData = {
      currentPassword: oldPassword,
      newPassword: newPassword,
    };

    await authService.changePassword(changePasswordData);

    // ✅ success
    resetForm();
    onOpenChange(false);
    router.push("/dashboard");

  } catch (err: any) {
    setErrors({
      oldPassword:
        err?.response?.data?.message || "Current password is incorrect",
    });
  } finally {
    setIsLoading(false);
  }
};


  const handleSkip = () => {
    onOpenChange(false);
    router.push("/dashboard");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Change Password
          </DialogTitle>
          <DialogDescription>
            Update your password to keep your account secure
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div>
            <PasswordInput
              label="Current Password"
              placeholder="Enter current password"
              value={oldPassword}
                onChange={(e) => {      
                    setOldPassword(e.target.value);
                }}   
            />
            {errors.oldPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.oldPassword}</p>
            )}
          </div>

          <div>
            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
                onChange={(e) => {  
                    setNewPassword(e.target.value);
                }}
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined });
                }
              }}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Change Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              size="lg"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Skip for now
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          You can always change your password later from account settings
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
