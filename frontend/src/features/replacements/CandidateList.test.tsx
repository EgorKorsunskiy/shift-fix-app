import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import "@/i18n";
import type { Candidate } from "@/api/types";
import { CandidateList } from "@/features/replacements/CandidateList";

const items: Candidate[] = [
  { workerId: 3, firstName: "Mila", lastName: "Claes", score: 40, offerStatus: null },
  { workerId: 7, firstName: "Jonas", lastName: "Willems", score: 90, offerStatus: "pending" },
];

function wrap(children: ReactNode) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("CandidateList", () => {
  it("keeps the order returned by the API", () => {
    render(
      wrap(
        <CandidateList
          items={items}
          offers={[]}
          filled={false}
          busy={false}
          pendingWorkerId={null}
          onContact={() => undefined}
        />,
      ),
    );
    const names = screen.getAllByTestId("candidate-row").map((row) => row.textContent);
    expect(names[0]).toContain("Mila");
    expect(names[1]).toContain("Jonas");
  });
});
