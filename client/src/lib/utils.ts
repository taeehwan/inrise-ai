import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ',
  'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ',
  'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
  't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'z': 'ᶻ',
  '/': 'ᐟ', ' ': ' '
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ'
};

function toSuperscript(text: string): string {
  return text.split('').map(c => SUPERSCRIPTS[c.toLowerCase()] || c).join('');
}

function toSubscript(text: string): string {
  return text.split('').map(c => SUBSCRIPTS[c.toLowerCase()] || c).join('');
}

function formatFraction(numerator: string, denominator: string): string {
  const superNums: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻'
  };
  const subNums: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '-': '₋'
  };
  
  const supNum = numerator.split('').map(c => superNums[c] || c).join('');
  const subDen = denominator.split('').map(c => subNums[c] || c).join('');
  
  return supNum + '⁄' + subDen;
}

export function formatMathText(text: string): string {
  if (!text) return '';
  
  let formatted = text;
  
  formatted = formatted.replace(/\^{([^}]+)}/g, (_, exp) => toSuperscript(exp));
  formatted = formatted.replace(/\^\(([^)]+)\)/g, (_, exp) => toSuperscript(exp));
  
  formatted = formatted.replace(/\^(\d+)/g, (_, exp) => toSuperscript(exp));
  formatted = formatted.replace(/\^([a-zA-Z])/g, (_, exp) => toSuperscript(exp));
  formatted = formatted.replace(/\^-(\d+)/g, (_, exp) => '⁻' + toSuperscript(exp));
  
  formatted = formatted.replace(/_\{([^}]+)\}/g, (_, sub) => toSubscript(sub));
  formatted = formatted.replace(/_\(([^)]+)\)/g, (_, sub) => toSubscript(sub));
  formatted = formatted.replace(/_(\d)/g, (_, sub) => toSubscript(sub));
  formatted = formatted.replace(/_([a-zA-Z])/g, (_, sub) => toSubscript(sub));
  
  formatted = formatted.replace(/(\d+)\/(\d+)/g, (match, num, den) => {
    if (parseInt(num) <= 99 && parseInt(den) <= 99) {
      return formatFraction(num, den);
    }
    return match;
  });
  
  formatted = formatted.replace(/sqrt\(([^)]+)\)/gi, '√($1)');
  formatted = formatted.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  
  formatted = formatted.replace(/\*\*/g, '^');
  formatted = formatted.replace(/\*/g, '×');
  
  formatted = formatted.replace(/\\pi/g, 'π');
  formatted = formatted.replace(/\\infty/g, '∞');
  formatted = formatted.replace(/<=/g, '≤');
  formatted = formatted.replace(/>=/g, '≥');
  formatted = formatted.replace(/!=/g, '≠');
  formatted = formatted.replace(/\+-/g, '±');
  
  return formatted;
}
