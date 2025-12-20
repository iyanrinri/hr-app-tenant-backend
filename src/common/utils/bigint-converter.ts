import { Prisma } from '@prisma/client';

/**
 * Converts BigInt and Prisma Decimal types to strings for JSON serialization
 * @param obj - The object to convert
 * @returns The converted object with all BigInt and Decimal values as strings
 */
export function convertBigIntAndDecimalToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  // Handle BigInt type
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle Prisma Decimal type
  if (obj instanceof Prisma.Decimal) {
    return obj.toString();
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntAndDecimalToString(item));
  }
  
  // Handle plain objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertBigIntAndDecimalToString(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}
