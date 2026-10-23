export const LOAN_PRODUCTS = [
  { code: "ML", name: "Machinery Loan", pendingConfirmation: false },
  { code: "BL", name: "Business Loan", pendingConfirmation: false },
  { code: "CL", name: "Consumer Loan", pendingConfirmation: true },
  { code: "HL", name: "Housing Loan", pendingConfirmation: false },
  { code: "LAP", name: "Loan Against Property", pendingConfirmation: false },
  { code: "CP", name: "Commercial Purchase", pendingConfirmation: true },
  { code: "OD", name: "Overdraft", pendingConfirmation: false },
  { code: "TL", name: "Term Loan", pendingConfirmation: false },
  { code: "LRD", name: "Lease Rental Discounting", pendingConfirmation: false },
  { code: "CRF", name: "Car Refinance", pendingConfirmation: false },
  { code: "URL", name: "Used Car Loan", pendingConfirmation: false },
  { code: "CF", name: "Construction Finance", pendingConfirmation: false },
  { code: "UDF", name: "Unsold Inventory Finance", pendingConfirmation: false },
  { code: "IP", name: "Industrial Purchase", pendingConfirmation: false },
  { code: "PP", name: "Plot Purchase", pendingConfirmation: false },
  { code: "LP", name: "Land Purchase", pendingConfirmation: false },
] as const;
export const LEAD_STATUSES = ["NEW","UNASSIGNED","ASSIGNED","CONTACTED","FOLLOW_UP_REQUIRED","INTERESTED","QUALIFIED","MEETING_SCHEDULED","HANDED_OVER","NOT_INTERESTED","UNREACHABLE","DISQUALIFIED"] as const;
export const CASE_STAGES = ["PRE_REVIEW","DOCUMENT_COLLECTION","DOCUMENT_VERIFICATION","ELIGIBILITY","BANK_LOGIN","PD","LEGAL","VALUATION","CREDIT_ASSESSMENT","IN_PRINCIPLE_SANCTION","FINAL_SANCTION","PRE_DISBURSEMENT","DISBURSED","POST_SALES","CLOSED","REJECTED"] as const;
