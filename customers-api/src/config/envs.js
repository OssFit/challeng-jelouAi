require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
    PORT: z.string().default('3001').transform(Number),     
    DB_HOST: z.string({ required_error: "DB_HOST is required" }),
    DB_USER: z.string({ required_error: "DB_USER is required" }),
    DB_PASSWORD: z.string({ required_error: "DB_PASSWORD is required" }),
    DB_NAME: z.string({ required_error: "DB_NAME is required" }),
    DB_PORT: z.string().default('3306').transform(Number),
    JWT_SECRET: z.string({ required_error: "JWT_SECRET is required" }),
    SERVICE_TOKEN: z.string({ required_error: "SERVICE_TOKEN is required" })
});

const envServer = envSchema.safeParse(process.env);

if (!envServer.success) {
    console.error('❌ Invalid environment variables:', envServer.error.format());
    process.exit(1); 
}

module.exports = envServer.data;