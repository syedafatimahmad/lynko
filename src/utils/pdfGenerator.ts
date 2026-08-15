import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
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
      ? `<img src="${cocData.inspectorSignature}" style="max-height: 40px; margin-left: 10px;"/>`
      : '';
      
    const relinquishedSigHtml = cocData.relinquishedBySignature 
      ? `<img src="${cocData.relinquishedBySignature}" style="max-height: 40px; margin-left: 10px;"/>`
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
      accountInfo: escapeHtml(cocData.accountInfo),
      specialInstructions: escapeHtml(cocData.specialInstructions),
    };

    const maxRows = 15;
    const totalPages = Math.max(1, Math.ceil(samples.length / maxRows));

    let pagesHtml = '';

    for (let page = 0; page < totalPages; page++) {
      const startIndex = page * maxRows;
      let rowsHtml = '';
      
      for (let i = 0; i < maxRows; i++) {
        const s = samples[startIndex + i];
        if (s) {
          const safeName = escapeHtml(s.name.replace('Sample ID ', ''));
          const safeDesc = escapeHtml(s.description || '');
          const safeNotes = escapeHtml(s.notes || '');
          const safeProp = escapeHtml(s.property || '');
          const safeMeas = escapeHtml(s.measurement || '');
          
          rowsHtml += `
            <tr>
              <td class="text-center">${safeName}</td>
              <td>${safeDesc}${safeNotes ? `<br><i>Note: ${safeNotes}</i>` : ''}</td>
              <td class="text-center">${safeProp}</td>
              <td class="text-center">${safeMeas}</td>
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

      pagesHtml += `
        <div class="page" ${page < totalPages - 1 ? 'style="page-break-after: always;"' : ''}>
          <!-- Header Logos -->
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="bg-beige">Company name</td>
              <td style="width: 35%;">
                <img src="${lynkoLogoBase64}" style="max-height: 50px;" /><br>
                <a href="https://alphaenvironmental.us/">https://alphaenvironmental.us/</a><br>
                info@alphaenvironmental.us<br>
                214-994-9874
              </td>
              <td colspan="4" style="text-align: right; padding-right: 15px;">
                <!-- Blank Top Right -->
              </td>
            </tr>
          </table>

          <!-- Project & Contact Info (App Data) -->
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="bg-beige">Project Name</td>
              <td style="width: 35%;">${safeCoc.description}</td>
              <td class="bg-beige">Account Info</td>
              <td>${safeCoc.accountInfo}</td>
            </tr>
            <tr>
              <td class="bg-beige">Project Address</td>
              <td>${safeCoc.zipCode}</td>
              <td class="bg-beige">Contact Name</td>
              <td>${safeCoc.contactName}</td>
            </tr>
            <tr>
              <td class="bg-beige">Project # (PO)</td>
              <td>${safeCoc.poNumber}</td>
              <td class="bg-beige">Contact Address</td>
              <td>${safeCoc.contactAddress}</td>
            </tr>
            <tr>
              <td class="bg-beige">Sample Date</td>
              <td>${safeCoc.samplingDate}</td>
              <td class="bg-beige">Contact Phone</td>
              <td colspan="2">${safeCoc.contactPhone}</td>
            </tr>
            <tr>
              <td class="bg-beige">Sampled By</td>
              <td>${safeCoc.sampledBy}</td>
              <td colspan="3"></td>
            </tr>
          </table>

          <!-- Teal Section Header -->
          <table>
            <tr>
              <td colspan="6" class="bg-teal">SAMPLES LOG</td>
            </tr>
            <tr>
              <td class="bg-beige text-center" style="width: 10%;">Sample ID</td>
              <td class="bg-beige text-center" style="width: 40%;">Description & Notes</td>
              <td class="bg-beige text-center" style="width: 15%;">Property</td>
              <td class="bg-beige text-center" style="width: 15%;">Measurement</td>
              <td class="bg-beige text-center" style="width: 10%;">Analysis 1</td>
              <td class="bg-beige text-center" style="width: 10%;">Analysis 2</td>
            </tr>
            ${rowsHtml}
          </table>

          <!-- Footer Section -->
          <table style="margin-top: -1px;">
            <tr>
              <td class="bg-beige" style="width: 50%; height: 60px;">
                Special Instructions:<br>
                <span style="font-weight: normal;">${safeCoc.specialInstructions}</span>
              </td>
              <td style="width: 50%;">
                Inspector Signature:<br>
                ${signatureHtml}<br>
                <div style="text-align: right; margin-top: -15px;">
                  Time: <u>&nbsp;${safeCoc.samplingTime || '__________'}&nbsp;</u>
                </div>
              </td>
            </tr>
            <tr>
              <td class="bg-beige" style="height: 60px;">
                Relinquished By Signature:<br>
                ${relinquishedSigHtml}
              </td>
              <td style="padding: 10px;">
                By signing this document, you certify that these samples were not tampered with while under your care.
              </td>
            </tr>
          </table>
          
          <div style="text-align: right; margin-top: 5px; font-size: 10px;">
            PAGE ${page + 1} of ${totalPages}
          </div>
        </div>
      `;
    }

    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              margin: 0;
              padding: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
            }
            th, td {
              border: 1px solid black;
              padding: 4px 6px;
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
              font-size: 12px;
              padding: 6px;
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

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return uri;
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Error: ' + (error.message || error.toString()));
    return null;
  }
};
