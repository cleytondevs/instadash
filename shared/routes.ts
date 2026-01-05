import { z } from "zod";
import { insertSaleSchema, insertExpenseSchema } from "./schema";

export const api = {
  stats: {
    get: {
      path: "/api/stats",
      method: "GET",
    }
  },
  sales: {
    bulk: {
      path: "/api/sales/bulk",
      method: "POST",
      input: z.array(insertSaleSchema),
    }
  },
  expenses: {
    create: {
      path: "/api/expenses",
      method: "POST",
      input: insertExpenseSchema,
    }
  }
};
