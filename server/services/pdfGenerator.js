// server/services/pdfGenerator.js
// Generates professional A4 PDF documents for Invoices and Estimates using PDFKit

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { formatINR } from './calculation.js';

/**
 * Generate Invoice / Estimate PDF
 * @param {Object} docData - The document data (invoice or estimate)
 * @param {Object} settings - Business and invoice settings
 * @param {'invoice'|'estimate'} type - Document type
 * @returns {Promise<Buffer>}
 */
export function generateDocumentPDF(docData, settings = {}, type = 'invoice') {
  return new Promise((resolve, reject) => {
    try {
      const isInvoice = type === 'invoice';
      const isCompact = (docData.template || settings.template || 'standard') === 'compact';

      const doc = new PDFDocument({
        size: 'A4',
        margin: isCompact ? 30 : 40,
        info: {
          Title: `${isInvoice ? 'Tax Invoice' : 'Estimate'} - ${docData.invoice_number || docData.estimate_number}`,
          Author: settings.business_legal_name || 'TechBazaar India Private Limited'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const margin = isCompact ? 30 : 40;
      const pageWidth = 595.28;
      const contentWidth = pageWidth - (margin * 2);

      // Colors
      const primaryColor = '#0A0A0A';
      const secondaryColor = '#6B6B6B';
      const borderColor = '#EAEAEA';
      const accentColor = '#FF4D00';
      const bgLight = '#F7F7F7';

      // 1. Header & Brand
      let logoPath = path.resolve('public/logo.png');
      if (!fs.existsSync(logoPath)) {
        logoPath = path.resolve('public/images/techbazaar-logo.png');
      }
      const startY = margin;

      // Draw subtle header accent bar
      doc.rect(margin, startY, contentWidth, 3).fill(accentColor);

      let curY = startY + 12;

      // Logo or text brand
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, margin, curY, { height: 32 });
        } catch (e) {
          doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text('TECHBAZAAR', margin, curY);
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor).text('TECHBAZAAR', margin, curY);
      }

      // Title on the right
      const title = isInvoice ? 'TAX INVOICE' : 'ESTIMATE / QUOTE';
      doc.font('Helvetica-Bold').fontSize(16).fillColor(primaryColor)
        .text(title, margin, curY, { align: 'right', width: contentWidth });

      doc.font('Helvetica').fontSize(9).fillColor(secondaryColor)
        .text(
          `${isInvoice ? 'Invoice No' : 'Estimate No'}: ${docData.invoice_number || docData.estimate_number}`,
          margin, curY + 20, { align: 'right', width: contentWidth }
        );

      curY += 46;

      // 2. Company Info (Left) & Document Meta (Right)
      doc.rect(margin, curY, contentWidth, isCompact ? 72 : 82).fill(bgLight);
      doc.rect(margin, curY, contentWidth, isCompact ? 72 : 82).stroke(borderColor);

      const boxY = curY + 8;
      const halfWidth = (contentWidth / 2) - 16;

      // Seller Info
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text(settings.business_trade_name || 'TechBazaar Store', margin + 12, boxY);
      doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
      doc.text(settings.business_address || '108, 4th Cross, Koramangala 4th Block, Bengaluru, Karnataka 560034', margin + 12, boxY + 12, { width: halfWidth });
      doc.text(`GSTIN: ${settings.business_gstin || '29AABCT1337M1Z5'}  |  PAN: ${settings.business_pan || 'AABCT1337M'}`, margin + 12, boxY + 34);
      doc.text(`Email: ${settings.business_email || 'care@techbazaar.com'}  |  Tel: ${settings.business_phone || '+91 80 4920 1800'}`, margin + 12, boxY + 46);

      // Meta Info (Right side)
      const metaX = margin + (contentWidth / 2) + 8;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
      doc.text('Date:', metaX, boxY);
      doc.text(isInvoice ? 'Due Date:' : 'Valid Until:', metaX, boxY + 14);
      doc.text('Place of Supply:', metaX, boxY + 28);
      if (isInvoice && docData.payment_terms) {
        doc.text('Payment Terms:', metaX, boxY + 42);
      }

      doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
      doc.text(docData.invoice_date || docData.estimate_date || new Date().toISOString().split('T')[0], metaX + 85, boxY);
      doc.text(docData.due_date || docData.valid_until || 'Due on receipt', metaX + 85, boxY + 14);
      doc.text(docData.place_of_supply || 'Karnataka (29)', metaX + 85, boxY + 28);
      if (isInvoice && docData.payment_terms) {
        doc.text(docData.payment_terms, metaX + 85, boxY + 42);
      }

      curY += isCompact ? 80 : 92;

      // 3. Customer Info (Bill To / Ship To)
      const custBoxHeight = isCompact ? 50 : 60;
      doc.rect(margin, curY, contentWidth / 2 - 4, custBoxHeight).stroke(borderColor);
      doc.rect(margin + contentWidth / 2 + 4, curY, contentWidth / 2 - 4, custBoxHeight).stroke(borderColor);

      // Bill To
      doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('BILLED TO', margin + 8, curY + 6);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text(docData.customer_name || 'Customer', margin + 8, curY + 18);
      doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
      let billAddr = docData.customer_email || '';
      if (docData.customer_phone) billAddr += ` • ${docData.customer_phone}`;
      if (docData.customer_gstin) billAddr += `\nGSTIN: ${docData.customer_gstin}`;
      doc.text(billAddr, margin + 8, curY + 30, { width: contentWidth / 2 - 20 });

      // Ship To
      const shipX = margin + contentWidth / 2 + 12;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('SHIPPED TO', shipX, curY + 6);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text(docData.customer_name || 'Customer', shipX, curY + 18);
      doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
      let shipAddrText = 'Same as billing address';
      if (docData.shipping_address) {
        try {
          const parsed = typeof docData.shipping_address === 'string' ? JSON.parse(docData.shipping_address) : docData.shipping_address;
          shipAddrText = `${parsed.line1 || ''}, ${parsed.city || ''}, ${parsed.state || ''} ${parsed.pincode || ''}`;
        } catch (e) {
          shipAddrText = String(docData.shipping_address);
        }
      }
      doc.text(shipAddrText, shipX, curY + 30, { width: contentWidth / 2 - 20 });

      curY += custBoxHeight + 12;

      // 4. Line Items Table
      const colWidths = {
        idx: 20,
        item: isCompact ? 210 : 230,
        qty: 35,
        rate: 65,
        tax: 55,
        total: 80
      };

      // Header row
      doc.rect(margin, curY, contentWidth, 20).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      let tableX = margin + 4;
      doc.text('#', tableX, curY + 6, { width: colWidths.idx });
      tableX += colWidths.idx;
      doc.text('ITEM & DESCRIPTION', tableX, curY + 6, { width: colWidths.item });
      tableX += colWidths.item;
      doc.text('QTY', tableX, curY + 6, { width: colWidths.qty, align: 'center' });
      tableX += colWidths.qty;
      doc.text('RATE (₹)', tableX, curY + 6, { width: colWidths.rate, align: 'right' });
      tableX += colWidths.rate;
      doc.text('GST', tableX, curY + 6, { width: colWidths.tax, align: 'center' });
      tableX += colWidths.tax;
      doc.text('AMOUNT (₹)', tableX, curY + 6, { width: colWidths.total, align: 'right' });

      curY += 20;

      const items = docData.items || [];
      items.forEach((item, idx) => {
        const rowHeight = isCompact ? 18 : 22;
        if (idx % 2 === 1) {
          doc.rect(margin, curY, contentWidth, rowHeight).fill(bgLight);
        }
        doc.rect(margin, curY, contentWidth, rowHeight).stroke(borderColor);

        doc.font('Helvetica').fontSize(8).fillColor(primaryColor);
        let rx = margin + 4;
        doc.text(String(idx + 1), rx, curY + 5, { width: colWidths.idx });
        rx += colWidths.idx;
        
        doc.font('Helvetica-Bold').text(item.item_name || 'Item', rx, curY + 5, { width: colWidths.item, ellipsis: true });
        rx += colWidths.item;

        doc.font('Helvetica').text(String(item.quantity || 1), rx, curY + 5, { width: colWidths.qty, align: 'center' });
        rx += colWidths.qty;

        doc.text(formatINR(item.rate, false), rx, curY + 5, { width: colWidths.rate, align: 'right' });
        rx += colWidths.rate;

        doc.text(`${item.tax_rate || 18}%`, rx, curY + 5, { width: colWidths.tax, align: 'center' });
        rx += colWidths.tax;

        doc.font('Helvetica-Bold').text(formatINR(item.line_total || (item.rate * item.quantity), false), rx, curY + 5, { width: colWidths.total, align: 'right' });

        curY += rowHeight;
      });

      curY += 8;

      // 5. Totals & Tax Summary
      const summaryWidth = 220;
      const summaryX = margin + contentWidth - summaryWidth;

      const totals = [
        { label: 'Subtotal', value: formatINR(docData.subtotal || 0) },
        ...(docData.discount_amount ? [{ label: 'Discount', value: `-${formatINR(docData.discount_amount)}` }] : []),
        { label: 'Taxable Amount', value: formatINR(docData.taxable_value || docData.subtotal || 0) },
        ...(docData.cgst_amount ? [
          { label: 'CGST (9%)', value: formatINR(docData.cgst_amount) },
          { label: 'SGST (9%)', value: formatINR(docData.sgst_amount) }
        ] : []),
        ...(docData.igst_amount ? [{ label: 'IGST (18%)', value: formatINR(docData.igst_amount) }] : []),
        ...(docData.shipping_amount ? [{ label: 'Shipping & Delivery', value: formatINR(docData.shipping_amount) }] : []),
        ...(docData.round_off ? [{ label: 'Round Off', value: (docData.round_off > 0 ? '+' : '') + docData.round_off.toFixed(2) }] : []),
      ];

      totals.forEach(t => {
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor).text(t.label, summaryX, curY);
        doc.font('Helvetica').fontSize(8).fillColor(primaryColor).text(t.value, summaryX, curY, { align: 'right', width: summaryWidth });
        curY += 14;
      });

      // Grand Total Box
      doc.rect(summaryX - 6, curY, summaryWidth + 6, 24).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF').text('GRAND TOTAL', summaryX, curY + 6);
      doc.text(formatINR(docData.total || 0), summaryX, curY + 6, { align: 'right', width: summaryWidth });

      // Amount in words (on left)
      const wordsY = curY - 30;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('Amount in Words:', margin, wordsY);
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(secondaryColor).text(docData.amount_in_words || '', margin, wordsY + 12, { width: contentWidth - summaryWidth - 20 });

      curY += 34;

      // 6. Payment & Bank Details (for Invoices)
      if (isInvoice) {
        doc.rect(margin, curY, contentWidth - summaryWidth - 20, 60).fill(bgLight);
        doc.rect(margin, curY, contentWidth - summaryWidth - 20, 60).stroke(borderColor);

        doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('PAYMENT DETAILS', margin + 8, curY + 6);
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        doc.text(`Bank Name: ${settings.bank_name || 'HDFC Bank Ltd.'}`, margin + 8, curY + 18);
        doc.text(`A/C Number: ${settings.bank_account_no || '50200088912345'}`, margin + 8, curY + 28);
        doc.text(`IFSC: ${settings.bank_ifsc || 'HDFC0001089'}  |  UPI: ${settings.upi_id || 'techbazaar@hdfcbank'}`, margin + 8, curY + 38);

        // Balance Due badge
        if (docData.balance_due > 0) {
          doc.rect(summaryX, curY + 8, summaryWidth, 34).stroke(accentColor);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(accentColor).text('BALANCE DUE', summaryX + 8, curY + 14);
          doc.font('Helvetica-Bold').fontSize(12).fillColor(accentColor).text(formatINR(docData.balance_due), summaryX + 8, curY + 24);
        }
      }

      curY += 70;

      // 7. Terms & Authorized Signatory
      const bottomY = Math.max(curY, 730);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('Terms & Conditions:', margin, bottomY);
      doc.font('Helvetica').fontSize(7).fillColor(secondaryColor).text(
        docData.terms || settings.invoice_terms || '1. Goods once sold will be accepted for return only in original sealed packaging within 7 days. 2. Manufacturer warranty applies as per card included. 3. Subject to Bengaluru jurisdiction.',
        margin, bottomY + 10, { width: contentWidth - 160 }
      );

      // Signatory
      const signX = margin + contentWidth - 140;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text(`For ${settings.business_trade_name || 'TechBazaar'}`, signX, bottomY, { align: 'center', width: 140 });
      doc.text('(Authorized Signatory)', signX, bottomY + 45, { align: 'center', width: 140 });

      // Footer note
      doc.font('Helvetica').fontSize(7).fillColor(secondaryColor).text(
        'This is a computer-generated document and carries digital integrity.',
        margin, 800, { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
