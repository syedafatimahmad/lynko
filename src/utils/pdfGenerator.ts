import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { CoCData, Project, SampleItem } from '../store/lynkoStore';
import { lynkoLogoBase64 } from './lynkoLogoBase64';

const escapeHtml = (unsafe: string) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const generatePDF = async (project: Project | null, cocData: CoCData, samples: SampleItem[]) => {
  try {
    const signatureHtml = cocData.inspectorSignature 
      ? `<img src="${cocData.inspectorSignature}" style="max-height: 38px; max-width: 160px; margin-left: 8px;"/>`
      : '';

    const relinquishedSigHtml = cocData.relinquishedBySignature 
      ? `<img src="${cocData.relinquishedBySignature}" style="max-height: 38px; max-width: 160px; margin-left: 8px;"/>`
      : '';

    const safeCoc = {
      poNumber: escapeHtml(cocData.poNumber),
      description: escapeHtml(cocData.description),
      zipCode: escapeHtml(cocData.zipCode),
      samplingDate: escapeHtml(cocData.samplingDate),
      samplingTime: escapeHtml(cocData.samplingTime),
      contactName: escapeHtml(cocData.contactName),
      contactAddress: escapeHtml(cocData.contactAddress),
      contactPhone: escapeHtml(cocData.contactPhone),
      sampledBy: escapeHtml(cocData.sampledBy),
      accountInfo: escapeHtml((cocData.accountInfo || 'Lynko - DFW/47674').replace(/Alpha Environmental/gi, 'Lynko')),
      specialInstructions: escapeHtml(cocData.specialInstructions),
      turnaround1: escapeHtml(cocData.turnaround1 || ''),
    };

    const maxSamplesPerPage = 15;
    const totalPages = Math.max(1, Math.ceil(samples.length / maxSamplesPerPage));

    let pagesHtml = '';

    for (let page = 0; page < totalPages; page++) {
      const startIndex = page * maxSamplesPerPage;
      let rowsHtml = '';
      
      for (let i = 0; i < maxSamplesPerPage; i++) {
        const s = samples[startIndex + i];
        if (s) {
          const safeName = escapeHtml(s.name.replace('Sample ID ', ''));
          const safeDesc = escapeHtml(s.description || '');
          const safeNotes = escapeHtml(s.notes || '');
          const safeProp = escapeHtml(s.property || '');
          const safeMeas = escapeHtml(s.measurement || '');
          const safeUnit = s.unit && s.unit !== 'N/A' ? ` ${escapeHtml(s.unit)}` : '';
          
          rowsHtml += `
            <tr>
              <td class="text-center">${safeName}</td>
              <td>${safeDesc}${safeNotes ? `<br><i>Note: ${safeNotes}</i>` : ''}</td>
              <td class="text-center">${safeProp}</td>
              <td class="text-center">${safeMeas}${safeUnit}</td>
              <td class="text-center bold">${s.analysis1Enabled ? 'X' : ''}</td>
              <td class="text-center bold">${s.analysis2Enabled ? 'X' : ''}</td>
            </tr>
          `;
        } else {
          rowsHtml += `
            <tr>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `;
        }
      }

      const hasNextPage = page < totalPages - 1;

      pagesHtml += `
        <div class="page" ${hasNextPage ? 'style="page-break-after: always;"' : ''}>
          <!-- Header Logos -->
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="bg-beige" style="width: 15%;">Company Name</td>
              <td style="width: 45%; vertical-align: middle; padding: 6px 12px;">
                <img src="${lynkoLogoBase64}" style="max-height: 40px; display: block;" />
              </td>
              <td class="bg-teal" style="font-size: 13px;">
                CHAIN OF CUSTODY
              </td>
            </tr>
          </table>

          <!-- Project & Client Info Block -->
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="bg-beige" style="width: 15%;">Project Name</td>
              <td style="width: 45%;">${safeCoc.description}</td>
              <td class="bg-beige" style="width: 15%;">Turnaround</td>
              <td style="width: 25%; font-weight: bold; color: #004d40;">${safeCoc.turnaround1}</td>
            </tr>
            <tr>
              <td class="bg-beige">PO #</td>
              <td>${safeCoc.poNumber}</td>
              <td class="bg-beige">Contact Name</td>
              <td>${safeCoc.contactName}</td>
            </tr>
            <tr>
              <td class="bg-beige">Date</td>
              <td>${safeCoc.samplingDate}</td>
              <td class="bg-beige">Address</td>
              <td>${safeCoc.contactAddress}</td>
            </tr>
            <tr>
              <td class="bg-beige">Time</td>
              <td>${safeCoc.samplingTime}</td>
              <td class="bg-beige">Phone</td>
              <td>${safeCoc.contactPhone}</td>
            </tr>
            <tr>
              <td class="bg-beige">Sampled By</td>
              <td>${safeCoc.sampledBy}</td>
              <td class="bg-beige">Account Info</td>
              <td>${safeCoc.accountInfo}</td>
            </tr>
          </table>

          <!-- Analysis 2-Tier Header & Sample Rows -->
          <table style="margin-bottom: -1px;">
            <thead>
              <tr>
                <th style="width: 12%;">Sample ID</th>
                <th style="width: 38%;">Sample Description</th>
                <th style="width: 15%;">Type / Media</th>
                <th style="width: 15%;">Volume / Area</th>
                <th class="bg-teal" style="width: 10%; font-size: 9px; padding: 2px;">${escapeHtml(cocData.analysis1 || 'Analysis 1')}<br><span style="font-weight: normal; font-size: 8px;">${safeCoc.turnaround1}</span></th>
                <th class="bg-teal" style="width: 10%; font-size: 9px; padding: 2px;">${escapeHtml(cocData.analysis2 || 'Analysis 2')}<br><span style="font-weight: normal; font-size: 8px;">${safeCoc.turnaround1}</span></th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Special Instructions & Totals -->
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="bg-beige" style="width: 25%;">Special Instructions / Notes:</td>
              <td style="width: 55%; height: 35px;">${safeCoc.specialInstructions}</td>
              <td class="bg-beige" style="width: 10%;">Total Samples:</td>
              <td class="text-center bold" style="width: 10%; font-size: 12px;">${samples.length}</td>
            </tr>
          </table>

          <!-- Signatures Footer -->
          <table>
            <tr>
              <td class="bg-beige" style="width: 20%;">Relinquished by (Sampler):</td>
              <td style="width: 30%; height: 38px; vertical-align: middle;">
                ${relinquishedSigHtml || safeCoc.sampledBy}
              </td>
              <td class="bg-beige" style="width: 15%;">Date / Time:</td>
              <td style="width: 35%; vertical-align: middle;">
                ${safeCoc.samplingDate} ${safeCoc.samplingTime}
              </td>
            </tr>
            <tr>
              <td class="bg-beige">Received by (Courier / Lab):</td>
              <td style="height: 38px; vertical-align: middle;">
                ${signatureHtml}
              </td>
              <td class="bg-beige">Date / Time:</td>
              <td style="vertical-align: middle;">
                ${safeCoc.samplingDate} ${safeCoc.samplingTime}
              </td>
            </tr>
          </table>

          <div style="text-align: right; margin-top: 6px; font-size: 10px; font-weight: bold;">
            PAGE ${page + 1} of ${totalPages}
          </div>
        </div>
      `;
    }

    const html = `
      <html>
        <head>
          <style>
            @page {
              margin: 8mm;
              size: portrait;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              margin: 0;
              padding: 0;
              color: #111;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
            }
            th, td {
              border: 1px solid black;
              padding: 3px 5px;
              vertical-align: top;
            }
            .bg-beige {
              background-color: #efece1;
              font-weight: bold;
              width: 15%;
            }
            .bg-teal {
              background-color: #bde4e4;
              font-weight: bold;
              text-align: center;
              font-size: 11px;
              padding: 5px;
            }
            .text-center {
              text-align: center;
            }
            .bold {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        alert('Please allow popups for this site to preview the PDF.');
      }
      return null;
    }

    // On Mobile (iOS / Android): compile PDF cleanly with Print
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return uri;
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return null;
  }
};
