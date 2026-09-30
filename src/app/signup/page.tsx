import { isPublicRegistrationEnabled } from "@/lib/auth/registration-policy";
import SignUpPageClient from "@/modules/auth/ui/SignUpPageClient";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <SignUpPageClient registrationEnabled={isPublicRegistrationEnabled()} />;
}
