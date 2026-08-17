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

    const maxSamplesPerPage = 15;
    const totalSamplePages = Math.max(1, Math.ceil(samples.length / maxSamplesPerPage));
    
    const photos = cocData.photos || [];
    const maxPhotosPerPage = 8;
    const totalPhotoPages = photos.length > 0 ? Math.ceil(photos.length / maxPhotosPerPage) : 0;
    
    const grandTotalPages = totalSamplePages + totalPhotoPages;

    let pagesHtml = '';

    // ==========================================
    // 1. SAMPLE LOG PAGES (15 Samples per Page)
    // ==========================================
    for (let page = 0; page < totalSamplePages; page++) {
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

      const hasNextPage = (page < totalSamplePages - 1) || totalPhotoPages > 0;

      pagesHtml += `
        <div class="page" ${hasNextPage ? 'style="page-break-after: always;"' : ''}>
          <!-- Header Logos -->
          <table style="margin-bottom: -1px;">
            <tr>
              <td class="bg-beige" style="width: 15%;">Company name</td>
              <td style="width: 85%; vertical-align: middle; padding: 6px 12px;">
                <img src="${lynkoLogoBase64}" style="max-height: 46px; display: block;" />
              </td>
            </tr>
          </table>

          <!-- Project & Contact Info -->
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
              <td class="bg-beige" style="width: 50%; height: 50px;">
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
              <td class="bg-beige" style="height: 50px;">
                Relinquished By Signature:<br>
                ${relinquishedSigHtml}
              </td>
              <td style="padding: 6px;">
                By signing this document, you certify that these samples were not tampered with while under your care.
              </td>
            </tr>
          </table>
          
          <div style="text-align: right; margin-top: 5px; font-size: 10px; font-weight: bold;">
            PAGE ${page + 1} of ${grandTotalPages}
          </div>
        </div>
      `;
    }

    // ==========================================
    // 2. PHOTO APPENDIX PAGES (8 Photos per Page)
    // ==========================================
    for (let pPage = 0; pPage < totalPhotoPages; pPage++) {
      const pStartIndex = pPage * maxPhotosPerPage;
      const currentPagePhotos = photos.slice(pStartIndex, pStartIndex + maxPhotosPerPage);
      
      let photoGridHtml = '';
      for (let i = 0; i < maxPhotosPerPage; i++) {
        const photoUri = currentPagePhotos[i];
        const photoNum = pStartIndex + i + 1;
        
        if (photoUri) {
          photoGridHtml += `
            <div class="photo-cell">
              <div class="photo-frame">
                <img src="${photoUri}" class="photo-img" />
              </div>
              <div class="photo-label">Photo #${photoNum}</div>
            </div>
          `;
        } else {
          photoGridHtml += `
            <div class="photo-cell empty-photo-cell">
              <div class="empty-frame"></div>
              <div class="photo-label">&nbsp;</div>
            </div>
          `;
        }
      }

      const isLastPhotoPage = pPage === totalPhotoPages - 1;

      pagesHtml += `
        <div class="page" ${!isLastPhotoPage ? 'style="page-break-after: always;"' : ''}>
          <!-- Header -->
          <table style="margin-bottom: 6px;">
            <tr>
              <td class="bg-beige" style="width: 15%;">Company Name</td>
              <td style="width: 45%; vertical-align: middle; padding: 6px 12px;">
                <img src="${lynkoLogoBase64}" style="max-height: 40px; display: block;" />
              </td>
              <td class="bg-teal text-center" style="font-size: 13px; font-weight: bold;">
                PROJECT & SITE PHOTOS APPENDIX
              </td>
            </tr>
          </table>

          <!-- Project Context Bar -->
          <table style="margin-bottom: 8px;">
            <tr>
              <td class="bg-beige" style="width: 15%;">Project Name</td>
              <td>${safeCoc.description}</td>
              <td class="bg-beige" style="width: 15%;">PO #</td>
              <td>${safeCoc.poNumber}</td>
              <td class="bg-beige" style="width: 15%;">Date</td>
              <td>${safeCoc.samplingDate}</td>
            </tr>
          </table>

          <!-- 8-Image Grid (2 columns x 4 rows) -->
          <div class="photo-grid-container">
            ${photoGridHtml}
          </div>

          <div style="text-align: right; margin-top: 6px; font-size: 10px; font-weight: bold;">
            PAGE ${totalSamplePages + pPage + 1} of ${grandTotalPages}
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
            .photo-grid-container {
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;
              width: 100%;
              border: 1px solid black;
              padding: 4px;
              box-sizing: border-box;
            }
            .photo-cell {
              width: 48.5%;
              height: 195px;
              margin-bottom: 6px;
              border: 1px solid #999;
              background-color: #fafafa;
              padding: 3px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .empty-photo-cell {
              border: 1px dashed #ccc;
              background-color: #fdfdfd;
            }
            .photo-frame {
              width: 100%;
              height: 170px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              background-color: #eee;
            }
            .empty-frame {
              width: 100%;
              height: 170px;
            }
            .photo-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-label {
              margin-top: 2px;
              font-size: 9px;
              font-weight: bold;
              color: #333;
              text-align: center;
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
