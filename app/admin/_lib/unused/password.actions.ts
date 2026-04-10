import bcrypt from 'bcrypt';

const saltRounds = 10;

export async function hashPassword(password: string): Promise<string> {
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        return hash;
    } catch (err) {
        console.error('Error hashing password:', err);
        throw err; // Re-lanza el error para que quien llame a la función pueda manejarlo
    }
}

// Ejemplo de uso:
async function testPasswordHashing() {
    const plainPassword = 'W@ng0Admin'; // Reemplaza con la contraseña que quieres hashear
    try {
        const hashedPassword = await hashPassword(plainPassword);
        console.log('Hashed password:', hashedPassword);
    } catch (error) {
        console.error('Failed to hash password:', error);
    }
}

testPasswordHashing();