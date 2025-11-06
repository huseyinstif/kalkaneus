import { PATTERNS } from '../constants';

/**
 * Validation utilities
 */

export const validators = {
  /**
   * Validate URL
   */
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate email
   */
  isValidEmail: (email) => {
    return PATTERNS.EMAIL.test(email);
  },

  /**
   * Validate IP address
   */
  isValidIP: (ip) => {
    return PATTERNS.IP.test(ip);
  },

  /**
   * Validate port number
   */
  isValidPort: (port) => {
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  },

  /**
   * Validate required field
   */
  isRequired: (value) => {
    return value !== null && value !== undefined && value !== '';
  },

  /**
   * Validate min length
   */
  minLength: (value, min) => {
    return value && value.length >= min;
  },

  /**
   * Validate max length
   */
  maxLength: (value, max) => {
    return value && value.length <= max;
  },

  /**
   * Validate number range
   */
  inRange: (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Validate regex pattern
   */
  matchesPattern: (value, pattern) => {
    return pattern.test(value);
  },
};

/**
 * Form validation helper
 */
export class FormValidator {
  constructor(rules) {
    this.rules = rules;
    this.errors = {};
  }

  validate(data) {
    this.errors = {};

    for (const [field, fieldRules] of Object.entries(this.rules)) {
      const value = data[field];

      for (const rule of fieldRules) {
        const { validator, message, ...params } = rule;

        if (!validator(value, params)) {
          if (!this.errors[field]) {
            this.errors[field] = [];
          }
          this.errors[field].push(message);
        }
      }
    }

    return {
      isValid: Object.keys(this.errors).length === 0,
      errors: this.errors,
    };
  }

  getErrors() {
    return this.errors;
  }

  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }
}

/**
 * Sanitize input
 */
export const sanitize = {
  /**
   * Remove HTML tags
   */
  stripHtml: (html) => {
    return html.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape HTML entities
   */
  escapeHtml: (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  /**
   * Trim whitespace
   */
  trim: (text) => {
    return text.trim();
  },

  /**
   * Remove special characters
   */
  alphanumeric: (text) => {
    return text.replace(/[^a-zA-Z0-9]/g, '');
  },
};
