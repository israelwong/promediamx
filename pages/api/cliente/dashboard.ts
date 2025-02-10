import { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token || !verifyToken(token)) {
        return res.status(401).json({ error: "No autorizado" });
    }

    res.status(200).json({ message: "Bienvenido al dashboard de cliente" });
}
