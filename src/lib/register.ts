import { prisma } from "./db";
export const REGISTER_COLUMNS = ["Login Date","Company Name","Client Name","Product","Status","Bank Name","Bank Manager / Consultant","Office Sales","Employee Code","Reference / Telecaller","Remarks","Sanctioned Loan Amount","Disbursed Loan Amount"] as const;
export type RegisterRow = Awaited<ReturnType<typeof buildRegisterRows>>[number];
export async function buildRegisterRows() {
  const apps = await prisma.bankApplication.findMany({ include: { bank: true, loanCase: { include: { customer: true, product: true, owner: true, lead: { include: { assignedTo: true } } } } }, orderBy: { loginDate: "desc" } });
  return apps.map((app) => ({
    id: app.id, caseId: app.caseId, caseCode: app.loanCase.code,
    "Login Date": app.loginDate ? app.loginDate.toISOString().slice(0, 10) : "",
    "Company Name": app.loanCase.customer.company || "",
    "Client Name": app.loanCase.customer.name,
    "Product": app.loanCase.productCode || app.loanCase.product?.code || "",
    "Status": app.status,
    "Bank Name": app.bank.name,
    "Bank Manager / Consultant": app.managerName || app.consultantName || "",
    "Office Sales": app.loanCase.officeSales || "",
    "Employee Code": app.loanCase.owner?.employeeCode || "",
    "Reference / Telecaller": app.loanCase.lead?.assignedTo?.name || "",
    "Remarks": app.remarks || app.loanCase.remarks || "",
    "Sanctioned Loan Amount": app.sanctionedAmount ?? app.loanCase.sanctionedAmount ?? "",
    "Disbursed Loan Amount": app.disbursedAmount ?? app.loanCase.disbursedAmount ?? "",
  }));
}
