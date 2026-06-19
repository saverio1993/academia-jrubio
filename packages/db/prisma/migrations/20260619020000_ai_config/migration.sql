-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" TEXT NOT NULL DEFAULT 'minimax',
    "apiKey" TEXT NOT NULL DEFAULT '',
    "endpoint" TEXT NOT NULL DEFAULT 'https://api.minimax.io/v1',
    "model" TEXT NOT NULL DEFAULT 'MiniMax-M2.7-highspeed',
    "systemPrompt" TEXT NOT NULL DEFAULT 'Eres el asistente de búsqueda de la Academia J Rubio. SOLO puedes ayudar a buscar archivos en la biblioteca. NO tienes acceso a admin ni a funciones de modificación. Responde en español, breve y amigable.',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "rateLimit" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- Insert default config
INSERT INTO "AIConfig" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
