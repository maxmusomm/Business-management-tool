import {
  integer,
  pgTable,
  varchar,
  text,
  json,
  timestamp,
} from "drizzle-orm/pg-core";

// Invoices table
export const invoicesTable = pgTable("invoices", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  invoice_number: varchar({ length: 64 }).notNull().unique(),
  customer_id: integer(), // optional FK to users/customers table
  bill_to: json().notNull(), // JSON string of billing block
  from_info: json().notNull(), // JSON string of sender block
  project: varchar({ length: 255 }),
  issued_at: varchar({ length: 64 }).notNull(), // ISO date string
  due_at: varchar({ length: 64 }),
  payment_terms: varchar({ length: 128 }),
  subtotal_cents: integer(),
  tax_cents: integer(),
  total_cents: integer(),
  currency: varchar({ length: 3 }).notNull().default("USD"),
  status: varchar({ length: 32 }).notNull().default("draft"),
  paid_at: varchar({ length: 64 }),
  paid_amount_cents: integer(),
  line_item_count: integer(),
  notes: text(),
  metadata: json(), // JSON string for flexibility
  created_by: integer(),
  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});

// Quotations table
export const quotationsTable = pgTable("quotations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  quotation_number: varchar({ length: 64 }).notNull().unique(),
  customer_id: integer(),
  bill_to: json().notNull(),
  from_info: json().notNull(),
  project: varchar({ length: 255 }),
  issued_at: varchar({ length: 64 }).notNull(),
  valid_until: varchar({ length: 64 }),
  payment_terms: varchar({ length: 128 }),
  subtotal_cents: integer(),
  tax_cents: integer(),
  total_cents: integer(),
  currency: varchar({ length: 3 }).notNull().default("USD"),
  status: varchar({ length: 32 }).notNull().default("draft"),
  accepted_at: varchar({ length: 64 }),
  line_item_count: integer(),
  notes: text(),
  metadata: json(),
  created_by: integer(),
  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
