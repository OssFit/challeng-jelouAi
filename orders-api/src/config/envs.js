require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
    PORT: z.string().default('3002').transform(Number),
    
    DB_HOST: z.string({ required_error: "DB_HOST required" }),
    DB_USER: z.string({ required_error: "DB_USER required" }),
    DB_PASSWORD: z.string({ required_error: "DB_PASSWORD required" }),
    DB_NAME: z.string({ required_error: "DB_NAME required" }),
    DB_PORT: z.string().default('3306').transform(Number),
    
    CUSTOMERS_API_URL: z.string().url({ message: "Invalid Customers API URL" }),
    SERVICE_TOKEN: z.string().min(1)
});

const envServer = envSchema.safeParse(process.env);

if (!envServer.success) {
    console.error('❌ Invalid env vars:', envServer.error.format());
    process.exit(1);
}

module.exports = envServer.data;