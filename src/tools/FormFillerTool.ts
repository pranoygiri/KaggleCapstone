import { ToolResult } from '../types/index.js';
import { logger } from '../observability/logger.js';

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'radio';
  value?: any;
  required: boolean;
  options?: string[];
}

export interface FormData {
  formId: string;
  formUrl: string;
  fields: FormField[];
  userInputRequired: string[];
}

/**
 * Custom Tool: FormFillerTool
 * Auto-populates form fields using LLM extraction and stored user data
 */
export class FormFillerTool {
  name = 'form_filler';
  description = 'Auto-fills forms by extracting field requirements and populating with stored user data';

  private userProfile: Record<string, any>;

  constructor(userProfile?: Record<string, any>) {
    this.userProfile = userProfile || this.getDefaultUserProfile();
  }

  /**
   * Analyze a form and extract required fields
   */
  async analyzeForm(formUrl: string): Promise<ToolResult> {
    try {
      logger.info('FormFillerTool analyzing form', { formUrl });

      // Mock form analysis - in production would scrape form or use browser automation
      const formData = await this.extractFormStructure(formUrl);

      logger.info('Form analyzed', {
        formId: formData.formId,
        fieldCount: formData.fields.length,
        userInputRequired: formData.userInputRequired.length
      });

      return {
        success: true,
        data: formData
      };
    } catch (error) {
      logger.error('Form analysis failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fill a form with available data
   */
  async execute(params: {
    formUrl: string;
    additionalData?: Record<string, any>;
    autoSubmit?: boolean;
  }): Promise<ToolResult> {
    try {
      logger.info('FormFillerTool executing', { params });

      // Step 1: Analyze form
      const formAnalysis = await this.analyzeForm(params.formUrl);
      if (!formAnalysis.success) {
        return formAnalysis;
      }

      const formData = formAnalysis.data as FormData;

      // Step 2: Merge user profile with additional data
      const availableData = {
        ...this.userProfile,
        ...(params.additionalData || {})
      };

      // Step 3: Fill form fields
      const filledFields = await this.fillFields(formData.fields, availableData);

      // Step 4: Identify missing required fields
      const missingFields = filledFields
        .filter(f => f.required && !f.value)
        .map(f => f.name);

      logger.info('Form filling completed', {
        totalFields: filledFields.length,
        filledFields: filledFields.filter(f => f.value).length,
        missingFields: missingFields.length
      });

      return {
        success: true,
        data: {
          formId: formData.formId,
          filledFields,
          missingFields,
          readyForSubmission: missingFields.length === 0,
          autoSubmit: params.autoSubmit && missingFields.length === 0
        },
        metadata: {
          formUrl: params.formUrl
        }
      };
    } catch (error) {
      logger.error('FormFillerTool failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async extractFormStructure(formUrl: string): Promise<FormData> {
    // Mock implementation - in production would use Playwright/Puppeteer + LLM
    // Different mock forms based on URL

    if (formUrl.includes('dmv') || formUrl.includes('license')) {
      return {
        formId: 'dmv-license-renewal',
        formUrl,
        fields: [
          { name: 'firstName', type: 'text', required: true },
          { name: 'lastName', type: 'text', required: true },
          { name: 'dateOfBirth', type: 'date', required: true },
          { name: 'licenseNumber', type: 'text', required: true },
          { name: 'address', type: 'text', required: true },
          { name: 'city', type: 'text', required: true },
          { name: 'state', type: 'select', required: true, options: ['CA', 'NY', 'TX'] },
          { name: 'zipCode', type: 'text', required: true },
          { name: 'email', type: 'text', required: true },
          { name: 'phone', type: 'text', required: true }
        ],
        userInputRequired: []
      };
    } else if (formUrl.includes('insurance')) {
      return {
        formId: 'insurance-renewal',
        formUrl,
        fields: [
          { name: 'policyNumber', type: 'text', required: true },
          { name: 'fullName', type: 'text', required: true },
          { name: 'email', type: 'text', required: true },
          { name: 'phone', type: 'text', required: true },
          { name: 'vehicleVIN', type: 'text', required: true },
          { name: 'coverageLevel', type: 'select', required: true, options: ['Basic', 'Standard', 'Premium'] }
        ],
        userInputRequired: []
      };
    } else {
      return {
        formId: 'generic-form',
        formUrl,
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text', required: true }
        ],
        userInputRequired: []
      };
    }
  }

  private async fillFields(fields: FormField[], data: Record<string, any>): Promise<FormField[]> {
    // Use LLM to match field names to available data
    return fields.map(field => {
      // Simple matching - in production would use LLM for semantic matching
      const fieldNameVariations = this.getFieldNameVariations(field.name);

      for (const variation of fieldNameVariations) {
        if (data[variation] !== undefined) {
          return {
            ...field,
            value: data[variation]
          };
        }
      }

      return field;
    });
  }

  private getFieldNameVariations(fieldName: string): string[] {
    // Generate common variations of field names
    const variations = [fieldName];

    // Convert camelCase to snake_case
    const snakeCase = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    variations.push(snakeCase);

    // Add common prefixes
    variations.push(`user_${fieldName}`);
    variations.push(`contact_${fieldName}`);

    return variations;
  }

  private getDefaultUserProfile(): Record<string, any> {
    return {
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      dateOfBirth: '1990-01-15',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      licenseNumber: 'DL123456',
      policyNumber: 'POL-987654',
      vehicleVIN: '1HGBH41JXMN109186'
    };
  }

  /**
   * Tool definition for LLM to use
   */
  getToolDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          formUrl: {
            type: 'string',
            description: 'URL of the form to fill'
          },
          additionalData: {
            type: 'object',
            description: 'Additional data to use for filling the form'
          },
          autoSubmit: {
            type: 'boolean',
            description: 'Whether to automatically submit the form if all required fields are filled'
          }
        },
        required: ['formUrl']
      }
    };
  }
}
