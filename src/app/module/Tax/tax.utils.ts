import { Schema, Types } from 'mongoose';
import { ITax } from './tax.interface';
import { Tax } from './tax.model';
import { Files } from '../files/files.model';
import { FileName } from '../fileNames/fileName.model';
import { IFileName } from '../fileNames/fileName.interface';
import taxTypesModel from '../taxTypes/tax.types.model';
import { IncomeSourceModel } from '../incomeSources/incomeSource.model';
import {
  COMMON_REQUIRED_DOCUMENTS,
  INCOME_SOURCE_DOCUMENT_MAP,
  TAX_TYPE_DOCUMENT_MAP,
} from '../fileNames/fileName.constant';

/** Active file names attached to a catalog row, in catalog order. */
const activeFileNames = (files?: IFileName[]) =>
  (files || []).filter(file => file?.isActive).map(file => file.name);

/**
 * Resolves the documents a user must upload for an order.
 *
 * The admin-managed catalog is the source of truth: common documents from
 * `FileName.isCommon`, and per-key documents from each tax type's and income
 * source's `required_files`. The hardcoded maps stay as a per-key fallback so an
 * order never loses its upload slots while the catalog is still being filled in
 * — a tax type or income source with nothing attached falls back to the map
 * entry it had before.
 *
 * Lives here rather than in `tax.services` so `files.service` can reuse it
 * without an import cycle.
 */
export const getRequiredDocumentsFromTax = async (taxData: Partial<ITax>) => {
  const sources = Array.isArray(taxData.source_of_income)
    ? taxData.source_of_income
    : [];
  const taxTypes = Array.isArray(taxData.tax_types) ? taxData.tax_types : [];

  const [commonFiles, taxTypeDocs, sourceDocs] = await Promise.all([
    FileName.find({ isActive: true, isCommon: true }).sort({ order: 1 }),
    taxTypes.length
      ? taxTypesModel
          .find({ value: { $in: taxTypes } })
          .populate<{ required_files: IFileName[] }>('required_files')
      : [],
    sources.length
      ? IncomeSourceModel.find({ value: { $in: sources } }).populate<{
          required_files: IFileName[];
        }>('required_files')
      : [],
  ]);

  const required = new Set<string>();

  const commonFromDb = commonFiles.map(fileName => fileName.name);
  (commonFromDb.length ? commonFromDb : COMMON_REQUIRED_DOCUMENTS).forEach(
    doc => required.add(doc),
  );

  sources.forEach(source => {
    const fromDb = activeFileNames(
      sourceDocs.find(doc => doc.value === source)?.required_files,
    );
    (fromDb.length ? fromDb : INCOME_SOURCE_DOCUMENT_MAP[source] || []).forEach(
      doc => required.add(doc),
    );
  });

  taxTypes.forEach(type => {
    const fromDb = activeFileNames(
      taxTypeDocs.find(doc => doc.value === type)?.required_files,
    );
    (fromDb.length ? fromDb : TAX_TYPE_DOCUMENT_MAP[type] || []).forEach(doc =>
      required.add(doc),
    );
  });

  if (taxData.are_you_get_notice_from_tax_office) {
    required.add('Notice from Income Tax Office');
  }

  if (taxData.income_from_partnership_firm || taxData.income_from_ldt_company) {
    required.add('Balance Sheet');
  }

  return Array.from(required);
};

/**
 * Realigns a tax order with the `files` collection.
 *
 * `Files.find({ orderId })` is the source of truth for what has actually been
 * uploaded — `Tax.documents` is a denormalised cache that historically drifted
 * (files created through `POST /files/create-file` were never pushed into it,
 * step two overwrote it, deletes left dangling refs). Rebuilding the array from
 * the query instead of `$addToSet`/`$pull` keeps one code path and repairs
 * already-drifted orders on the next upload.
 *
 * Also clears `files_upload_pending` once nothing is missing, so the admin
 * order list stops flagging orders that are in fact complete.
 *
 * Call after every file create/delete for an order.
 */
export const syncTaxDocumentState = async (
  // `Schema.Types.ObjectId` too: that is how `Ifile.orderId` is typed.
  taxId: string | Types.ObjectId | Schema.Types.ObjectId,
): Promise<{ missing_documents: string[] } | undefined> => {
  if (!taxId || !Types.ObjectId.isValid(String(taxId))) {
    return undefined;
  }

  const taxOrder = await Tax.findById(taxId);
  if (!taxOrder) {
    return undefined;
  }

  const files = await Files.find({ orderId: taxOrder._id }).select('_id type');
  const requiredDocuments = await getRequiredDocumentsFromTax(taxOrder);
  const uploadedTypes = new Set(files.map(file => file.type));
  const missingDocuments = requiredDocuments.filter(
    doc => !uploadedTypes.has(doc),
  );

  const update: Record<string, unknown> = {
    documents: files.map(file => file._id),
  };

  if (missingDocuments.length === 0 && taxOrder.files_upload_pending) {
    update.files_upload_pending = false;
    // Only advance from the state the skip-upload path parks an order in.
    // An order that has since been paid, approved or completed must not be
    // dragged back to `documents_uploaded` just because a file landed.
    if (taxOrder.status === 'payment_pending') {
      update.status = 'documents_uploaded';
    }
  }

  await Tax.findByIdAndUpdate(taxOrder._id, update);

  return { missing_documents: missingDocuments };
};

/**
 * The service fee a customer actually owes, after any applied coupon.
 *
 * The single source of truth for the discounted fee. `total_amount` is
 * recomputed from `fee_amount` in three different places in `tax.services`
 * (manual placement, gateway success, admin edit) and the payable amount in
 * `payment.service.resolvePayableAmount` — every one of them must call this, or
 * that path silently charges the undiscounted fee.
 *
 * Lives here rather than in `coupons/` so `payment.service` can reuse it
 * without an import cycle (it already imports from `Tax/tax.constant`).
 */
export const getPayableFeeAmount = (order: Partial<ITax>): number =>
  Math.max(
    0,
    Number(order?.fee_amount || 0) -
      Number(order?.applied_coupon?.discount_amount || 0),
  );
