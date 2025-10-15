export type Requirement = { id: `REQ-${number}`; title: string; description: string; tags: ("edge"|"chain"|"ui")[]; };
export const REQUIREMENTS: Requirement[] = [
  { id: "REQ-001", title: "Admin can list seasons", description: "list-seasons returns array", tags: ["edge"] },
  { id: "REQ-002", title: "Admin can toggle season active", description: "toggleActive works", tags: ["edge"] },
  { id: "REQ-003", title: "Economy stats aggregates", description: "economy-stats totals+recent", tags: ["edge"] },
  { id: "REQ-010", title: "On-chain claim mints bonds", description: "claim mints to ATA", tags: ["chain"] },
  { id: "REQ-011", title: "On-chain spend burns bonds", description: "spend burns amount", tags: ["chain"] }
];
