import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const users = await prisma.Usuario.findMany(); // Ajusta según tu modelo
    res.status(200).json(users);
  } catch (error) {
    console.error("Error conectando a la base de datos:", error);
    res.status(500).json({ error: "Error conectando a la base de datos" });
  } finally {
    await prisma.$disconnect();
  }
}
