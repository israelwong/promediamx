'use server';
import { createClient } from '@supabase/supabase-js';
import probe from 'probe-image-size';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY');
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function getImageDimensions(url: string): Promise<{ width: number, height: number } | null> {
    try {
        const result = await probe(url);
        if (result) {
            return { width: result.width, height: result.height };
        }
        return null;
    } catch (error) {
        console.error('Error fetching image dimensions:', error);
        return null;
    }
}

async function getImages(folder: string): Promise<string[]> {
    const { data, error } = await supabase
        .storage
        .from('ProMedia')
        .list(`galeria/${folder}`, {
            limit: 100,
            offset: 0,
        });

    if (error) {
        console.error('Error fetching images:', error);
        return [];
    }

    if (!data) {
        console.error('No se encontraron imágenes en la carpeta.');
        return [];
    }

    return data.map(file => file.name);
}

export async function getImagesUrls(folder: string): Promise<{ success: boolean, message: string, galeria: { url: string, width: number, height: number }[] }> {
    const imageNames = await getImages(folder);

    if (!imageNames || imageNames.length === 0) {
        return {
            success: false,
            message: 'No se encontraron imágenes en la carpeta.',
            galeria: []
        };
    }

    const urls = await Promise.all(imageNames.map(async (imageName) => {
        const { data } = await supabase
            .storage
            .from('ProMedia')
            .getPublicUrl(`galeria/${folder}/${imageName}`);

        if (!data) {
            console.error('Error fetching image URL', imageName);
            return null;
        }

        return data.publicUrl;
    }));

    const filteredUrls = urls.filter(url => url !== null);

    const imagesWithDimensions = await Promise.all(
        filteredUrls.map(async (url) => {
            const dimensions = await getImageDimensions(url);
            if (dimensions) {
                return { url, width: dimensions.width, height: dimensions.height };
            }
            return null;
        })
    );

    const filteredImages = imagesWithDimensions.filter(image => image !== null) as { url: string, width: number, height: number }[];

    return {
        success: true,
        message: 'Imágenes obtenidas exitosamente.',
        galeria: filteredImages
    };
}