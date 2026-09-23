interface GoogleAuthButtonProps {
    disabled?: boolean;
    onClick: () => void;
}

export function GoogleAuthButton({ disabled = false, onClick }: GoogleAuthButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-60"
        >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
                />
                <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.11c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.16-5.48-2.91H.56v2.33A9 9 0 0 0 9 18Z"
                />
                <path
                    fill="#FBBC05"
                    d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.56a9 9 0 0 0 0 8.1l3.41-2.33Z"
                />
                <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0a9 9 0 0 0-5.48 2.02L6.97 4.95C7.62 4.16 8.66 3.58 9 3.58Z"
                />
            </svg>
            Continue with Google
        </button>
    );
}
