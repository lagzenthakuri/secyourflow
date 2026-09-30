import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Login form component tests.
 *
 * Tests the login form's user interaction, validation, and error handling.
 * Uses Testing Library to simulate real user behavior.
 */

// Mock next-auth signIn
const mockSignIn = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

// Mock next/navigation
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import LoginForm from "@/components/auth/LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ ok: true, error: null });
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation error for empty email", async () => {
    render(<LoginForm />);
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for empty password", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "test@example.com");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email format", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "not-an-email");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it("calls signIn with correct credentials", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "password123");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "password123",
        redirect: false,
      });
    });
  });

  it("shows error message when signIn fails", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "wrongpassword");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "password123");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it("trims whitespace from email", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, "  test@example.com  ");
    await userEvent.type(passwordInput, "password123");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "test@example.com",
        })
      );
    });
  });

  it("converts email to lowercase", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, "TEST@EXAMPLE.COM");
    await userEvent.type(passwordInput, "password123");
    const button = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(button);
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "test@example.com",
        })
      );
    });
  });
});
