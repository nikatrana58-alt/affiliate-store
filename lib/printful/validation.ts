/**
 * lib/printful/validation.ts
 *
 * Production Zod validation schemas for Printful API endpoints, order submission,
 * shipping estimates, mockup tasks, and webhooks.
 */

import { z } from "zod";

export const PrintfulRecipientSchema = z.object({
  name: z.string().min(1, "Recipient name is required"),
  company: z.string().optional(),
  address1: z.string().min(1, "Address line 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state_code: z.string().min(1, "State code is required"),
  state_name: z.string().optional(),
  country_code: z.string().length(2, "Country code must be a 2-letter ISO code"),
  country_name: z.string().optional(),
  zip: z.string().min(1, "Postal / ZIP code is required"),
  phone: z.string().optional(),
  email: z.string().email("Valid recipient email is required"),
});

export const PrintfulOrderItemSchema = z.object({
  sync_variant_id: z.number().optional(),
  variant_id: z.number().optional(),
  external_variant_id: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  price: z.string().optional(),
  retail_price: z.string().optional(),
  name: z.string().optional(),
});

export const PrintfulOrderInputSchema = z.object({
  external_id: z.string().optional(),
  shipping: z.string().optional(),
  recipient: PrintfulRecipientSchema,
  items: z.array(PrintfulOrderItemSchema).min(1, "At least one item is required in the order"),
  notes: z.string().optional(),
});

export const PrintfulShippingRateInputSchema = z.object({
  recipient: PrintfulRecipientSchema,
  items: z.array(
    z.object({
      variant_id: z.number().optional(),
      sync_variant_id: z.number().optional(),
      quantity: z.number().int().positive("Quantity must be greater than 0"),
      value: z.string().optional(),
    })
  ).min(1, "At least one item is required to calculate shipping"),
  currency: z.string().optional(),
});

export const PrintfulMockupTaskInputSchema = z.object({
  product_id: z.union([z.number(), z.string()]),
  variant_ids: z.array(z.number()).min(1, "At least one variant ID is required for mockup generation"),
  format: z.enum(["jpg", "png"]).optional().default("png"),
  files: z.array(
    z.object({
      placement: z.string().min(1, "File placement is required"),
      image_url: z.string().url("Valid image URL is required"),
    })
  ).min(1, "At least one design file is required"),
});

export const PrintfulProductSearchSchema = z.object({
  category_id: z.coerce.number().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const PrintfulSyncProductInputSchema = z.object({
  sync_product_id: z.number().int().positive("Valid Printful sync product ID is required"),
  markup_percent: z.number().min(0).optional().default(40),
});

export type PrintfulRecipientInput = z.infer<typeof PrintfulRecipientSchema>;
export type PrintfulOrderValidationInput = z.infer<typeof PrintfulOrderInputSchema>;
export type PrintfulShippingRateValidationInput = z.infer<typeof PrintfulShippingRateInputSchema>;
export type PrintfulMockupTaskValidationInput = z.infer<typeof PrintfulMockupTaskInputSchema>;
