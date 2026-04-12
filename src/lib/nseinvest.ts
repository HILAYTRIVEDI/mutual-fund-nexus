/**
 * NSE Invest API client
 * Handles AES-128-CBC authentication and API calls to NSE's mutual fund platform.
 *
 * Auth flow (matches AESUtil.java + Demo.java from NSE):
 *   1. Generate random 16-byte IV and salt
 *   2. plain_text = api_secret_user + "|" + random_number
 *   3. key = PBKDF2(passphrase=api_key_member, salt, iterations=1000, keyLen=16, hash=SHA-1)
 *   4. ciphertext = AES-128-CBC(key, IV, plain_text) → Base64
 *   5. aesPassword = iv_hex + "::" + salt_hex + "::" + ciphertext_base64
 *   6. encrypted_password = Base64(aesPassword)
 *   7. HTTP Basic Auth: username=login_user_id, password=encrypted_password
 */

import crypto from 'crypto';

const NSE_BASE_URL = process.env.NSE_BASE_URL ?? 'https://nseinvestuat.nseindia.com';
const LOGIN_USER_ID = process.env.NSE_LOGIN_USER_ID ?? 'ADMIN';
// api_key_member — PBKDF2 passphrase
const API_KEY_MEMBER = process.env.NSE_MEMBER_API_KEY ?? '';
// api_secret_user — plaintext component embedded in the encrypted password
const API_SECRET_USER = process.env.NSE_API_SECRET_KEY ?? '';
const MEMBER_CODE = process.env.NSE_MEMBER_CODE ?? '';

/**
 * Generate the AES-encrypted password required by NSE Invest API.
 * Mirrors the Postman pre-request script and AESUtil.java exactly.
 */
function generateEncryptedPassword(): string {
    // Step 1: Random 16-byte IV and salt
    const ivBytes = crypto.randomBytes(16);
    const saltBytes = crypto.randomBytes(16);
    const ivHex = ivBytes.toString('hex');
    const saltHex = saltBytes.toString('hex');

    // Step 2: Plain-text payload
    const randomNumber = Math.floor(Math.random() * 1_000_000_000);
    const plainText = `${API_SECRET_USER}|${randomNumber}`;

    // Step 3: Derive 128-bit key via PBKDF2-HMAC-SHA1 (1000 iterations, 16-byte key)
    // Salt must be the raw 16 bytes (saltBytes), NOT the UTF-8 encoding of the hex string.
    // Java: Hex.decodeHex(salt) → 16 bytes; Postman: CryptoJS.enc.Hex.parse(salt) → 16 bytes.
    const key = crypto.pbkdf2Sync(
        Buffer.from(API_KEY_MEMBER, 'utf8'),
        saltBytes, // 16 raw bytes — matches Java Hex.decodeHex(salt) and Postman CryptoJS.enc.Hex.parse
        1000,
        16,
        'sha1'
    );

    // Step 4: AES-128-CBC encrypt
    const cipher = crypto.createCipheriv('aes-128-cbc', key, ivBytes);
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Step 5 & 6: Compose and Base64-encode
    const aesPassword = `${ivHex}::${saltHex}::${encrypted}`;
    return Buffer.from(aesPassword, 'utf8').toString('base64');
}

function buildHeaders(): Record<string, string> {
    const encryptedPassword = generateEncryptedPassword();
    const basicToken = Buffer.from(`${LOGIN_USER_ID}:${encryptedPassword}`, 'utf8').toString('base64');

    return {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json',
        Accept: '*/*',                    // NSE/Akamai requires */* — application/json triggers bot-block
        'Accept-Language': 'en-US',
        Connection: 'keep-alive',         // Required per NSE integration email
        Referer: 'www.google.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        memberId: MEMBER_CODE,
    };
}

async function nsePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${NSE_BASE_URL}${path}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`NSE API ${path} failed [${response.status}]: ${text}`);
    }

    return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export interface NSEAllotmentRecord {
    order_id: string;
    scheme_code: string;
    allotted_nav: number;
    allotted_units: number;
    allotment_date: string;
    amount: number;
    status: string;
}

/** Convert ISO date (YYYY-MM-DD) to the DD-MM-YYYY format NSE expects. */
function toNSEDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
}

/**
 * Fetch allotment statement for a list of NSE order IDs.
 * Returns authoritative allotted NAV and units from NSE.
 *
 * Dates may be supplied as YYYY-MM-DD (DB format) — they are converted
 * to DD-MM-YYYY before sending, as required by the NSE ALLOTMENT_STATEMENT API.
 */
export async function getAllotmentStatement(params: {
    order_ids: string[];
    from_date: string; // YYYY-MM-DD or DD-MM-YYYY — auto-normalised
    to_date: string;   // YYYY-MM-DD or DD-MM-YYYY — auto-normalised
    order_type?: string;
    sub_order_type?: string;
}): Promise<NSEAllotmentRecord[]> {
    // Normalise: if the date looks like YYYY-MM-DD, convert it
    const normalise = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) ? toNSEDate(d) : d;

    const data = await nsePost<{ data: NSEAllotmentRecord[] }>(
        '/nsemfdesk/api/v2/reports/ALLOTMENT_STATEMENT',
        {
            order_ids: params.order_ids,
            from_date: normalise(params.from_date),
            to_date: normalise(params.to_date),
            order_type: params.order_type ?? 'P',
            sub_order_type: params.sub_order_type ?? 'NORMAL',
        }
    );
    return data.data ?? [];
}

export interface NSEOrderStatus {
    order_id: string;
    status: string;
    allotted_nav: number | null;
    allotted_units: number | null;
    allotment_date: string | null;
}

/**
 * Fetch order status for one or more NSE order IDs.
 */
export async function getOrderStatus(orderIds: string[]): Promise<NSEOrderStatus[]> {
    const data = await nsePost<{ data: NSEOrderStatus[] }>(
        '/nsemfdesk/api/v2/reports/ORDER_STATUS',
        { order_ids: orderIds }
    );
    return data.data ?? [];
}

export interface NSESchemeNAV {
    scheme_code: string;
    nav: number;
    nav_date: string;
}

/**
 * Download scheme master / NAV data for one or more scheme codes.
 */
export async function getMasterNAV(schemeCodes: string[]): Promise<NSESchemeNAV[]> {
    const data = await nsePost<{ data: NSESchemeNAV[] }>(
        '/nsemfdesk/api/v2/reports/MASTER_DOWNLOAD',
        { scheme_codes: schemeCodes }
    );
    return data.data ?? [];
}
