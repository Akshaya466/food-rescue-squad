import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectorAccessPendingNotice } from "./CollectorAccessPendingNotice";

describe("CollectorAccessPendingNotice", () => {
  it("does not show collector approval messaging for active collector accounts or mismatched applicant records", () => {
    const { rerender } = render(
      <CollectorAccessPendingNotice
        user={{ role: "donor", requestedRole: "collector" }}
      />
    );

    expect(
      screen.queryByText("Collector access pending approval")
    ).not.toBeInTheDocument();

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
