/*
  Warnings:

  - Made the column `rol` on table `Usuario` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_rol_fkey";

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET NOT NULL;
