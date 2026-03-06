import { Schema } from 'mongoose';

enum TaxDocumentType {
  TINCertificate = 'TIN Certificate',
  NIDCopy = 'NID Copy',
  SalaryStatement = 'Salary Statement',
  GPFPFStatement = 'GPF/PF Statement',
  BankStatement = 'Bank Statement',
  DPSCertificate = 'DPS Certificate',
  FDRCertificate = 'FDR Certificate',
  SonchoypotroCertificate = 'Sonchoypotro Certificate',
  InsuranceCertificate = 'Insurance Certificate',
  ShareCertificate = 'Share Certificate',
  PensionSchemeCertificate = 'Pension Scheme Certificate',
  LoanCertificate = 'Loan Certificate',
  LandPurchaseDocuments = 'Land Purchase Documents',
  FlatPurchaseDocuments = 'Flat Purchase Documents',
  VehiclePurchaseDocuments = 'Vehicle Purchase Documents',
  TaxToken = 'Tax Token',
  TaxDeductionCopy = 'Tax Deduction Copy',
  TradeLicense = 'Trade License',
  PurchaseStatement = 'Purchase Statement',
  SalesOrReceivedStatement = 'Sales or Received Statement',
  ProfitLossStatement = 'Profit & Loss Statement',
  OthersDocuments = 'If others Documents',
  NoticeFromIncomeTaxOffice = 'Notice from Income Tax Office',
  BalanceSheet = 'Balance Sheet',
}

export interface Ifile {
  _id?: string;
  name: string;
  type: string;
  file: string;
  orderId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
