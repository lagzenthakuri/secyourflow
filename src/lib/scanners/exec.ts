import { spawn } from "node:child_process";

/**
 * Local scanner execution helpers.
 *
 * Everything here runs an operator-supplied target against a system binary,
 * so arguments are always passed as an array to `spawn` with no shell. A shell
 * is never involved, and targets are validated against strict allowlists
 * before they reach the process boundary.
 */

export interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
    timedOut: boolean;
}

export class ScannerExecError extends Error {
    constructor(
        message: string,
        readonly result?: ExecResult,
    ) {
        super(message);
        this.name = "ScannerExecError";
    }
}

const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

/** Runs a binary with argv-style arguments. No shell, ever. */
export function execScanner(
    binary: string,
    args: string[],
    options: { timeoutMs: number; cwd?: string } = { timeoutMs: 120_000 },
): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(binary, args, {
            cwd: options.cwd,
            shell: false,
            windowsHide: true,
        });

        let stdout = "";
        let stderr = "";
        let stdoutBytes = 0;
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, options.timeoutMs);

        child.stdout.on("data", (chunk: Buffer) => {
            stdoutBytes += chunk.length;
            if (stdoutBytes > MAX_OUTPUT_BYTES) {
                child.kill("SIGKILL");
                return;
            }
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk: Buffer) => {
            // Bound stderr too so a chatty scanner cannot exhaust memory.
            if (stderr.length < 1_000_000) {
                stderr += chunk.toString();
            }
        });

        child.on("error", (error) => {
            clearTimeout(timer);
            reject(new ScannerExecError(`Failed to start ${binary}: ${error.message}`));
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, code, timedOut });
        });
    });
}

/** True when the binary is present and executable. */
export async function binaryAvailable(
    binary: string,
    versionArgs: string[] = ["--version"],
): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
        const result = await execScanner(binary, versionArgs, { timeoutMs: 10_000 });
        if (result.code !== 0 && !result.stdout && !result.stderr) {
            return { available: false, error: `${binary} exited ${result.code}` };
        }
        const version = (result.stdout || result.stderr).split("\n")[0]?.trim();
        return { available: true, version };
    } catch (error) {
        return {
            available: false,
            error: error instanceof Error ? error.message : `${binary} not found`,
        };
    }
}

const HOSTNAME_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_CIDR_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

function validOctets(parts: string[]): boolean {
    return parts.every((part) => {
        const value = Number(part);
        return Number.isInteger(value) && value >= 0 && value <= 255;
    });
}

/**
 * Accepts a hostname, IPv4 address, or IPv4 CIDR block and nothing else.
 * Rejects shell metacharacters, nmap's own option syntax, and whitespace, so
 * a target can never be reinterpreted as a flag or a second command.
 */
export function assertValidNetworkTarget(target: string): string {
    const value = target.trim();

    if (!value) {
        throw new ScannerExecError("Scan target is empty");
    }
    if (value.length > 255) {
        throw new ScannerExecError("Scan target is too long");
    }
    // A leading dash would be parsed as an option by most scanners.
    if (value.startsWith("-")) {
        throw new ScannerExecError("Scan target may not start with '-'");
    }
    if (/[\s;&|`$(){}<>\\"']/.test(value)) {
        throw new ScannerExecError("Scan target contains disallowed characters");
    }

    const cidr = value.match(IPV4_CIDR_PATTERN);
    if (cidr) {
        const prefix = Number(cidr[5]);
        if (!validOctets(cidr.slice(1, 5)) || prefix < 8 || prefix > 32) {
            throw new ScannerExecError("Invalid CIDR range (prefix must be between /8 and /32)");
        }
        return value;
    }

    const ipv4 = value.match(IPV4_PATTERN);
    if (ipv4) {
        if (!validOctets(ipv4.slice(1, 5))) {
            throw new ScannerExecError("Invalid IPv4 address");
        }
        return value;
    }

    if (HOSTNAME_PATTERN.test(value)) {
        return value;
    }

    throw new ScannerExecError("Scan target must be a hostname, IPv4 address, or IPv4 CIDR range");
}

/** Container image references and local paths for Trivy. */
export function assertValidArtifactTarget(target: string): string {
    const value = target.trim();

    if (!value) {
        throw new ScannerExecError("Scan target is empty");
    }
    if (value.length > 512) {
        throw new ScannerExecError("Scan target is too long");
    }
    if (value.startsWith("-")) {
        throw new ScannerExecError("Scan target may not start with '-'");
    }
    if (/[\s;&|`$(){}<>\\"']/.test(value)) {
        throw new ScannerExecError("Scan target contains disallowed characters");
    }

    return value;
}
