/**
 * Extract clean Identification (Register Number, Staff ID, Security ID)
 * from direct numbers, college portal URLs (e.g., ms.ritchennai.edu.in),
 * formatted ID card text, or JSON payloads.
 */
export function extractIdentificationFromQR(rawText?: string): string {
  if (!rawText || typeof rawText !== 'string') return '';
  const text = rawText.trim();
  if (!text) return '';

  // 1. Direct JSON payload check
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const data = JSON.parse(text);
      const val = data.regNo || data.registerNumber || data.rollNo || data.roll_no || data.id || data.studentId || data.staffCode || data.hodCode || data.hrCode || data.securityId;
      if (val) return String(val).trim().toUpperCase();
    } catch {}
  }

  // 2. URL parsing (e.g., https://ms.ritchennai.edu.in/... or any verification link)
  if (text.startsWith('http://') || text.startsWith('https://') || text.includes('ms.ritchennai.edu.in') || text.includes('?') || text.includes('/')) {
    try {
      const urlStr = text.startsWith('http') ? text : `https://${text}`;
      const url = new URL(urlStr);

      // Check standard query parameter names
      const queryKeys = [
        'regno', 'reg_no', 'regNo',
        'registernumber', 'register_number', 'registerNumber',
        'rollno', 'roll_no', 'rollNo',
        'id', 'studentid', 'student_id', 'studentId',
        'staffcode', 'staff_code', 'staffCode',
        'code', 'user', 'userid', 'user_id'
      ];

      for (const key of queryKeys) {
        const val = url.searchParams.get(key);
        if (val && val.trim()) {
          return val.trim().toUpperCase();
        }
      }

      // Check URL Path segments: e.g. /student/2117250020454 or /2117250020454
      const pathSegments = url.pathname.split('/').filter(Boolean);
      for (let i = pathSegments.length - 1; i >= 0; i--) {
        const seg = pathSegments[i].trim();
        // RIT Register Number pattern (starts with 2117 followed by digits)
        if (/^2117\d{7,10}$/i.test(seg)) {
          return seg.toUpperCase();
        }
        // General 8-16 digit student/staff ID
        if (/^\d{8,16}$/.test(seg)) {
          return seg;
        }
      }

      // Fallback regex on the entire URL string for RIT 2117... pattern
      const ritMatch = urlStr.match(/(2117\d{7,10})/i);
      if (ritMatch && ritMatch[1]) {
        return ritMatch[1].toUpperCase();
      }

      // Fallback for 10-14 digit register numbers in URL
      const digitMatch = urlStr.match(/[?&/=\-_]([0-9]{10,14})(?:[&/#]|$)/);
      if (digitMatch && digitMatch[1]) {
        return digitMatch[1];
      }
    } catch {}
  }

  // 3. Formatted Multiline Text (e.g. "Register Number:2117250020454" or "Reg No: 2117250020454")
  const labelPatterns = [
    /Register\s*Number\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /Reg\s*No\.?\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /Roll\s*No\.?\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /Student\s*ID\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /Staff\s*ID\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /Staff\s*Code\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /Security\s*ID\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
    /ID\s*[:=\-]?\s*([A-Za-z0-9]+)/i,
  ];

  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim().toUpperCase();
    }
  }

  // 4. Global RIT register number match in plain text
  const ritMatch = text.match(/\b(2117\d{7,10})\b/i);
  if (ritMatch && ritMatch[1]) {
    return ritMatch[1].toUpperCase();
  }

  // 5. Standard 10-14 digit register number in plain text
  const standardDigitMatch = text.match(/\b(\d{10,14})\b/);
  if (standardDigitMatch && standardDigitMatch[1]) {
    return standardDigitMatch[1];
  }

  // 6. Direct clean code (e.g., 2117240030049, STF001, SEC001, HOD_CSE)
  const singleLine = text.split('\n')[0].trim();
  return singleLine.toUpperCase();
}
