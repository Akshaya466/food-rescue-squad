import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectorAccessPendingNotice } from "./CollectorAccessPendingNotice";

describe("CollectorAccessPendingNotice", () => {
  it("shows the approval notice only for donor accounts requesting collector access", () => {
    const { rerender } = render(
      <CollectorAccessPendingNotice
        user={{ role: "donor", requestedRole: "collector" }}
      />
    );

    expect(
      screen.getByText("Collector access pending approval")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/account is active as a donor/i)
    ).toBeInTheDocument();

    rerender(<CollectorAccessPendingNotice user={{ role: "donor" }} />);
    expect(
      screen.queryByText("Collector access pending approval")
    ).not.toBeInTheDocument();

    rerender(
      <CollectorAccessPendingNotice
        user={{ role: "collector", requestedRole: "collector" }}
      />
    );
    expect(
      screen.queryByText("Collector access pending approval")
    ).not.toBeInTheDocument();
  });
});
