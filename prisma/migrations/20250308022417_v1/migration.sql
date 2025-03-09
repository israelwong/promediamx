/*
  Warnings:

  - You are about to drop the column `direccion` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `usuarioId` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `fechaFin` on the `Contrato` table. All the data in the column will be lost.
  - You are about to drop the column `fechaInicio` on the `Contrato` table. All the data in the column will be lost.
  - You are about to drop the column `negocioId` on the `Contrato` table. All the data in the column will be lost.
  - The primary key for the `Lead` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `leadType` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `negocioId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaId` on the `Servicio` table. All the data in the column will be lost.
  - You are about to drop the column `cuota_anual` on the `Servicio` table. All the data in the column will be lost.
  - You are about to drop the column `cuota_mensual` on the `Servicio` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Servicio` table. All the data in the column will be lost.
  - You are about to drop the column `clabe` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the `Actividad` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Analitica` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Component` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComponentConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Landing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeadEtapa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Negocio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NegocioItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Seccion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServicioCategoria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServicioPaquete` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServicioPaqueteServicio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaccion` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `clienteId` to the `Contrato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `demo` to the `Contrato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precio` to the `Contrato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servicioId` to the `Contrato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vigencia` to the `Contrato` table without a default value. This is not possible if the table is not empty.
  - Added the required column `LeadformId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pilelineId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Made the column `telefono` on table `Lead` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tipo` to the `Servicio` table without a default value. This is not possible if the table is not empty.
  - Made the column `descripcion` on table `Servicio` required. This step will fail if there are existing NULL values in that column.
  - Made the column `precio` on table `Servicio` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Actividad" DROP CONSTRAINT "Actividad_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "Analitica" DROP CONSTRAINT "Analitica_landingId_fkey";

-- DropForeignKey
ALTER TABLE "Cliente" DROP CONSTRAINT "Cliente_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Component" DROP CONSTRAINT "Component_seccionId_fkey";

-- DropForeignKey
ALTER TABLE "ComponentConfig" DROP CONSTRAINT "ComponentConfig_componentId_fkey";

-- DropForeignKey
ALTER TABLE "Contrato" DROP CONSTRAINT "Contrato_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "Landing" DROP CONSTRAINT "Landing_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "Negocio" DROP CONSTRAINT "Negocio_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "NegocioItem" DROP CONSTRAINT "NegocioItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "NegocioItem" DROP CONSTRAINT "NegocioItem_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "Seccion" DROP CONSTRAINT "Seccion_landingId_fkey";

-- DropForeignKey
ALTER TABLE "Servicio" DROP CONSTRAINT "Servicio_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "ServicioPaqueteServicio" DROP CONSTRAINT "ServicioPaqueteServicio_servicioId_fkey";

-- DropForeignKey
ALTER TABLE "ServicioPaqueteServicio" DROP CONSTRAINT "ServicioPaqueteServicio_servicioPaqueteId_fkey";

-- DropForeignKey
ALTER TABLE "Transaccion" DROP CONSTRAINT "Transaccion_negocioId_fkey";

-- DropIndex
DROP INDEX "Cliente_email_key";

-- DropIndex
DROP INDEX "Cliente_nombre_key";

-- DropIndex
DROP INDEX "Cliente_telefono_key";

-- DropIndex
DROP INDEX "Lead_email_key";

-- DropIndex
DROP INDEX "Servicio_order_key";

-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "direccion",
DROP COLUMN "usuarioId",
ALTER COLUMN "nombre" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'activo';

-- AlterTable
ALTER TABLE "Contrato" DROP COLUMN "fechaFin",
DROP COLUMN "fechaInicio",
DROP COLUMN "negocioId",
ADD COLUMN     "clienteId" TEXT NOT NULL,
ADD COLUMN     "demo" BOOLEAN NOT NULL,
ADD COLUMN     "precio" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "servicioId" TEXT NOT NULL,
ADD COLUMN     "suscripcion" BOOLEAN,
ADD COLUMN     "vigencia" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'activo';

-- AlterTable
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_pkey",
DROP COLUMN "leadType",
DROP COLUMN "negocioId",
ADD COLUMN     "LeadformId" TEXT NOT NULL,
ADD COLUMN     "agenteId" TEXT,
ADD COLUMN     "canalId" TEXT,
ADD COLUMN     "crmId" TEXT,
ADD COLUMN     "jsonParams" JSONB,
ADD COLUMN     "pilelineId" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'activo',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "telefono" SET NOT NULL,
ADD CONSTRAINT "Lead_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Lead_id_seq";

-- AlterTable
ALTER TABLE "Servicio" DROP COLUMN "categoriaId",
DROP COLUMN "cuota_anual",
DROP COLUMN "cuota_mensual",
DROP COLUMN "order",
ADD COLUMN     "tipo" TEXT NOT NULL,
ALTER COLUMN "descripcion" SET NOT NULL,
ALTER COLUMN "precio" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'activo';

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "clabe",
DROP COLUMN "direccion",
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "rol" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'activo';

-- DropTable
DROP TABLE "Actividad";

-- DropTable
DROP TABLE "Analitica";

-- DropTable
DROP TABLE "Component";

-- DropTable
DROP TABLE "ComponentConfig";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "Landing";

-- DropTable
DROP TABLE "LeadEtapa";

-- DropTable
DROP TABLE "Negocio";

-- DropTable
DROP TABLE "NegocioItem";

-- DropTable
DROP TABLE "Seccion";

-- DropTable
DROP TABLE "ServicioCategoria";

-- DropTable
DROP TABLE "ServicioPaquete";

-- DropTable
DROP TABLE "ServicioPaqueteServicio";

-- DropTable
DROP TABLE "Transaccion";

-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfil" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slogan" TEXT,
    "descripcion" TEXT,
    "direccion" TEXT,
    "horarios" JSONB,
    "email" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "google_maps_iframe" TEXT,
    "google_maps" TEXT,
    "web" TEXT,
    "faq" JSONB,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RRSS" (
    "id" TEXT NOT NULL,
    "orden" INTEGER,
    "perfilId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RRSS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptosServicio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "costo" DOUBLE PRECISION NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptosServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "linkPagoId" TEXT,
    "stripe_session_id" TEXT,
    "stripe_payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landingpage" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landingpage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" TEXT NOT NULL,
    "landingpageId" TEXT NOT NULL,
    "orden" INTEGER,
    "nombre" TEXT NOT NULL,
    "jsonStyle" JSONB,
    "jsonParams" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "componenteId" TEXT NOT NULL,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Componente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "jsonStyle" JSONB,
    "jsonParams" JSONB,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estadistica" (
    "id" TEXT NOT NULL,
    "landingpageId" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "tipoEvento" TEXT,
    "origen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estadistica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leadform" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landingpageId" TEXT NOT NULL,

    CONSTRAINT "Leadform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canal" (
    "id" TEXT NOT NULL,
    "orden" INTEGER,
    "nombre" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Canal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRM" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "orden" INTEGER,
    "nombre" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agente" (
    "id" TEXT NOT NULL,
    "crmId" TEXT NOT NULL,
    "landingpageId" TEXT,
    "canalId" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bitacora" (
    "id" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "agenteId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "asunto" TEXT NOT NULL,
    "descripcion" TEXT,
    "objetivo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasarela" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pasarela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodoPago" (
    "id" TEXT NOT NULL,
    "orden" INTEGER,
    "nombre" TEXT NOT NULL,
    "comisionPorcentajeFintech" DOUBLE PRECISION,
    "comisionFijaFintech" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metodoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasarelaMetodoPago" (
    "id" TEXT NOT NULL,
    "orden" INTEGER,
    "pasarelaId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasarelaMetodoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkPago" (
    "id" TEXT NOT NULL,
    "pasarelaPagoId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "suscripcion" BOOLEAN NOT NULL,
    "vigencia" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PagoToPasarela" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PagoToPasarela_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_stripe_session_id_key" ON "Pago"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_stripe_payment_id_key" ON "Pago"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "_PagoToPasarela_B_index" ON "_PagoToPasarela"("B");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rol_fkey" FOREIGN KEY ("rol") REFERENCES "Rol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RRSS" ADD CONSTRAINT "RRSS_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_tipo_fkey" FOREIGN KEY ("tipo") REFERENCES "TipoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptosServicio" ADD CONSTRAINT "ConceptosServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_linkPagoId_fkey" FOREIGN KEY ("linkPagoId") REFERENCES "LinkPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landingpage" ADD CONSTRAINT "Landingpage_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modulo" ADD CONSTRAINT "Modulo_landingpageId_fkey" FOREIGN KEY ("landingpageId") REFERENCES "Landingpage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modulo" ADD CONSTRAINT "Modulo_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "Componente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estadistica" ADD CONSTRAINT "Estadistica_landingpageId_fkey" FOREIGN KEY ("landingpageId") REFERENCES "Landingpage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estadistica" ADD CONSTRAINT "Estadistica_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leadform" ADD CONSTRAINT "Leadform_landingpageId_fkey" FOREIGN KEY ("landingpageId") REFERENCES "Landingpage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRM" ADD CONSTRAINT "CRM_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_crmId_fkey" FOREIGN KEY ("crmId") REFERENCES "CRM"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "Canal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pilelineId_fkey" FOREIGN KEY ("pilelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_LeadformId_fkey" FOREIGN KEY ("LeadformId") REFERENCES "Leadform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agente" ADD CONSTRAINT "Agente_crmId_fkey" FOREIGN KEY ("crmId") REFERENCES "CRM"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agente" ADD CONSTRAINT "Agente_landingpageId_fkey" FOREIGN KEY ("landingpageId") REFERENCES "Landingpage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agente" ADD CONSTRAINT "Agente_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "Canal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bitacora" ADD CONSTRAINT "Bitacora_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bitacora" ADD CONSTRAINT "Bitacora_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasarela" ADD CONSTRAINT "Pasarela_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasarelaMetodoPago" ADD CONSTRAINT "PasarelaMetodoPago_pasarelaId_fkey" FOREIGN KEY ("pasarelaId") REFERENCES "Pasarela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasarelaMetodoPago" ADD CONSTRAINT "PasarelaMetodoPago_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodoPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkPago" ADD CONSTRAINT "LinkPago_pasarelaPagoId_fkey" FOREIGN KEY ("pasarelaPagoId") REFERENCES "Pasarela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PagoToPasarela" ADD CONSTRAINT "_PagoToPasarela_A_fkey" FOREIGN KEY ("A") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PagoToPasarela" ADD CONSTRAINT "_PagoToPasarela_B_fkey" FOREIGN KEY ("B") REFERENCES "Pasarela"("id") ON DELETE CASCADE ON UPDATE CASCADE;
