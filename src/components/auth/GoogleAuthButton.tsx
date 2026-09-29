import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { FcGoogle } from "react-icons/fc";

interface GoogleAuthButtonProps {
    disabled?: boolean;
    loading?: boolean;
    label?: string;
    onClick: () => void;
}

export function GoogleAuthButton({ disabled = false, loading = false, label = "Continue with Google", onClick }: GoogleAuthButtonProps) {
    return (
        <Button
            type="button"
            disabled={disabled || loading}
            aria-busy={loading}
            onClick={onClick}
            variant="outline"
            className="h-10 w-full gap-3 bg-background font-medium text-foreground disabled:cursor-wait disabled:opacity-100 disabled:text-foreground"
        >
            {loading ? (
                <Spinner aria-label="Connecting to Google" className="size-[18px] shrink-0 text-primary" />
            ) : (
                <FcGoogle aria-hidden="true" className="size-[18px] shrink-0" />
            )}
            <span aria-live="polite">{loading ? "Connecting to Google…" : label}</span>
        </Button>
    );
}
