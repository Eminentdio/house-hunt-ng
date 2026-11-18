import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SignupPage from "@/pages/Signup";
import LoginPage from "@/pages/Login";

const authMock = vi.hoisted(() => ({
  user: null as { role: string } | null,
  signUp: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

function LocationState() {
  const { state } = useLocation();
  return <div data-testid="location-state">{JSON.stringify(state)}</div>;
}

describe("landlord signup flow", () => {
  beforeEach(() => {
    authMock.user = null;
    authMock.signUp.mockReset().mockResolvedValue({
      error: null,
      needsEmailConfirmation: true,
    });
    authMock.signIn.mockReset().mockResolvedValue({ error: null });
  });

  it("takes a landlord to login after signup so their profile can load", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LocationState />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.pointerDown(screen.getByRole("combobox"), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(await screen.findByRole("option", { name: /Landlord/ }));

    fireEvent.change(screen.getByPlaceholderText("Choose a unique username"), {
      target: { value: "landlord1" },
    });
    fireEvent.change(screen.getByPlaceholderText("John Doe"), {
      target: { value: "New Landlord" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "landlord@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("+234 800 000 0000"), {
      target: { value: "+2348000000000" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByTestId("location-state")).toHaveTextContent("null");
    expect(authMock.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ role: "landlord" })
    );
  });

  it("redirects a signed-in landlord to the dashboard", async () => {
    authMock.user = { role: "landlord" };

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/landlord" element={<div>Landlord dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Landlord dashboard")).toBeInTheDocument();
  });
});
