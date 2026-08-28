import { Document } from 'mongoose';

export interface IFileNameLabel {
  en: string;
  bn: string;
}

export interface IFileName extends Document {
  /**
   * Canonical English name. This is the value shipped to the client/app inside
   * `required_documents` and the value an uploaded `File.type` is matched
   * against, so renaming it orphans every file already uploaded under the old
   * name. Treat it as a key, not a label — use `label` for display copy.
   */
  name: string;
  label: IFileNameLabel;
  /** Required on every tax order regardless of tax type or income source. */
  isCommon: boolean;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
