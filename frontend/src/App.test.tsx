import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import * as api from "./api";

vi.mock("./Turnstile", () => ({
  Turnstile: ({
    onToken,
  }: {
    onToken: (token: string) => void;
  }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      Solve captcha
    </button>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders brand with Sepolia selected and disabled", async () => {
    vi.spyOn(api, "fetchChainInfo").mockResolvedValue({
      slug: "sepolia",
      name: "Sepolia",
      chainId: 11155111,
      dripAmount: "0.01",
      symbol: "ETH",
      cooldownSeconds: 86400,
      explorerUrl: "https://sepolia.etherscan.io",
      faucetAddress: "0xabc",
      balance: "1.5",
      paused: false,
    });

    render(<App />);

    expect(screen.getByText("Eth Faucet")).toBeInTheDocument();
    await waitFor(() => {
      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("sepolia");
      expect(select).toBeDisabled();
      expect(screen.getByText("0.01 ETH")).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/API for other apps/i),
    ).not.toBeInTheDocument();
  });

  it("validates address before submitting", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchChainInfo").mockResolvedValue({
      slug: "sepolia",
      name: "Sepolia",
      chainId: 11155111,
      dripAmount: "0.01",
      symbol: "ETH",
      cooldownSeconds: 86400,
      explorerUrl: "https://sepolia.etherscan.io",
      faucetAddress: null,
      balance: null,
      paused: false,
    });
    const drip = vi.spyOn(api, "requestDrip");

    render(<App />);
    await waitFor(() => expect(screen.getByText("0.01 ETH")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Solve captcha" }));
    await user.click(screen.getByRole("button", { name: "Request drip" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a wallet address",
    );
    expect(drip).not.toHaveBeenCalled();
  });
});
