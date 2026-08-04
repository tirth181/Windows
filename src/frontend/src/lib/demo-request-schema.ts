import { z } from "zod";

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(200),
  company: z.string().trim().min(2, "Enter your company name").max(160),
  position: z.string().trim().min(2, "Enter your position").max(120),
  useCase: z
    .string()
    .trim()
    .min(10, "Share a brief use case (at least 10 characters)")
    .max(4000),
  /** Honeypot — bots fill this; humans leave it empty */
  website: z.string().optional().default(""),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
