/*
  Warnings:

  - You are about to drop the `ConceptosServicio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConceptosServicio" DROP CONSTRAINT "ConceptosServicio_servicioId_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_contratoId_fkey";

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "cotizacionId" TEXT,
ALTER COLUMN "contratoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Servicio" ADD COLUMN     "costo" DOUBLE PRECISION;

-- DropTable
DROP TABLE "ConceptosServicio";

-- CreateTable
CREATE TABLE "Costo" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "costo" DOUBLE PRECISION NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Costo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "vigencia" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContratoToPago" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContratoToPago_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CotizacionToPago" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CotizacionToPago_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ContratoToPago_B_index" ON "_ContratoToPago"("B");

-- CreateIndex
CREATE INDEX "_CotizacionToPago_B_index" ON "_CotizacionToPago"("B");

-- AddForeignKey
ALTER TABLE "Costo" ADD CONSTRAINT "Costo_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContratoToPago" ADD CONSTRAINT "_ContratoToPago_A_fkey" FOREIGN KEY ("A") REFERENCES "Contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContratoToPago" ADD CONSTRAINT "_ContratoToPago_B_fkey" FOREIGN KEY ("B") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CotizacionToPago" ADD CONSTRAINT "_CotizacionToPago_A_fkey" FOREIGN KEY ("A") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CotizacionToPago" ADD CONSTRAINT "_CotizacionToPago_B_fkey" FOREIGN KEY ("B") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;
