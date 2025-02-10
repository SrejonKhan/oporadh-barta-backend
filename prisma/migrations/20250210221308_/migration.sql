-- CreateTable
CREATE TABLE "OtpSecret" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OtpSecret_secret_key" ON "OtpSecret"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "OtpSecret_userId_key" ON "OtpSecret"("userId");

-- AddForeignKey
ALTER TABLE "OtpSecret" ADD CONSTRAINT "OtpSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
