import { Button } from "@repo/design-system/components/ui/button";
import { FcGoogle } from "react-icons/fc";

interface GoogleAuthButtonProps {
    disabled?: boolean;
    label?: string;
    onClick: () => void;
}

export function GoogleAuthButton({ disabled = false, label = "Continue with Google", onClick }: GoogleAuthButtonProps) {
    return (
        <Button
            type="button"
            disabled={disabled}
            onClick={onClick}
            variant="outline"
            className="h-10 w-full gap-3 bg-background font-medium"
        >
            <FcGoogle aria-hidden="true" className="size-[18px] shrink-0" />
            {label}
        </Button>
    );
}
