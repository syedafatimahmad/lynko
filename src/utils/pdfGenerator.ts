import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
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

/**
 * Universal helper to convert any image URI (file://, content://, blob, or remote)
 * to a base64 data URI so expo-print / Web can render it 100% reliably.
 */
export const convertUriToBase64 = async (uri: string): Promise<string> => {
  if (!uri) return '';
  if (uri.startsWith('data:')) return uri;

  try {
    if (Platform.OS !== 'web' && FileSystem && typeof FileSystem.readAsStringAsync === 'function') {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      if (base64) {
        return `data:image/jpeg;base64,${base64}`;
      }
    }

    // Web fallback
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || uri);
      reader.onerror = () => resolve(uri);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('convertUriToBase64 notice:', err);
    return uri;
  }
};

export const generatePDF = async (project: Project | null, cocData: CoCData, samples: SampleItem[]) => {
  try {
    // 1. Convert signatures to base64 data URIs
    let signatureHtml = '';
    if (cocData.inspectorSignature) {
      const sigData = await convertUriToBase64(cocData.inspectorSignature);
      signatureHtml = `<img src="${sigData}" style="max-height: 40px; max-width: 160px; margin-left: 10px;"/>`;
    }

    let relinquishedSigHtml = '';
    if (cocData.relinquishedBySignature) {
      const sigData = await convertUriToBase64(cocData.relinquishedBySignature);
      relinquishedSigHtml = `<img src="${sigData}" style="max-height: 40px; max-width: 160px; margin-left: 10px;"/>`;
    }

    // 2. Convert all site photos to base64 data URIs
    const rawPhotos = cocData.photos || [];
    const base64Photos = await Promise.all(
      rawPhotos.map(async (p) => {
        try {
          return await convertUriToBase64(p);
        } catch {
          return p;
        }
      })
    );

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
      turnaround1: escapeHtml(cocData.turnaround1 || ''),
    };

    const maxSamplesPerPage = 15;
    const totalSamplePages = Math.max(1, Math.ceil(samples.length / maxSamplesPerPage));
    
    const maxPhotosPerPage = 8;
    const totalPhotoPages = base64Photos.length > 0 ? Math.ceil(base64Photos.length / maxPhotosPerPage) : 0;
    
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

      const hasNextPage = (page < totalSamplePages - 1) || totalPhotoPages > 0;

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
      const currentPagePhotos = base64Photos.slice(pStartIndex, pStartIndex + maxPhotosPerPage);
      
      let photoGridHtml = '';
      for (let i = 0; i < maxPhotosPerPage; i++) {
        const photoUri = currentPagePhotos[i];
        const photoNum = pStartIndex + i + 1;
        
        if (photoUri && photoUri.length > 50) {
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

    // On Native Mobile (iOS / Android): compile PDF with printToFileAsync
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    let finalUri = uri;
    try {
      const cleanPo = (cocData.poNumber || 'Draft').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetFilename = `ChainOfCustody_${cleanPo}_${Date.now()}.pdf`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      
      if (baseDir && typeof FileSystem.copyAsync === 'function') {
        const destUri = `${baseDir}${targetFilename}`;
        await FileSystem.copyAsync({
          from: uri,
          to: destUri,
        });
        finalUri = destUri;
      }
    } catch (copyErr) {
      finalUri = uri;
    }

    return finalUri;
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return null;
  }
};
