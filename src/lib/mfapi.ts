// MFAPI.in API Client
// Documentation: https://www.mfapi.in/docs/

const BASE_URL = 'https://api.mfapi.in';

// Types
export interface MutualFundScheme {
    schemeCode: number;
    schemeName: string;
}

export interface SchemeMetadata {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
    isin_growth: string | null;
    isin_div_reinvestment: string | null;
}

export interface NAVData {
    date: string;
    nav: string;
}

export interface SchemeLatestResponse {
    meta: SchemeMetadata;
    data: NAVData[];
    status: string;
}

export interface SchemeHistoryResponse {
    meta: SchemeMetadata;
    data: NAVData[];
    status: string;
}

// API Functions

/**
 * Get all mutual fund schemes with pagination
 */
export async function getAllSchemes(
    limit: number = 100,
    offset: number = 0
): Promise<MutualFundScheme[]> {
    const response = await fetch(
        `${BASE_URL}/mf?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
        throw new Error('Failed to fetch schemes');
    }
    return response.json();
}

/**
 * Search mutual fund schemes by name
 */
export async function searchSchemes(query: string): Promise<MutualFundScheme[]> {
    if (!query.trim()) {
        return [];
    }
    const response = await fetch(
        `${BASE_URL}/mf/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
        throw new Error('Failed to search schemes');
    }
    return response.json();
}

/**
 * Get latest NAV for a specific scheme
 */
export async function getSchemeLatestNAV(
    schemeCode: number
): Promise<SchemeLatestResponse> {
    const response = await fetch(`${BASE_URL}/mf/${schemeCode}/latest`);
    if (!response.ok) {
        throw new Error('Failed to fetch latest NAV');
    }
    return response.json();
}

/**
 * Get NAV history for a specific scheme
 */
export async function getSchemeHistory(
    schemeCode: number,
    startDate?: string,
    endDate?: string
): Promise<SchemeHistoryResponse> {
    let url = `${BASE_URL}/mf/${schemeCode}`;
    const params = new URLSearchParams();

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch scheme history');
    }
    return response.json();
}

/**
 * Helper to format NAV as currency
 */
export function formatNAV(nav: string): string {
    return `₹${parseFloat(nav).toFixed(2)}`;
}

/**
 * Helper to parse date from API format (DD-MM-YYYY) to Date object
 */
export function parseAPIDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Helper to calculate percentage change between two NAV values
 */
export function calculateChange(currentNav: string, previousNav: string): number {
    const current = parseFloat(currentNav);
    const previous = parseFloat(previousNav);
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}
