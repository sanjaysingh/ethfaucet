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
  it("renders brand and chain selector from API", async () => {
    vi.spyOn(api, "fetchChains").mockResolvedValue([
      {
        slug: "sepolia",
        name: "Sepolia",
        chainId: 11155111,
        dripAmount: "0.01",
        cooldownSeconds: 86400,
        symbol: "ETH",
        decimals: 18,
        explorerUrl: "https://sepolia.etherscan.io",
      },
    ]);
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

    expect(screen.getByText("Dripwell")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("sepolia");
      expect(screen.getByText("0.01 ETH")).toBeInTheDocument();
    });
  });

  it("validates address before submitting", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchChains").mockResolvedValue([
      {
        slug: "sepolia",
        name: "Sepolia",
        chainId: 11155111,
        dripAmount: "0.01",
        cooldownSeconds: 86400,
        symbol: "ETH",
        decimals: 18,
        explorerUrl: "https://sepolia.etherscan.io",
      },
    ]);
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
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Solve captcha" }));
    await user.click(screen.getByRole("button", { name: "Request drip" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a wallet address",
    );
    expect(drip).not.toHaveBeenCalled();
  });
});
