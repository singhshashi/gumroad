// Social Proof Widget Template Variables
// This file defines the template variables that can be used in social proof widget content.
// Keep this synchronized with the backend constants in app/modules/social_proof_template_variables.rb

export type SocialProofTemplateVariable = {
  key: string;
  label: string;
  variable: string;
  description?: string;
};

export const SOCIAL_PROOF_TEMPLATE_VARIABLES: SocialProofTemplateVariable[] = [
  {
    key: "product_name",
    label: "Product",
    variable: "{{product_name}}",
    description: "The name of the product",
  },
  {
    key: "price",
    label: "Price",
    variable: "{{price}}",
    description: "The formatted price of the product",
  },
  {
    key: "total_sales",
    label: "Total sales",
    variable: "{{total_sales}}",
    description: "The total number of successful sales",
  },
  {
    key: "country",
    label: "Country",
    variable: "{{country}}",
    description: "Country of a recent customer",
  },
  {
    key: "customer_name",
    label: "Customer",
    variable: "{{customer_name}}",
    description: "Anonymized name of a recent customer",
  },
  {
    key: "recent_sale_time",
    label: "Recent sale",
    variable: "{{recent_sale_time}}",
    description: "Time since the most recent sale",
  },
];

// Helper function to get just the variable keys for validation
export const getAllowedTemplateVariableKeys = (): string[] => SOCIAL_PROOF_TEMPLATE_VARIABLES.map((v) => v.key);

// Helper function to get just the variable strings (e.g., "{{product_name}}")
export const getAllowedTemplateVariables = (): string[] => SOCIAL_PROOF_TEMPLATE_VARIABLES.map((v) => v.variable);
