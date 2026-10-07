import { CompraDetalle } from '../models/compra.model';

/**
 * Genera y descarga un PDF del ticket sin dependencias npm.
 * Solo ASCII (Helvetica Type1 no soporta tildes ni guiones tipográficos).
 */
export async function descargarTicketPdf(detalle: CompraDetalle): Promise<void> {
  const { compra, carrito, codigoManual } = detalle;
  const pelicula = carrito.funcion.peliculas;
  const funcion = carrito.funcion;

  const fechaFuncion = new Date(funcion.fecha_hora_inicio);
  // Fecha en partes ASCII (evita espacios no separables de toLocaleString)
  const fechaStr = formatFechaAscii(fechaFuncion);

  const butacas = carrito.lineasEntrada
    .map((l) => `${l.butaca.fila}${l.butaca.columna}`)
    .join(', ');

  const candy =
    carrito.lineasCandy.length > 0
      ? carrito.lineasCandy.map((l) => `${l.cantidad}x ${l.producto.nombre}`).join(' / ')
      : '-';

  // Formato manual: evita simbolos raros de Intl (NBSP, etc.)
  const totalStr = `$ ${Math.round(compra.total)}`;

  const sep = '--------------------------------';

  const lineas: string[] = [
    'CINE APP - TICKET DE ENTRADA',
    sep,
    `Pelicula: ${pelicula?.nombre ?? '-'}`,
    `Sala: ${funcion.salas.nombre}`,
    `Fecha: ${fechaStr}`,
    `Formato: ${funcion.formato} - ${funcion.idioma === 'castellano' ? 'Castellano' : 'Subtitulada'}`,
    `Butacas: ${butacas}`,
    `Candy: ${candy}`,
    `Total: ${totalStr}`,
    compra.puntos_otorgados > 0 ? `Puntos: +${compra.puntos_otorgados}` : '',
    sep,
    `Codigo QR: ${compra.codigo_qr}`,
    `Codigo manual: ${codigoManual}`,
    sep,
    'Presenta este ticket o el QR en la entrada.',
    'Cancelacion hasta 2 hs antes (credito a favor).',
    'Documento simulado - sin valor fiscal.',
  ].filter((l) => l !== '');

  const pdfBytes = buildSimplePdf(lineas, {
    title: 'Ticket Cine App',
    subject: compra.codigo_qr,
  });

  // Copia a ArrayBuffer para compatibilidad con Blob tipado
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  const pdfView = new Uint8Array(pdfBuffer);
  pdfView.set(pdfBytes);

  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${codigoManual}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatFechaAscii(d: Date): string {
  const dia = DIAS[d.getDay()];
  const num = d.getDate();
  const mes = MESES[d.getMonth()];
  const anio = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia} ${num} de ${mes} de ${anio}, ${hh}:${mm}`;
}

/** Mapea caracteres tipográficos comunes a ASCII antes de filtrar. */
function toPdfAscii(s: string): string {
  const map: Record<string, string> = {
    '—': '-',
    '–': '-',
    '‑': '-',
    '‒': '-',
    '―': '-',
    '·': '/',
    '•': '*',
    '…': '...',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '´': "'",
    '¨': '',
    '¡': '!',
    '¿': '?',
    '°': 'o',
    '×': 'x',
    '÷': '/',
    '\u00A0': ' ', // NBSP
    '\u202F': ' ', // narrow NBSP
    '\u2009': ' ', // thin space
    '\u2007': ' ', // figure space
    'Á': 'A',
    'É': 'E',
    'Í': 'I',
    'Ó': 'O',
    'Ú': 'U',
    'Ü': 'U',
    'Ñ': 'N',
    'á': 'a',
    'é': 'e',
    'í': 'i',
    'ó': 'o',
    'ú': 'u',
    'ü': 'u',
    'ñ': 'n',
  };

  let out = '';
  for (const ch of s) {
    if (map[ch] !== undefined) {
      out += map[ch];
    } else if (ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7e) {
      out += ch;
    } else {
      // Quitar diacríticos restantes (NFD)
      const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (base.length === 1 && base.charCodeAt(0) >= 0x20 && base.charCodeAt(0) <= 0x7e) {
        out += base;
      } else {
        out += ' ';
      }
    }
  }
  return out.replace(/  +/g, ' ').trimEnd();
}

function escPdf(s: string): string {
  return toPdfAscii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Construye un PDF 1.4 mínimo con texto en Helvetica. */
function buildSimplePdf(lines: string[], meta: { title: string; subject: string }): Uint8Array {
  const pageWidth = 420;
  const pageHeight = 595;
  const margin = 40;
  const fontSize = 11;
  const lineHeight = 16;
  const startY = pageHeight - margin - 20;

  const textOps: string[] = [];
  textOps.push('BT');
  textOps.push(`/F1 ${fontSize} Tf`);
  textOps.push(`${margin} ${startY} Td`);

  lines.forEach((line, i) => {
    if (i === 0) {
      textOps.push('/F1 14 Tf');
      textOps.push(`(${escPdf(line)}) Tj`);
      textOps.push(`/F1 ${fontSize} Tf`);
    } else {
      textOps.push(`0 -${lineHeight} Td`);
      textOps.push(`(${escPdf(line)}) Tj`);
    }
  });
  textOps.push('ET');

  const content = textOps.join('\n');

  // Todo el PDF se arma como string Latin-1 seguro (solo ASCII)
  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
  );
  objects.push(
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push(
    `6 0 obj\n<< /Title (${escPdf(meta.title)}) /Subject (${escPdf(meta.subject)}) /Producer (Cine App) >>\nendobj\n`,
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  // Latin-1: cada char = 1 byte (contenido ya es ASCII)
  const out = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    out[i] = pdf.charCodeAt(i) & 0xff;
  }
  return out;
}
